import { Menu, Wifi, WifiOff, RefreshCw } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useSyncStatus } from '@/hooks/useSyncStatus'
import { clsx } from 'clsx'

interface TopbarProps {
  isOnline: boolean
}

export function Topbar({ isOnline }: TopbarProps) {
  const { user } = useAuth()
  const { pendingCount, status } = useSyncStatus()

  return (
    <header className="shrink-0 h-14 bg-white border-b border-slate-100 flex items-center gap-3 px-4 sm:px-6">
      {/* Mobile menu button (sidebar handled via bottom nav) */}
      <button
        className="md:hidden p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors"
        aria-label="Menu"
      >
        <Menu size={20} />
      </button>

      {/* Page title slot (empty — each page sets its own h1) */}
      <div className="flex-1 min-w-0" />

      {/* Sync status badge */}
      {pendingCount > 0 && (
        <button
          className={clsx(
            'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold',
            status === 'syncing'
              ? 'bg-blue-50 text-blue-700'
              : 'bg-amber-50 text-amber-700 sync-pulse',
          )}
          title={`${pendingCount} records pending sync`}
        >
          <RefreshCw
            size={12}
            className={status === 'syncing' ? 'animate-spin' : ''}
          />
          {pendingCount} pending
        </button>
      )}

      {/* Online / offline indicator */}
      <div
        className={clsx(
          'flex items-center gap-1.5 text-xs font-medium',
          isOnline ? 'text-green-600' : 'text-amber-600',
        )}
        title={isOnline ? 'Online' : 'Offline'}
      >
        {isOnline ? <Wifi size={15} /> : <WifiOff size={15} />}
        <span className="hidden sm:inline">{isOnline ? 'Online' : 'Offline'}</span>
      </div>

      {/* Avatar */}
      <div
        className="w-8 h-8 rounded-full bg-navy-800 flex items-center justify-center text-white text-sm font-bold shrink-0"
        title={user?.full_name}
      >
        {user?.full_name?.[0]?.toUpperCase() ?? '?'}
      </div>
    </header>
  )
}
