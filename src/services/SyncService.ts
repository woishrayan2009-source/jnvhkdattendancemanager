import { db } from '../db/schema';
import { supabase } from '../lib/supabase';

export class SyncService {
  static isSyncing = false;
  static listeners: Array<() => void> = [];

  static subscribe(listener: () => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  static notify() {
    this.listeners.forEach(l => l());
  }

  static init() {
    window.addEventListener('online', () => {
      this.notify();
      this.sync();
    });
    window.addEventListener('offline', () => {
      this.notify();
    });
    if (navigator.onLine) {
      this.sync();
    }
  }

  static async getCurrentUserRole() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data } = await supabase.from('staff').select('role').eq('id', user.id).single();
    return data?.role;
  }

  static async sync() {
    if (this.isSyncing || !navigator.onLine) return;
    this.isSyncing = true;
    this.notify();

    try {
      const role = await this.getCurrentUserRole();
      const tables = [
        'houses', 'hostels', 'staff', 'students', 
        'attendance_records', 'leave_requests'
      ];

      for (const table of tables) {
        await this.syncTable(table, role);
      }
    } catch (error) {
      console.error('Sync failed', error);
    } finally {
      this.isSyncing = false;
      this.notify();
    }
  }

  static async syncTable(tableName: string, currentUserRole: string | null | undefined) {
    // 1. Push dirty records
    // @ts-ignore
    const dirtyRecords = await db.table(tableName).filter(r => r.dirty === true).toArray();
    
    if (dirtyRecords.length > 0) {
      const toSync = dirtyRecords.map(r => {
        const { dirty, synced_at, ...rest } = r;
        return rest;
      });

      const { error } = await supabase.from(tableName).upsert(toSync);
      
      if (!error) {
        const now = new Date().toISOString();
        for (const record of dirtyRecords) {
          // @ts-ignore
          await db.table(tableName).update(record.id, { dirty: false, synced_at: now });
        }
      }
    }

    // 2. Pull remote changes
    const syncLog = await db.sync_log.where('table_name').equals(tableName).first();
    const lastSyncAt = syncLog?.last_sync_at || '1970-01-01T00:00:00Z';

    const { data: remoteRecords, error: pullError } = await supabase
      .from(tableName)
      .select('*')
      .gt('updated_at', lastSyncAt);

    if (pullError || !remoteRecords) return;

    for (const remote of remoteRecords) {
      // @ts-ignore
      const local = await db.table(tableName).get(remote.id);
      
      if (local && local.dirty === true) {
        // Conflict resolution: Principal role wins, else latest updated_at wins
        let localWins = false;
        
        if (currentUserRole === 'PRINCIPAL') {
          localWins = true;
        } else {
          const localTime = new Date(local.updated_at || 0).getTime();
          const remoteTime = new Date(remote.updated_at || 0).getTime();
          if (localTime > remoteTime) {
            localWins = true;
          }
        }

        if (!localWins) {
          // @ts-ignore
          await db.table(tableName).put({ ...remote, dirty: false, synced_at: new Date().toISOString() });
        }
      } else {
        // @ts-ignore
        await db.table(tableName).put({ ...remote, dirty: false, synced_at: new Date().toISOString() });
      }
    }

    // 3. Update sync_log locally and remote
    const nowStr = new Date().toISOString();
    if (syncLog) {
      await db.sync_log.update(syncLog.id, { last_sync_at: nowStr, status: 'SUCCESS', updated_at: nowStr, dirty: false });
    } else {
      await db.sync_log.add({
        id: crypto.randomUUID(),
        table_name: tableName,
        last_sync_at: nowStr,
        status: 'SUCCESS',
        created_at: nowStr,
        updated_at: nowStr,
        dirty: false,
        synced_at: nowStr
      });
    }

    // Log every sync event to sync_log table in Supabase
    await supabase.from('sync_log').upsert({
      id: syncLog?.id || crypto.randomUUID(),
      table_name: tableName,
      last_sync_at: nowStr,
      status: 'SUCCESS',
      created_at: syncLog?.created_at || nowStr,
      updated_at: nowStr
    });
  }
}
