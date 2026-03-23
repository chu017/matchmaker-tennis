import { useEffect } from 'react'
import { WAIVER_BODY, WAIVER_TITLE } from '../lib/waiverText'

type WaiverModalProps = {
  open: boolean
  onClose: () => void
  /** Participant name from form — shown in signature block preview */
  participantName: string
}

export function WaiverModal({ open, onClose, participantName }: WaiverModalProps) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  const today = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
  const displayName = participantName.trim() || '—'

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="waiver-modal-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/40 backdrop-blur-[1px]"
        aria-label="Close waiver"
        onClick={onClose}
      />
      <div className="relative w-full max-w-lg max-h-[85vh] sm:max-h-[90vh] rounded-t-2xl sm:rounded-2xl bg-white border border-pink-soft shadow-xl flex flex-col mt-auto sm:mt-0">
        <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-pink-soft shrink-0">
          <h2 id="waiver-modal-title" className="font-display text-lg tracking-wider text-pink-text pr-2">
            {WAIVER_TITLE}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center text-pink-text-muted hover:text-pink-text touch-manipulation shrink-0"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <div className="overflow-y-auto px-4 py-3 text-sm text-pink-text leading-relaxed space-y-4">
          {WAIVER_BODY.split('\n\n').map((block, i) => (
            <p key={i} className="whitespace-pre-wrap">
              {block}
            </p>
          ))}
          <div className="rounded-xl bg-pink-soft/40 border border-pink-soft/60 px-3 py-3 text-xs sm:text-sm">
            <p className="font-medium text-pink-text mb-2">Electronic signature (upon registration)</p>
            <p>
              <span className="text-pink-text-muted">Name: </span>
              <span className="font-medium">{displayName}</span>
            </p>
            <p className="mt-1">
              <span className="text-pink-text-muted">Date: </span>
              <span className="font-medium">{today}</span>
            </p>
            <p className="mt-2 text-pink-text-muted">
              The name and date above will match your registration when you submit the form.
            </p>
          </div>
        </div>
        <div className="px-4 py-3 border-t border-pink-soft shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="w-full min-h-[44px] rounded-xl bg-pink-primary text-white font-medium hover:opacity-95 touch-manipulation"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
