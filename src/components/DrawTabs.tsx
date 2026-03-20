import { useState } from 'react'
import { TournamentDraw } from '../lib/tournament'
import { BracketView } from './BracketView'

interface DrawTabsProps {
  singlesDraw: TournamentDraw | null
  doublesDraw: TournamentDraw | null
}

type Tab = 'singles' | 'doubles'

export function DrawTabs({ singlesDraw, doublesDraw }: DrawTabsProps) {
  const [tab, setTab] = useState<Tab>('singles')
  const draw = tab === 'singles' ? singlesDraw : doublesDraw

  return (
    <div className="rounded-xl border border-court-line/20 bg-court-green/30 p-4 sm:p-6 overflow-x-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h2 className="font-display text-xl tracking-wider text-court-line">
          TOURNAMENT DRAW
        </h2>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setTab('singles')}
            className={`min-h-[44px] px-4 py-2.5 rounded-lg text-sm font-medium transition-colors touch-manipulation ${
              tab === 'singles'
                ? 'bg-court-accent text-court-green'
                : 'bg-black/30 text-court-line/70 hover:bg-black/40'
            }`}
          >
            Singles ({singlesDraw?.participants.length ?? 0})
          </button>
          <button
            onClick={() => setTab('doubles')}
            className={`min-h-[44px] px-4 py-2.5 rounded-lg text-sm font-medium transition-colors touch-manipulation ${
              tab === 'doubles'
                ? 'bg-court-accent text-court-green'
                : 'bg-black/30 text-court-line/70 hover:bg-black/40'
            }`}
          >
            Doubles ({doublesDraw?.participants.length ?? 0})
          </button>
        </div>
      </div>

      {draw ? (
        <BracketView draw={draw} showTitle={false} />
      ) : (
        <div className="border-2 border-dashed border-court-line/30 rounded-lg bg-court-green/20 p-8 sm:p-12 text-center">
          <p className="text-court-line/60 text-lg mb-2">
            At least 2 {tab} participants needed for the draw
          </p>
          <p className="text-court-line/40 text-sm">
            Share the link — participants sign up and the draw updates live
          </p>
        </div>
      )}
    </div>
  )
}
