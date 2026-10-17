import toast from 'react-hot-toast'

/**
 * System-level "analysis finished" notifications.
 *
 * The analysis runs as a background job; the clinician may switch tabs while
 * it runs. A browser Notification (with app focus on click) plus a toast
 * makes completion/failure impossible to miss without babysitting the loader.
 */

export function requestAnalysisNotifyPermission() {
  // Must be called from a user gesture (the submit click).
  try {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
  } catch {
    /* Notifications unsupported — toasts still work. */
  }
}

function showSystemNotification(title, body) {
  try {
    if (!('Notification' in window) || Notification.permission !== 'granted') return
    if (!document.hidden) return // visible tab: the toast is enough
    const n = new Notification(title, { body, tag: 'neurosense-analysis' })
    n.onclick = () => {
      window.focus()
      n.close()
    }
  } catch {
    /* Non-fatal by design. */
  }
}

export function notifyAnalysisSuccess(patientName) {
  const name = patientName || 'the patient'
  toast.success('Diagnostic evaluation complete!', {
    id: 'analysis-done',
  })
  showSystemNotification('NeuroSense AI — analysis complete', `The assessment for ${name} is ready to review.`)
}

export function notifyAnalysisFailure(patientName, message) {
  const name = patientName || 'the patient'
  toast.error(`Analysis failed: ${message}`, { id: 'analysis-failed' })
  showSystemNotification('NeuroSense AI — analysis failed', `The assessment for ${name} did not complete: ${message}`)
}
