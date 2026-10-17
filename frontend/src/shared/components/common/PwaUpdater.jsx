import { useEffect } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'

/**
 * Registers the service worker and offers a non-blocking "Update available"
 * toast when a new build is deployed. The refresh is user-initiated: clinic
 * tablets must never hard-reload mid-assessment on their own.
 */
export default function PwaUpdater() {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(url) {
      // Re-check for a deployed update every hour in long-lived sessions.
      setInterval(async () => {
        try {
          const reg = await navigator.serviceWorker.getRegistration(url)
          reg?.update()
        } catch { /* offline or unsupported — nothing to do */ }
      }, 60 * 60 * 1000)
    },
  })

  useEffect(() => {
    if (!needRefresh) return
    import('react-hot-toast').then(({ default: toast }) => {
      toast(
        'A new version of NeuroSense is available.',
        {
          duration: Infinity,
          id: 'pwa-update',
          icon: '⬆️',
          actions: [
            {
              label: 'Refresh',
              onClick: () => updateServiceWorker(true),
            },
            {
              label: 'Later',
              onClick: () => toast.dismiss('pwa-update'),
            },
          ],
        },
      )
    })
  }, [needRefresh, updateServiceWorker])

  return null
}
