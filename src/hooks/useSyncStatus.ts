import { useState, useEffect } from 'react';
import { db } from '../db/schema';
import { SyncService } from '../services/SyncService';

export function useSyncStatus() {
  const [pendingCount, setPendingCount] = useState(0);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const [isSyncing, setIsSyncing] = useState(SyncService.isSyncing);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    let mounted = true;

    const updateStatus = async () => {
      if (!mounted) return;
      
      setIsOnline(navigator.onLine);
      setIsSyncing(SyncService.isSyncing);

      // Calculate pending count
      let count = 0;
      const tables = [
        'houses', 'hostels', 'staff', 'students', 
        'attendance_records', 'leave_requests'
      ];
      
      for (const table of tables) {
        // @ts-ignore
        count += await db.table(table).filter(r => r.dirty === true).count();
      }
      
      if (mounted) {
        setPendingCount(count);
      }

      // Get last synced at from sync_log
      const logs = await db.sync_log.toArray();
      if (logs.length > 0 && mounted) {
        const latest = logs.reduce((prev, current) => {
          return new Date(current.last_sync_at).getTime() > new Date(prev.last_sync_at).getTime() ? current : prev;
        });
        setLastSyncedAt(new Date(latest.last_sync_at));
      }
    };

    updateStatus();

    const unsubscribe = SyncService.subscribe(updateStatus);
    window.addEventListener('online', updateStatus);
    window.addEventListener('offline', updateStatus);

    // Also poll every 10 seconds just to keep count updated if edits happen without sync events firing yet
    const interval = setInterval(updateStatus, 10000);

    return () => {
      mounted = false;
      unsubscribe();
      window.removeEventListener('online', updateStatus);
      window.removeEventListener('offline', updateStatus);
      clearInterval(interval);
    };
  }, []);

  return { pendingCount, lastSyncedAt, isSyncing, isOnline };
}
