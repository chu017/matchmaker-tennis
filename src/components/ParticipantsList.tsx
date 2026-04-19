import { getDisplayNameWithRatings, type StoredParticipant } from '../lib/participantsApi'
import { splitPoolBySignupOrder, compareSignupOrder } from '../lib/drawPool'
import { toTournamentParticipants } from '../lib/participantUtils'

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
  const singlesTotal = participants.filter((p) => p.type === 'singles').length
  const doublesTotal = participants.filter((p) => p.type === 'doubles').length

  const { inDraw, waiting } = splitPoolBySignupOrder(participants, tab)
  const seedById = new Map(
    toTournamentParticipants(inDraw).map((tp) => [tp.id, tp.seed as number]),
  )

  const inDrawChrono = [...inDraw].sort(compareSignupOrder)

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
          Singles ({singlesTotal})
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
          Doubles ({doublesTotal})
        </button>
      </div>
      <div key={tab} className="animate-draw-tab motion-reduce:animate-none space-y-5">
        <p className="text-pink-text-muted text-sm">
          {inDraw.length} in main draw · {waiting.length} waiting · {inDraw.length + waiting.length} total · Live
        </p>
        <p className="text-pink-text-muted text-xs">
          Up to 16 in the main draw (by signup time). R1 similar NTRP; R2+ mixes across seed bands. Venue &amp;
          schedule: see Sign Up — Golden Gate Park Tennis Center; two-day event; $15 entry.
          {doublesEnabled ? ' Doubles: pair average for seed.' : ' Singles only.'}
        </p>

        <div>
          <h3 className="text-pink-text font-semibold text-sm mb-2">Main draw</h3>
          <ul className="space-y-2 max-h-48 overflow-y-auto divide-y divide-pink-soft border border-pink-soft/40 rounded-xl">
            {inDrawChrono.length === 0 ? (
              <li className="text-pink-text-muted text-sm py-3 px-3">No {tab} entrants yet.</li>
            ) : (
              inDrawChrono.map((p, i) => (
                <li key={p.id} className="flex items-center gap-2 px-3 py-2">
                  <span className="text-pink-text-muted text-xs font-medium w-6 shrink-0 tabular-nums">{i + 1}.</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-pink-primary shrink-0" />
                  <span className="text-pink-text min-w-0">
                    {getDisplayNameWithRatings(p)}
                    <span className="text-pink-accent ml-2 text-xs font-semibold">
                      seed #{seedById.get(p.id) ?? '—'}
                    </span>
                  </span>
                </li>
              ))
            )}
          </ul>
        </div>

        {waiting.length > 0 && (
          <div>
            <h3 className="text-pink-text font-semibold text-sm mb-2">Waiting list</h3>
            <ul className="space-y-2 max-h-40 overflow-y-auto divide-y divide-pink-soft border border-pink-muted/50 rounded-xl bg-pink-soft/20">
              {waiting.map((p, i) => (
                <li key={p.id} className="flex items-center gap-2 px-3 py-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-pink-text-muted shrink-0" />
                  <span className="text-pink-text-muted min-w-0">
                    WL #{i + 1} · {getDisplayNameWithRatings(p)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}
