import { useEffect, useState } from 'react'
import { db } from '@/db/schema'
import type { SyncStatus } from '@/types'

interface SyncStatusResult {
  pendingCount: number
  status:       SyncStatus
}

export function useSyncStatus(): SyncStatusResult {
  const [pendingCount, setPendingCount] = useState(0)
  const [status,       setStatus]       = useState<SyncStatus>('idle')

  useEffect(() => {
    let cancelled = false

    async function refresh() {
      try {
        const count = await db.sync_queue.count()
        if (cancelled) return
        setPendingCount(count)
        // Fix: was setStatus(count > 0 ? 'idle' : 'idle') — never showed 'pending'
        setStatus(count > 0 ? 'syncing' : 'idle')
      } catch {
        if (!cancelled) setStatus('error')
      }
    }

    refresh()

    // Fix: Dexie hook API does not return a subscription with .unsubscribe().
    // Use a polling interval instead (simple, reliable).
    // Phase 3 will replace this with Dexie liveQuery from dexie-react-hooks.
    const interval = setInterval(refresh, 5_000)

    return () => {
      cancelled = true
      clearInterval(interval)
      // Note: no Dexie hook to unsubscribe — removed the broken
      // db.sync_queue.hook('creating').unsubscribe() call that threw at runtime
    }
  }, [])

  return { pendingCount, status }
}
