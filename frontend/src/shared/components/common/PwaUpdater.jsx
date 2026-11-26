import { useEffect } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'

/**
 * Registers the service worker with seamless auto-update (`registerType: 'autoUpdate'`).
 * New deploys activate silently without blocking header controls or requiring a toast prompt.
 */
export default function PwaUpdater() {
  useRegisterSW({
    onRegisteredSW(url) {
      setInterval(async () => {
        try {
          const reg = await navigator.serviceWorker.getRegistration(url)
          reg?.update()
        } catch { /* offline or unsupported — nothing to do */ }
      }, 60 * 60 * 1000)
    },
  })

  useEffect(() => {
    if (import.meta.env.DEV || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then((registrations) => {
          for (const reg of registrations) {
            reg.unregister()
          }
        }).catch(() => {})
      }
    }
  }, [])

  return null
}
