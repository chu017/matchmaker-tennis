import { useState, useEffect } from 'react'
import { addParticipant } from '../lib/participantsApi'
import { DOUBLES_ENABLED } from '../lib/featureFlags'

export function SignUpForm() {
  const [name, setName] = useState('')
  const [rating, setRating] = useState('')
  const [type, setType] = useState<'singles' | 'doubles'>('singles')
  const [partnerName, setPartnerName] = useState('')
  const [partnerRating, setPartnerRating] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (success) {
      const t = setTimeout(() => setSuccess(false), 4000)
      return () => clearTimeout(t)
    }
  }, [success])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const n = name.trim()
    if (!n) return
    if (type === 'doubles' && !partnerName.trim()) {
      setError('Partner name required for doubles')
      return
    }
    setLoading(true)
    setError(null)
    setSuccess(false)
    try {
      await addParticipant({
        name: n,
        rating: rating ? parseFloat(rating) : 3.0,
        type,
        partnerName: type === 'doubles' ? partnerName.trim() : undefined,
        partnerRating: type === 'doubles' && partnerRating ? parseFloat(partnerRating) : undefined,
      })
      setSuccess(true)
      setName('')
      setRating('')
      setPartnerName('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign up failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-3xl bg-white shadow-card p-4 sm:p-6 border border-pink-soft/50 touch-manipulation">
      <h2 className="font-display text-xl tracking-wider text-pink-text mb-4">
        SIGN UP
      </h2>
      <div className="text-pink-text-muted text-sm mb-4 space-y-2">
        <p>
          Enter your details to join. The draw on this page updates in real time as people sign up.
        </p>
        <p className="font-medium text-pink-text">Draw &amp; bracket rules</p>
        <ul className="list-disc list-inside space-y-1 text-xs sm:text-sm">
          <li>
            <strong>Max 16</strong> players in the singles bracket. If more than 16 register, only the{' '}
            <strong>top 16 by NTRP</strong> are included in the draw.
          </li>
          <li>
            <strong>Single elimination</strong> with standard tournament seeding: the{' '}
            <strong>top four seeds</strong> are placed in <strong>four different quarter sections</strong>{' '}
            so they can’t meet until the semifinals.
          </li>
          <li>
            Ratings are typically <strong>2.5–4.5</strong>. When the field isn’t a full 16,{' '}
            <strong>byes</strong> are used so the bracket stays balanced.
          </li>
        </ul>
      </div>
      <div className="space-y-3">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Player name"
          required
          className="w-full min-h-[44px] px-4 py-3 rounded-xl bg-pink-soft/60 border-0 text-pink-text placeholder-pink-text-muted focus:outline-none focus:ring-2 focus:ring-pink-primary/40 touch-manipulation"
        />
        <input
          type="number"
          min="0"
          max="7"
          step="0.1"
          value={rating}
          onChange={(e) => setRating(e.target.value)}
          placeholder="Self rating (default 3.0)"
          className="w-full min-h-[44px] px-4 py-3 rounded-xl bg-pink-soft/60 border-0 text-pink-text placeholder-pink-text-muted focus:outline-none focus:ring-2 focus:ring-pink-primary/40 touch-manipulation"
        />
        <div>
          <label className="block text-pink-text-muted text-sm mb-2">Game type</label>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
            <label className="flex items-center gap-2 cursor-pointer min-h-[44px] touch-manipulation">
              <input
                type="radio"
                name="type"
                checked={type === 'singles'}
                onChange={() => setType('singles')}
                className="accent-pink-primary"
              />
              <span className="text-pink-text">Singles</span>
            </label>
            {DOUBLES_ENABLED && (
              <label className="flex items-center gap-2 cursor-pointer min-h-[44px] touch-manipulation">
                <input
                  type="radio"
                  name="type"
                  checked={type === 'doubles'}
                  onChange={() => setType('doubles')}
                  className="accent-pink-primary"
                />
                <span className="text-pink-text">Doubles</span>
              </label>
            )}
          </div>
        </div>
        {type === 'doubles' && (
          <>
            <input
              type="text"
              value={partnerName}
              onChange={(e) => setPartnerName(e.target.value)}
              placeholder="Partner's name"
              required={type === 'doubles'}
              className="w-full min-h-[44px] px-4 py-3 rounded-xl bg-pink-soft/60 border-0 text-pink-text placeholder-pink-text-muted focus:outline-none focus:ring-2 focus:ring-pink-primary/40 touch-manipulation"
            />
            <input
              type="number"
              min="0"
              max="7"
              step="0.1"
              value={partnerRating}
              onChange={(e) => setPartnerRating(e.target.value)}
              placeholder="Partner's rating (default 3.0)"
              className="w-full min-h-[44px] px-4 py-3 rounded-xl bg-pink-soft/60 border-0 text-pink-text placeholder-pink-text-muted focus:outline-none focus:ring-2 focus:ring-pink-primary/40 touch-manipulation"
            />
          </>
        )}
        <button
          type="submit"
          disabled={loading}
          className="w-full min-h-[48px] py-3 rounded-full font-display text-lg tracking-wider bg-gradient-to-b from-pink-primary to-[#FF4D8D] text-white hover:opacity-95 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all touch-manipulation"
        >
          {loading ? 'Signing up...' : 'Sign Up'}
        </button>
      </div>
      {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
      {success && <p className="text-pink-primary text-sm mt-2">You're in! Check the draw below.</p>}
    </form>
  )
}
