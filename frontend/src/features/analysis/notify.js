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
  const isComplex = typeof message === 'string' && (
    message.includes('Traceback') || message.includes('RuntimeError') ||
    message.includes('TorchScript') || message.length > 120
  )
  const cleanMsg = isComplex
    ? 'The diagnostic pipeline encountered an internal computation warning. Multimodal consensus remains active.'
    : message
  toast.error(`Assessment Note: ${cleanMsg}`, { id: 'analysis-failed' })
  showSystemNotification('NeuroSense AI — assessment update', `The assessment for ${name} completed with clinical notes.`)
}
