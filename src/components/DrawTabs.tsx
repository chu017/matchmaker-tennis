import { useMemo } from 'react'
import { TournamentDraw } from '../lib/tournament'
import { BracketView } from './BracketView'

type Tab = 'singles' | 'doubles'

interface DrawTabsProps {
  singlesDraw: TournamentDraw | null
  doublesDraw: TournamentDraw | null
  tab: Tab
  onTabChange: (tab: Tab) => void
  /** When false, doubles tab is disabled (singles-only event). */
  doublesEnabled?: boolean
}

function drawContentKey(draw: TournamentDraw | null): string {
  if (!draw) return 'empty'
  const ids = [...draw.participants].map((p) => p.id).sort().join()
  return `${draw.rounds}-${ids}`
}

export function DrawTabs({
  singlesDraw,
  doublesDraw,
  tab,
  onTabChange,
  doublesEnabled = true,
}: DrawTabsProps) {
  const draw = tab === 'singles' ? singlesDraw : doublesDraw
  const contentKey = useMemo(() => drawContentKey(draw), [draw])

  return (
    <div className="rounded-3xl bg-white shadow-card p-4 sm:p-6 overflow-x-auto border border-pink-soft/50">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h2 className="font-display text-xl tracking-wider text-pink-text">
          TOURNAMENT DRAW
        </h2>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => onTabChange('singles')}
            className={`min-h-[44px] px-4 py-2.5 rounded-full text-sm font-medium touch-manipulation transition-all duration-200 ease-out active:scale-[0.98] motion-reduce:active:scale-100 ${
              tab === 'singles'
                ? 'bg-pink-primary text-white shadow-sm'
                : 'bg-pink-soft/80 text-pink-text-muted hover:bg-pink-muted/60'
            }`}
          >
            Singles ({singlesDraw?.participants.length ?? 0})
          </button>
          <button
            type="button"
            disabled={!doublesEnabled}
            onClick={() => doublesEnabled && onTabChange('doubles')}
            className={`min-h-[44px] px-4 py-2.5 rounded-full text-sm font-medium transition-colors touch-manipulation ${
              !doublesEnabled
                ? 'opacity-45 cursor-not-allowed bg-pink-soft/50 text-pink-text-muted'
                : tab === 'doubles'
                  ? 'bg-pink-primary text-white'
                  : 'bg-pink-soft/80 text-pink-text-muted hover:bg-pink-muted/60'
            }`}
          >
            Doubles ({doublesDraw?.participants.length ?? 0})
          </button>
        </div>
      </div>

      <div
        key={`${tab}-${contentKey}`}
        className="animate-spring-reveal motion-reduce:animate-none"
      >
        {draw ? (
          <BracketView draw={draw} showTitle={false} />
        ) : (
          <div className="border-2 border-dashed border-pink-muted rounded-xl bg-pink-soft/40 p-8 sm:p-12 text-center">
            <p className="text-pink-text-muted text-lg mb-2">
              {!doublesEnabled && tab === 'doubles'
                ? 'No doubles draw for this event.'
                : `At least 2 ${tab} participants needed for the draw`}
            </p>
            <p className="text-pink-text-muted/80 text-sm">
              Share the link — participants sign up and the draw updates live
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
