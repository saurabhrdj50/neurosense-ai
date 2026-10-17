import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import apiClient from '../../services/apiClient'

/** Window event fired whenever clinical data changed in ANY session. Manual
 *  (non-react-query) screens like AdminPanel listen for this to refetch. */
export const DATA_CHANGED_EVENT = 'neurosense:data-changed'

/**
 * Cross-session data integrity: polls the backend's clinical data version
 * and, when it moves (a delete/update/new analysis made by this or another
 * session — another tab, the admin panel, another clinician), invalidates
 * every react-query cache so every mounted screen refetches immediately.
 *
 * Mounted once in AppLayout, which wraps all doctor and admin pages.
 */
export function useDataSync(pollMs = 15000) {
  const queryClient = useQueryClient()

  useEffect(() => {
    let last = null
    let cancelled = false

    const poll = async () => {
      try {
        const data = await apiClient.get('/api/meta/data-version')
        if (cancelled) return
        const version = data?.version
        if (typeof version !== 'number') return
        if (last !== null && version !== last) {
          // Someone mutated clinical data — drop every cached dataset.
          queryClient.invalidateQueries()
          window.dispatchEvent(new CustomEvent(DATA_CHANGED_EVENT, { detail: { version } }))
        }
        last = version
      } catch {
        // Offline or session expired — AuthProvider owns the 401 flow; the
        // next tick retries.
      }
    }

    poll()
    const id = setInterval(poll, pollMs)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [queryClient, pollMs])
}
