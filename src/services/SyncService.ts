import { db } from '../db/schema';
import { supabase } from '../lib/supabase';

export class SyncService {
  static isSyncing = false;
  static initialized = false;
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

  /** Call once on app boot — sets up online/offline listeners only.
   *  Does NOT trigger an immediate sync; that happens when the user logs in
   *  or when the browser comes back online (after being offline). */
  static init() {
    if (this.initialized) return;   // prevent duplicate listeners on re-mount
    this.initialized = true;
    window.addEventListener('online', () => {
      this.notify();
      this.sync();
    });
    window.addEventListener('offline', () => {
      this.notify();
    });
    // Intentionally no auto-sync on init — avoids race with auth loading
  }

  /** Call this after login is confirmed (from AuthContext or a button). */
  static async syncAfterLogin() {
    if (navigator.onLine) {
      await this.sync();
    }
  }

  static async getCurrentUserId(): Promise<string | null> {
    const { data: { user } } = await supabase.auth.getUser();
    return user?.id ?? null;
  }

  static async getCurrentUserRole(): Promise<string | null> {
    const userId = await this.getCurrentUserId();
    if (!userId) return null;
    // Try local cache first
    const local = await db.staff.get(userId);
    if (local) return local.role;
    const { data } = await supabase.from('staff').select('role').eq('id', userId).single();
    return data?.role ?? null;
  }

  static async sync() {
    if (this.isSyncing || !navigator.onLine) return;

    // Don't sync if not logged in
    const userId = await this.getCurrentUserId();
    if (!userId) return;

    this.isSyncing = true;
    this.notify();

    try {
      const role = await this.getCurrentUserRole();
      const tables = [
        'houses', 'hostels', 'staff', 'students',
        'attendance_records', 'leave_requests'
      ];

      for (const table of tables) {
        try {
          await this.syncTable(table, role);
        } catch (tableError) {
          console.error(`Sync failed for table ${table}:`, tableError);
          // Continue syncing other tables even if one fails
        }
      }
    } catch (error) {
      console.error('Sync failed:', error);
    } finally {
      this.isSyncing = false;
      this.notify();
    }
  }

  static async syncTable(tableName: string, currentUserRole: string | null | undefined) {
    // 1. Push dirty local records to Supabase
    // @ts-ignore
    const dirtyRecords = await db.table(tableName).filter((r: any) => r.dirty === true).toArray();

    if (dirtyRecords.length > 0) {
      const toSync = dirtyRecords.map((r: any) => {
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

    // 2. Pull remote changes since last sync
    const syncLog = await db.sync_log.where('table_name').equals(tableName).first();
    const lastSyncAt = syncLog?.last_sync_at ?? '1970-01-01T00:00:00Z';

    const { data: remoteRecords, error: pullError } = await supabase
      .from(tableName)
      .select('*')
      .gt('updated_at', lastSyncAt);

    if (pullError || !remoteRecords) return;

    for (const remote of remoteRecords) {
      // @ts-ignore
      const local = await db.table(tableName).get(remote.id);

      if (local && local.dirty === true) {
        // Conflict resolution: latest updated_at timestamp always wins.
        // Previously PRINCIPAL's local data won unconditionally — that caused
        // stale offline edits to overwrite newer remote corrections.
        const localWins =
          new Date(local.updated_at ?? 0) >= new Date(remote.updated_at ?? 0);

        if (!localWins) {
          // @ts-ignore
          await db.table(tableName).put({ ...remote, dirty: false, synced_at: new Date().toISOString() });
        }
      } else {
        // No conflict — take remote
        // @ts-ignore
        await db.table(tableName).put({ ...remote, dirty: false, synced_at: new Date().toISOString() });
      }
    }

    // 3. Update local sync_log
    const nowStr = new Date().toISOString();
    if (syncLog) {
      await db.sync_log.update(syncLog.id, {
        last_sync_at: nowStr,
        status: 'SUCCESS',
        updated_at: nowStr,
        dirty: false,
      });
    } else {
      await db.sync_log.add({
        id: crypto.randomUUID(),
        table_name: tableName,
        last_sync_at: nowStr,
        status: 'SUCCESS',
        created_at: nowStr,
        updated_at: nowStr,
        dirty: false,
        synced_at: nowStr,
      });
    }
  }
}
