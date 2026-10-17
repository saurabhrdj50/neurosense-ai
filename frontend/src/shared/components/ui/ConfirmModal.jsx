/**
 * @fileoverview Tokenized destructive-action confirmation dialog.
 * Replaces ad-hoc window.confirm() and library confirm dialogs with the
 * shared Modal primitive so every delete flow looks and behaves the same.
 */
import React, { useEffect, useState } from 'react'
import { AlertTriangle, Loader2 } from 'lucide-react'
import Modal from './Modal'
import Button from './Button'

/**
 * Confirmation modal for destructive actions.
 *
 * @param {boolean}  props.open          Controls visibility.
 * @param {function} props.onClose       Called when dismissed (cancel/close/Esc).
 * @param {function} props.onConfirm     Async handler; modal closes on resolve, stays open + shows error on reject.
 * @param {string}   [props.title]       Heading text.
 * @param {string}   [props.message]     Body copy.
 * @param {string}   [props.confirmLabel='Delete']
 * @param {string}   [props.confirmVariant='danger']
 */
export default function ConfirmModal({
  open,
  onClose,
  onConfirm,
  title = 'Are you sure?',
  message = 'This action cannot be undone.',
  confirmLabel = 'Delete',
  confirmVariant = 'danger',
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (open) {
      setBusy(false)
      setError(null)
    }
  }, [open])

  const handleConfirm = async () => {
    setBusy(true)
    setError(null)
    try {
      await onConfirm()
      onClose()
    } catch (err) {
      setError(err?.message || 'The action failed. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal open={open} onClose={busy ? undefined : onClose} title={title} maxWidth={440}>
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-danger/10 border border-danger/20 text-danger flex items-center justify-center shrink-0">
            <AlertTriangle size={18} />
          </div>
          <p className="text-sm text-muted leading-relaxed pt-1">{message}</p>
        </div>

        {error && (
          <p className="text-xs font-medium text-danger p-2.5 rounded-lg bg-danger/10 border border-danger/20" role="alert">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2.5 pt-1">
          <Button variant="secondary" size="sm" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button variant={confirmVariant} size="sm" onClick={handleConfirm} disabled={busy}>
            {busy ? (
              <>
                <Loader2 size={14} className="animate-spin" /> Working…
              </>
            ) : (
              confirmLabel
            )}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
