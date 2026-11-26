import React, { useEffect, useRef } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { X, RefreshCw } from 'lucide-react'

/**
 * Registers the service worker and offers a non-blocking, dismissible
 * "Update available" toast when a new build is deployed.
 */
export default function PwaUpdater() {
  const dismissedRef = useRef(false)
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
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

  useEffect(() => {
    if (!needRefresh || dismissedRef.current) return
    import('react-hot-toast').then(({ default: toast }) => {
      toast(
        (t) => (
          <div className="flex items-center gap-3 text-xs">
            <span className="font-medium text-foreground">
              A new version of NeuroSense is available.
            </span>
            <button
              type="button"
              onClick={() => {
                dismissedRef.current = true
                toast.dismiss(t.id)
                updateServiceWorker(true)
              }}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary-hover transition-colors shrink-0 cursor-pointer"
            >
              <RefreshCw size={12} aria-hidden="true" />
              Refresh
            </button>
            <button
              type="button"
              aria-label="Dismiss update notification"
              onClick={() => {
                dismissedRef.current = true
                toast.dismiss(t.id)
              }}
              className="p-1 rounded-md text-foreground-muted hover:text-foreground hover:bg-surface-hover transition-colors shrink-0 cursor-pointer"
            >
              <X size={14} aria-hidden="true" />
            </button>
          </div>
        ),
        {
          id: 'pwa-update',
          duration: 10000,
          position: 'bottom-right',
        },
      )
    })
  }, [needRefresh, updateServiceWorker])

  return null
}
