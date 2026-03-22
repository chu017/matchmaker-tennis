import { getDisplayNameWithRatings, type StoredParticipant } from '../lib/participantsApi'

type Tab = 'singles' | 'doubles'

interface ParticipantsListProps {
  participants: StoredParticipant[]
  tab: Tab
  onTabChange: (tab: Tab) => void
  doublesEnabled?: boolean
}

export function ParticipantsList({
  participants,
  tab,
  onTabChange,
  doublesEnabled = true,
}: ParticipantsListProps) {
  const singles = [...participants.filter((p) => p.type === 'singles')].sort((a, b) => b.rating - a.rating)
  const getPairRating = (p: StoredParticipant) =>
    p.type === 'doubles' && p.partnerRating != null ? (p.rating + p.partnerRating) / 2 : p.rating
  const doubles = [...participants.filter((p) => p.type === 'doubles')].sort((a, b) => getPairRating(b) - getPairRating(a))
  const list = tab === 'singles' ? singles : doubles

  return (
    <div className="rounded-3xl bg-white shadow-card p-4 sm:p-6 border border-pink-soft/50">
      <h2 className="font-display text-xl tracking-wider text-pink-text mb-4">
        PARTICIPANTS
      </h2>
      <div className="flex gap-2 mb-4 flex-wrap">
        <button
          onClick={() => onTabChange('singles')}
          className={`min-h-[44px] px-4 py-2.5 rounded-full text-sm font-medium touch-manipulation transition-all duration-200 ease-out active:scale-[0.98] motion-reduce:active:scale-100 ${
            tab === 'singles'
              ? 'bg-pink-primary text-white shadow-sm'
              : 'bg-pink-soft/80 text-pink-text-muted hover:bg-pink-muted/60'
          }`}
        >
          Singles ({singles.length})
        </button>
        <button
          type="button"
          disabled={!doublesEnabled}
          onClick={() => doublesEnabled && onTabChange('doubles')}
          className={`min-h-[44px] px-4 py-2.5 rounded-full text-sm font-medium touch-manipulation transition-all duration-200 ease-out active:scale-[0.98] motion-reduce:active:scale-100 ${
            !doublesEnabled
              ? 'opacity-45 cursor-not-allowed bg-pink-soft/50 text-pink-text-muted'
              : tab === 'doubles'
                ? 'bg-pink-primary text-white shadow-sm'
                : 'bg-pink-soft/80 text-pink-text-muted hover:bg-pink-muted/60'
          }`}
        >
          Doubles ({doubles.length})
        </button>
      </div>
      <div key={tab} className="animate-draw-tab motion-reduce:animate-none">
        <p className="text-pink-text-muted text-sm mb-4">
          {list.length} signed up • Live
        </p>
        <p className="text-pink-text-muted text-xs mb-4">
          # = seed by NTRP (2.5–4.5). Draw: max 16; top 4 seeds in four different quarters; extra spots =
          byes.
          {doublesEnabled ? ' Doubles: pair average for seed.' : ' Singles bracket only.'}
        </p>
        <ul className="space-y-2 max-h-64 overflow-y-auto divide-y divide-pink-soft">
          {list.length === 0 ? (
            <li className="text-pink-text-muted text-sm py-2">
              No {tab} participants yet. Be the first to sign up!
            </li>
          ) : (
            list.map((p, i) => (
              <li key={p.id} className="flex items-center gap-2 px-3 py-2">
                <span className="w-1.5 h-1.5 rounded-full bg-pink-primary shrink-0" />
                <span className="text-pink-text">
                  {getDisplayNameWithRatings(p)}
                  <span className="text-pink-accent ml-2 text-xs font-semibold">#{i + 1}</span>
                </span>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  )
}
