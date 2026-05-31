import { useEffect, useRef, useState } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

interface UsePWAInstall {
  canInstall: boolean
  install:    () => void
  dismiss:    () => void
}

const DISMISSED_KEY = 'jnv-pwa-install-dismissed'

export function usePWAInstall(): UsePWAInstall {
  const promptRef = useRef<BeforeInstallPromptEvent | null>(null)
  const [canInstall, setCanInstall] = useState(false)

  useEffect(() => {
    // Don't show if already dismissed
    if (sessionStorage.getItem(DISMISSED_KEY)) return

    const handler = (e: Event) => {
      e.preventDefault()
      promptRef.current = e as BeforeInstallPromptEvent
      setCanInstall(true)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const install = async () => {
    if (!promptRef.current) return
    await promptRef.current.prompt()
    const { outcome } = await promptRef.current.userChoice
    if (outcome === 'accepted') setCanInstall(false)
    promptRef.current = null
  }

  const dismiss = () => {
    sessionStorage.setItem(DISMISSED_KEY, '1')
    setCanInstall(false)
  }

  return { canInstall, install, dismiss }
}
