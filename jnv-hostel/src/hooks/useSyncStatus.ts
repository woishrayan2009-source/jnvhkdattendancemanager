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
    // Live query — updates whenever sync_queue changes
    const subscription = db.sync_queue
      .hook('creating', () => refresh())
    
    refresh()

    async function refresh() {
      try {
        const count = await db.sync_queue.count()
        setPendingCount(count)
        setStatus(count > 0 ? 'idle' : 'idle')
      } catch {
        setStatus('error')
      }
    }

    // Poll every 5 seconds as a simple approach (Phase 3 will use Dexie live queries)
    const interval = setInterval(refresh, 5000)

    return () => {
      clearInterval(interval)
      db.sync_queue.hook('creating').unsubscribe(subscription as never)
    }
  }, [])

  return { pendingCount, status }
}
