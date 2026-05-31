import { supabase, SCHOOL_ID } from '../lib/supabase'
import { db, getPendingSyncItems } from '../lib/dexie'
import { useSyncStore } from '../store/syncStore'

async function processSyncOperation(item) {
  const { operation, payload } = item

  switch (operation) {
    case 'save_attendance': {
      const { data, error } = await supabase
        .from('attendance_records')
        .upsert(payload.records, { onConflict: 'session_id,student_id' })
        .select()
      if (error) throw error
      // Mark local records as synced
      await db.attendance_records
        .where('session_id').equals(payload.sessionId)
        .modify({ synced: true })
      return data
    }

    case 'record_leave': {
      const { data, error } = await supabase
        .from('leaves')
        .insert(payload)
        .select()
        .single()
      if (error) throw error
      await db.leaves
        .where('[student_id+from_date]')
        .equals([payload.student_id, payload.from_date])
        .modify({ id: data.id, synced: true })
      return data
    }

    default:
      throw new Error(`Unknown sync operation: ${operation}`)
  }
}

export async function flushSyncQueue() {
  const store = useSyncStore.getState()
  if (!navigator.onLine || store.isSyncing) return

  const pending = await getPendingSyncItems()
  if (pending.length === 0) return

  store.setIsSyncing(true)
  store.setSyncError(null)

  let successCount = 0
  for (const item of pending) {
    try {
      await processSyncOperation(item)
      await db.sync_queue.update(item.id, { synced: true })
      store.decrementPending()
      successCount++
    } catch (err) {
      console.error(`Sync failed for item ${item.id}:`, err)
      await db.sync_queue.update(item.id, { retries: (item.retries || 0) + 1 })
      // Stop on first failure to preserve order
      if (item.retries >= 3) {
        await db.sync_queue.update(item.id, { synced: true, failed: true })
      }
      break
    }
  }

  store.setIsSyncing(false)
  store.setLastSyncedAt(new Date().toISOString())

  // Log sync to server
  if (successCount > 0) {
    await supabase.from('sync_log').insert({
      school_id: SCHOOL_ID,
      user_id: (await supabase.auth.getUser()).data.user?.id,
      operation: 'bulk_sync',
      payload: { count: successCount },
    }).select()
  }
}

export function initSyncListeners() {
  const store = useSyncStore.getState()

  window.addEventListener('online', () => {
    store.setOnline(true)
    flushSyncQueue()
  })

  window.addEventListener('offline', () => {
    store.setOnline(false)
  })

  // Initial pending count
  getPendingSyncItems().then(items => store.setPendingCount(items.length))

  // Periodic sync attempt (every 30s when online)
  setInterval(() => {
    if (navigator.onLine) flushSyncQueue()
  }, 30000)
}
