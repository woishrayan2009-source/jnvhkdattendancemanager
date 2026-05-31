import { Download, X } from 'lucide-react'
import { Button } from './Button'

interface PWAInstallBannerProps {
  onInstall: () => void
  onDismiss: () => void
}

export function PWAInstallBanner({ onInstall, onDismiss }: PWAInstallBannerProps) {
  return (
    <div className="pwa-install-banner fixed bottom-16 md:bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-80 z-50">
      <div className="bg-navy-800 text-white rounded-xl shadow-xl p-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-gold-500 flex items-center justify-center shrink-0">
          <Download size={18} className="text-navy-900" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm">Install App</p>
          <p className="text-navy-300 text-xs mt-0.5">Works offline — install to your home screen</p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button
            variant="warning"
            size="sm"
            onClick={onInstall}
            id="pwa-install-btn"
          >
            Install
          </Button>
          <button
            onClick={onDismiss}
            className="p-1.5 text-navy-300 hover:text-white transition-colors"
            aria-label="Dismiss"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}
