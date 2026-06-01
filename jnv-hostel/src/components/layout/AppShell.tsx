import { Outlet } from 'react-router-dom'
import { Sidebar }  from './Sidebar'
import { Topbar }   from './Topbar'
import { useOnlineStatus }  from '@/hooks/useOnlineStatus'
import { usePWAInstall }    from '@/hooks/usePWAInstall'
import { PWAInstallBanner } from '@/components/ui/PWAInstallBanner'

export function AppShell() {
  const isOnline       = useOnlineStatus()
  const { canInstall, install, dismiss } = usePWAInstall()

  return (
    <div className="flex h-dvh bg-slate-50 overflow-hidden">
      {/* Sidebar — hidden on mobile, shown on md+ */}
      <Sidebar />

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Topbar isOnline={isOnline} />

        {/* Offline banner */}
        {!isOnline && (
          <div className="bg-amber-500 text-white text-xs text-center py-1.5 font-medium tracking-wide shrink-0">
            ⚡ Offline — changes are saved locally and will sync when reconnected
          </div>
        )}

        {/* Page content — pb-16 prevents content hiding behind fixed mobile nav */}
        <main className="flex-1 overflow-y-auto pb-16 md:pb-0">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
            <Outlet />
          </div>
        </main>
      </div>

      {/* PWA install prompt */}
      {canInstall && (
        <PWAInstallBanner onInstall={install} onDismiss={dismiss} />
      )}
    </div>
  )
}
