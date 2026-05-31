import React from 'react'
import { Wifi, WifiOff, RefreshCw, Menu } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { useSyncStatus } from '../../hooks/useSyncStatus'
import { SyncService } from '../../services/SyncService'
import { Badge } from '../ui/Badge'

export function Topbar({ onMenuClick, title }) {
  const { currentUser, role } = useAuth()
  const { isOnline, pendingCount, isSyncing } = useSyncStatus()

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center px-4 gap-4 sticky top-0 z-30 shadow-sm">
      {/* Mobile menu button */}
      <button
        onClick={onMenuClick}
        className="lg:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100"
      >
        <Menu size={20} />
      </button>

      {/* Page title */}
      <h1 className="text-base font-semibold text-[#1a3a5c] flex-1">{title}</h1>

      {/* Sync status */}
      {pendingCount > 0 && (
        <button
          onClick={() => SyncService.sync()}
          disabled={isSyncing || !isOnline}
          className="flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-full hover:bg-amber-100 transition-colors disabled:opacity-50"
          title={`${pendingCount} record(s) pending sync`}
        >
          <RefreshCw size={12} className={isSyncing ? 'animate-spin' : ''} />
          {pendingCount} pending
        </button>
      )}

      {/* Online indicator */}
      <div className="flex items-center gap-1.5">
        {isOnline
          ? <Badge variant="online"><Wifi size={10} className="mr-0.5" />Online</Badge>
          : <Badge variant="offline"><WifiOff size={10} className="mr-0.5" />Offline</Badge>
        }
      </div>

      {/* User avatar */}
      {currentUser && (
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-[#1a3a5c] flex items-center justify-center text-white text-sm font-semibold">
            {currentUser.name?.charAt(0).toUpperCase() ?? '?'}
          </div>
          <div className="hidden sm:block text-right">
            <p className="text-xs font-semibold text-gray-800 leading-none">{currentUser.name}</p>
            <p className="text-xs text-gray-500 capitalize">{role}</p>
          </div>
        </div>
      )}
    </header>
  )
}
