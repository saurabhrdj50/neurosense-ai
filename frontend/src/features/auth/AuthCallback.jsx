import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { authApi } from './api/authApi'
import PageLoader from '../../shared/components/ui/PageLoader'

/**
 * Landing page for the GitHub OAuth flow. The backend has already set the
 * session cookie by the time GitHub redirects here — this page just asks
 * the backend who is logged in now and sends the user onward.
 */
export default function AuthCallback() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [error, setError] = useState(null)

  useEffect(() => {
    const githubError = searchParams.get('github_error')
    if (githubError) {
      const messages = {
        denied: 'GitHub sign-in was cancelled.',
        no_email: 'GitHub did not share a verified email address. Make an email visible on your GitHub profile and try again.',
        state_mismatch: 'GitHub sign-in could not be verified. Please try again.',
      }
      setError(messages[githubError] || 'GitHub sign-in did not complete. Please try again.')
      return
    }
    let cancelled = false
    authApi.getCurrentUser()
      .then((data) => {
        if (cancelled) return
        if (data.authenticated) {
          navigate(data.role === 'admin' ? '/admin/dashboard' : '/dashboard', { replace: true })
        } else {
          setError('GitHub sign-in did not complete. Please try again.')
        }
      })
      .catch(() => {
        if (!cancelled) setError('Could not reach the backend. Please try again.')
      })
    return () => { cancelled = true }
  }, [navigate, searchParams])

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground p-6">
        <div className="w-full max-w-md rounded-3xl border border-border bg-card p-8 text-center space-y-4">
          <h1 className="text-xl font-bold">GitHub sign-in failed</h1>
          <p className="text-sm text-muted">{error}</p>
          <button
            type="button"
            onClick={() => navigate('/login', { replace: true })}
            className="w-full py-3 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors"
          >
            Back to Sign In
          </button>
        </div>
      </div>
    )
  }

  return <PageLoader />
}
