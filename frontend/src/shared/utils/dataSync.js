import { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import apiClient from '../../services/apiClient'
import API_URL from '../../config/api'

/** Window event fired whenever clinical data changed in ANY session. Manual
 *  (non-react-query) screens like AdminPanel listen for this to refetch. */
export const DATA_CHANGED_EVENT = 'neurosense:data-changed'

/**
 * Cross-session data integrity: listens to Server-Sent Events (SSE) at
 * /api/meta/events (with automatic fallback to polling /api/meta/data-version).
 * When clinical data moves (a delete/update/new analysis made by this or another
 * session — another tab, the admin panel, another clinician), invalidates
 * every react-query cache so every mounted screen refetches immediately.
 *
 * Mounted once in AppLayout, which wraps all doctor and admin pages.
 */
export function useDataSync(pollMs = 15000) {
  const queryClient = useQueryClient()
  const lastRef = useRef(null)

  useEffect(() => {
    let cancelled = false
    let pollInterval = null
    let eventSource = null

    const handleVersionChange = (version) => {
      if (typeof version !== 'number' || isNaN(version)) return
      if (lastRef.current !== null && version !== lastRef.current) {
        queryClient.invalidateQueries()
        window.dispatchEvent(new CustomEvent(DATA_CHANGED_EVENT, { detail: { version } }))
      }
      lastRef.current = version
    }

    const poll = async () => {
      try {
        const data = await apiClient.get('/api/meta/data-version')
        if (cancelled) return
        handleVersionChange(data?.version)
      } catch {
        // Offline or session expired — AuthProvider owns the 401 flow
      }
    }

    // Prefer Server-Sent Events (SSE) to eliminate polling overhead entirely
    if (typeof window !== 'undefined' && typeof window.EventSource !== 'undefined') {
      try {
        const url = `${API_URL}/api/meta/events`
        eventSource = new EventSource(url, { withCredentials: true })

        eventSource.onmessage = (event) => {
          if (cancelled || !event.data) return
          const v = parseInt(event.data, 10)
          if (!isNaN(v)) {
            handleVersionChange(v)
          }
        }

        eventSource.onerror = () => {
          // If SSE encounters an error (proxy buffering / stream closed), start polling fallback
          if (!pollInterval && !cancelled) {
            pollInterval = setInterval(poll, pollMs)
          }
        }
      } catch {
        pollInterval = setInterval(poll, pollMs)
      }
    } else {
      pollInterval = setInterval(poll, pollMs)
    }

    // Initial check to prime version state
    poll()

    return () => {
      cancelled = true
      if (eventSource) {
        eventSource.close()
      }
      if (pollInterval) {
        clearInterval(pollInterval)
      }
    }
  }, [queryClient, pollMs])
}
