import { useState, useEffect } from 'react'
import { addParticipant } from '../lib/participantsApi'
import { DOUBLES_ENABLED } from '../lib/featureFlags'
import { TENNISTRY_APP_STORE_URL } from '../lib/sponsor'
import { WAIVER_VERSION } from '../lib/waiverText'
import { WaiverModal } from './WaiverModal'
import { FEMALE_PAIRING_NTRP_ADJUSTMENT, type Gender } from '../lib/gender'

/** NTRP levels allowed for this event */
const NTRP_LEVELS = [2.5, 3.0, 3.5, 4.0, 4.5] as const

/** Default self (and partner) rating — must match option values from {@link ntrpOptionValue}. */
const DEFAULT_SELF_RATING = 3.0

function ntrpOptionValue(r: number): string {
  return r.toFixed(1)
}

const selectClassName =
  'w-full min-h-[44px] px-4 py-3 rounded-xl bg-pink-soft/60 border-0 text-pink-text focus:outline-none focus:ring-2 focus:ring-pink-primary/40 touch-manipulation'

export function SignUpForm() {
  const [name, setName] = useState('')
  const [rating, setRating] = useState(() => ntrpOptionValue(DEFAULT_SELF_RATING))
  const [type, setType] = useState<'singles' | 'doubles'>('singles')
  const [partnerName, setPartnerName] = useState('')
  const [partnerRating, setPartnerRating] = useState(() => ntrpOptionValue(DEFAULT_SELF_RATING))
  const [gender, setGender] = useState<'' | Gender>('')
  const [partnerGender, setPartnerGender] = useState<'' | Gender>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [successDetail, setSuccessDetail] = useState<'draw' | 'waiting' | null>(null)
  const [waiverModalOpen, setWaiverModalOpen] = useState(false)
  const [waiverLegalName, setWaiverLegalName] = useState('')
  const [waiverAccepted, setWaiverAccepted] = useState(false)

  useEffect(() => {
    if (success) {
      const t = setTimeout(() => {
        setSuccess(false)
        setSuccessDetail(null)
      }, 4000)
      return () => clearTimeout(t)
    }
  }, [success])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const n = name.trim()
    if (!n) return
    if (!waiverAccepted) {
      setError('Please read the waiver and check the box to agree before signing up.')
      return
    }
    if (!waiverLegalName.trim() || waiverLegalName.trim().length < 2) {
      setError('Please open the waiver, enter your full legal name, then agree below before signing up.')
      return
    }
    if (gender !== 'male' && gender !== 'female') {
      setError('Please select your gender')
      return
    }
    if (type === 'doubles') {
      if (!partnerName.trim()) {
        setError('Partner name required for doubles')
        return
      }
      if (partnerGender !== 'male' && partnerGender !== 'female') {
        setError("Please select your partner's gender")
        return
      }
    }
    setLoading(true)
    setError(null)
    setSuccess(false)
    try {
      const created = await addParticipant({
        name: n,
        rating: parseFloat(rating) || DEFAULT_SELF_RATING,
        type,
        gender: gender as Gender,
        partnerName: type === 'doubles' ? partnerName.trim() : undefined,
        partnerRating:
          type === 'doubles' ? parseFloat(partnerRating) || DEFAULT_SELF_RATING : undefined,
        partnerGender: type === 'doubles' ? (partnerGender as Gender) : undefined,
        waiverAccepted: true,
        waiverVersion: WAIVER_VERSION,
        waiverLegalName: waiverLegalName.trim(),
      })
      setSuccessDetail(created.bracketStatus === 'waiting' ? 'waiting' : 'draw')
      setSuccess(true)
      setWaiverAccepted(false)
      setWaiverLegalName('')
      setName('')
      setRating(ntrpOptionValue(DEFAULT_SELF_RATING))
      setPartnerName('')
      setPartnerRating(ntrpOptionValue(DEFAULT_SELF_RATING))
      setGender('')
      setPartnerGender('')
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
      <div className="text-pink-text-muted text-sm mb-4 space-y-3">
        <p>
          Enter your details to join. The draw on this page updates in real time as people sign up.
        </p>
        <p>
          <strong>16-player singles</strong> tournament: open to self-rated players <strong>NTRP 2.5–4.5</strong>.
          The event is planned for approximately <strong>one month from now</strong> at{' '}
          <strong>Golden Gate Park Tennis Center</strong>.
        </p>
        {DOUBLES_ENABLED && (
          <p className="text-xs">
            Doubles uses the same signup order and draw rules in its own bracket (see tabs below).
          </p>
        )}
        <p className="font-medium text-pink-text">Tournament schedule</p>
        <ul className="list-disc list-inside space-y-1 text-xs sm:text-sm">
          <li>Two-day format</li>
          <li>
            <strong>Day 1:</strong> First round and quarterfinals
          </li>
          <li>
            <strong>Day 2:</strong> Semifinals and final
          </li>
          <li>One can of tennis balls provided per match</li>
          <li>
            <strong>Prizes:</strong> Champion and runner-up (gift cards)
          </li>
          <li>
            <strong>Entry fee:</strong> $15 per player
          </li>
          <li>
            <strong>Sponsor:</strong>{' '}
            <a
              href={TENNISTRY_APP_STORE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-pink-primary font-medium hover:underline"
            >
              Tennistry
            </a>
          </li>
        </ul>
        <p className="font-medium text-pink-text">Draw &amp; bracket rules</p>
        <ul className="list-disc list-inside space-y-1 text-xs sm:text-sm">
          <li>
            <strong>First 16</strong> to sign up (by time) are in the <strong>main draw</strong> for that event;
            later sign-ups are on the <strong>waiting list</strong> until a spot opens.
          </li>
          <li>
            Within the main draw, <strong>bracket placement</strong> follows <strong>NTRP</strong> (top four seeds
            in four different quarters).
            {DOUBLES_ENABLED && (
              <>
                {' '}
                <strong>Doubles:</strong> for pair strength, female NTRP is treated as{' '}
                {FEMALE_PAIRING_NTRP_ADJUSTMENT} lower than male at the same self-reported level (pairing fairness).
              </>
            )}
          </li>
          <li>
            <strong>Single elimination</strong> with standard seeding. If fewer than 16 players enter,{' '}
            <strong>byes</strong> keep the bracket balanced.
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
        <div>
          <label htmlFor="signup-gender" className="block text-pink-text-muted text-sm mb-1.5">
            Gender
          </label>
          <select
            id="signup-gender"
            value={gender}
            onChange={(e) => setGender(e.target.value as '' | Gender)}
            required
            className={selectClassName}
          >
            <option value="" disabled>
              Select…
            </option>
            <option value="male">Male</option>
            <option value="female">Female</option>
          </select>
        </div>
        <div>
          <label htmlFor="signup-self-rating" className="block text-pink-text-muted text-sm mb-1.5">
            Self rating (NTRP)
          </label>
          <select
            id="signup-self-rating"
            value={rating}
            onChange={(e) => setRating(e.target.value)}
            required
            className={selectClassName}
          >
            {NTRP_LEVELS.map((r) => {
              const v = ntrpOptionValue(r)
              return (
                <option key={v} value={v}>
                  {v}
                </option>
              )
            })}
          </select>
        </div>
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
            <div>
              <label htmlFor="signup-partner-gender" className="block text-pink-text-muted text-sm mb-1.5">
                Partner gender
              </label>
              <select
                id="signup-partner-gender"
                value={partnerGender}
                onChange={(e) => setPartnerGender(e.target.value as '' | Gender)}
                required={type === 'doubles'}
                className={selectClassName}
              >
                <option value="" disabled>
                  Select…
                </option>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </div>
            <div>
              <label htmlFor="signup-partner-rating" className="block text-pink-text-muted text-sm mb-1.5">
                Partner rating (NTRP)
              </label>
              <select
                id="signup-partner-rating"
                value={partnerRating}
                onChange={(e) => setPartnerRating(e.target.value)}
                required={type === 'doubles'}
                className={selectClassName}
              >
                {NTRP_LEVELS.map((r) => (
                  <option key={r} value={String(r)}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
          </>
        )}
        <div className="rounded-xl border border-pink-soft bg-pink-soft/25 p-3 sm:p-4 space-y-3">
          <button
            type="button"
            onClick={() => setWaiverModalOpen(true)}
            className="w-full min-h-[44px] px-3 rounded-xl border border-pink-primary/40 bg-white text-pink-primary text-sm font-medium hover:bg-pink-soft/60 touch-manipulation text-center"
          >
            View liability waiver &amp; release
          </button>
          <label className="flex gap-3 items-start cursor-pointer touch-manipulation">
            <input
              type="checkbox"
              checked={waiverAccepted}
              onChange={(e) => setWaiverAccepted(e.target.checked)}
              className="mt-1 h-5 w-5 shrink-0 accent-pink-primary rounded border-pink-soft"
            />
            <span className="text-sm text-pink-text leading-snug">
              I have read, understood, and agree to the{' '}
              <strong>Waiver and Release of Liability</strong>, including assumption of risk and release of the
              organizers, sponsors, and venue. I entered my <strong>full legal name</strong> in the waiver window. My
              legal name and submission date are recorded as my electronic signature.
            </span>
          </label>
        </div>
        <button
          type="submit"
          disabled={loading || !waiverAccepted || !waiverLegalName.trim()}
          className="w-full min-h-[48px] py-3 rounded-full font-display text-lg tracking-wider bg-gradient-to-b from-pink-primary to-[#FF4D8D] text-white hover:opacity-95 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all touch-manipulation"
        >
          {loading ? 'Signing up...' : 'Sign Up'}
        </button>
      </div>
      {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
      {success && (
        <p className="text-pink-primary text-sm mt-2">
          {successDetail === 'waiting'
            ? "You're on the waiting list. If a main-draw spot opens, you'll move up automatically."
            : "You're in the main draw! Check the list and bracket below."}
        </p>
      )}
      <WaiverModal
        open={waiverModalOpen}
        onClose={() => setWaiverModalOpen(false)}
        legalName={waiverLegalName}
        onLegalNameChange={setWaiverLegalName}
      />
    </form>
  )
}
