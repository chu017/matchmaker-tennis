import { useEffect } from 'react'
import { WAIVER_BODY, WAIVER_TITLE } from '../lib/waiverText'

type WaiverModalProps = {
  open: boolean
  onClose: () => void
  /** Full legal name — required before the waiver can be dismissed */
  legalName: string
  onLegalNameChange: (value: string) => void
}

function canDismissWithLegalName(legalName: string): boolean {
  return legalName.trim().length >= 2
}

export function WaiverModal({ open, onClose, legalName, onLegalNameChange }: WaiverModalProps) {
  const canClose = canDismissWithLegalName(legalName)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && canDismissWithLegalName(legalName)) onClose()
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose, legalName])

  if (!open) return null

  const today = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
  const displayLegal = legalName.trim() || '—'

  const tryClose = () => {
    if (canDismissWithLegalName(legalName)) onClose()
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="waiver-modal-title"
    >
      <button
        type="button"
        className={`absolute inset-0 bg-black/40 backdrop-blur-[1px] ${canClose ? 'cursor-pointer' : 'cursor-not-allowed'}`}
        aria-label={canClose ? 'Close waiver' : 'Enter legal name above to close'}
        onClick={() => canClose && onClose()}
      />
      <div className="relative w-full max-w-lg max-h-[85vh] sm:max-h-[90vh] rounded-t-2xl sm:rounded-2xl bg-white border border-pink-soft shadow-xl flex flex-col mt-auto sm:mt-0">
        <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-pink-soft shrink-0">
          <h2 id="waiver-modal-title" className="font-display text-lg tracking-wider text-pink-text pr-2">
            {WAIVER_TITLE}
          </h2>
          <button
            type="button"
            onClick={() => canClose && onClose()}
            className={`min-w-[44px] min-h-[44px] flex items-center justify-center touch-manipulation shrink-0 ${canClose ? 'text-pink-text-muted hover:text-pink-text' : 'text-pink-text-muted/35 cursor-not-allowed'}`}
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <div className="overflow-y-auto px-4 py-3 text-sm text-pink-text leading-relaxed space-y-4">
          <div className="rounded-xl bg-pink-soft/50 border border-pink-soft px-3 py-3">
            <label htmlFor="waiver-legal-name" className="block font-medium text-pink-text mb-1.5">
              Full legal name <span className="text-red-600">*</span>
            </label>
            <p className="text-xs text-pink-text-muted mb-2">
              Enter your name as it appears on government-issued ID. Required before you can close this window and
              complete registration.
            </p>
            <input
              id="waiver-legal-name"
              type="text"
              value={legalName}
              onChange={(e) => onLegalNameChange(e.target.value)}
              autoComplete="name"
              placeholder="e.g. Jane Marie Doe"
              className="w-full min-h-[44px] px-3 py-2 rounded-lg border border-pink-soft bg-white text-pink-text placeholder-pink-text-muted focus:outline-none focus:ring-2 focus:ring-pink-primary/40"
            />
            {!canClose && (
              <p className="text-xs text-pink-text-muted mt-2">Type at least 2 characters to enable Close.</p>
            )}
          </div>
          {WAIVER_BODY.split('\n\n').map((block, i) => (
            <p key={i} className="whitespace-pre-wrap">
              {block}
            </p>
          ))}
          <div className="rounded-xl bg-pink-soft/40 border border-pink-soft/60 px-3 py-3 text-xs sm:text-sm">
            <p className="font-medium text-pink-text mb-2">Electronic signature (upon registration)</p>
            <p>
              <span className="text-pink-text-muted">Legal name: </span>
              <span className="font-medium">{displayLegal}</span>
            </p>
            <p className="mt-1">
              <span className="text-pink-text-muted">Date: </span>
              <span className="font-medium">{today}</span>
            </p>
            <p className="mt-2 text-pink-text-muted">
              This legal name and date will be stored with your signup when you submit the form.
            </p>
          </div>
        </div>
        <div className="px-4 py-3 border-t border-pink-soft shrink-0">
          <button
            type="button"
            onClick={tryClose}
            disabled={!canClose}
            className="w-full min-h-[44px] rounded-xl bg-pink-primary text-white font-medium hover:opacity-95 touch-manipulation disabled:opacity-45 disabled:cursor-not-allowed"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
