import { useState, useEffect, useMemo } from 'react'
import { TournamentDraw, getRoundName, type Participant, type Match } from '../lib/tournament'
import { formatParticipantDrawInline } from '../lib/drawDisplay'
import {
  computeBracketLayout,
  buildConnectorPaths,
  type BracketLayout,
} from '../lib/bracketLayout'

const CONNECTOR_WIDTH = 44

interface BracketViewProps {
  draw: TournamentDraw
  showTitle?: boolean
}

function RoundNavButton({
  direction,
  disabled,
  onClick,
}: {
  direction: 'prev' | 'next'
  disabled: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-label={direction === 'prev' ? 'Previous rounds' : 'Next rounds'}
      className={`shrink-0 flex h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center rounded-full border border-pink-soft bg-white shadow-sm text-pink-text touch-manipulation transition-all duration-200 ease-out ${
        disabled ? 'opacity-35 cursor-not-allowed' : 'hover:bg-pink-soft/60 hover:scale-105 active:scale-95'
      }`}
    >
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        {direction === 'prev' ? <path d="M15 18l-6-6 6-6" /> : <path d="M9 18l6-6-6-6" />}
      </svg>
    </button>
  )
}

function BracketConnectors({
  layout,
  leftRound,
}: {
  layout: BracketLayout
  leftRound: number
}) {
  const h = layout.totalHeight
  const stemX = CONNECTOR_WIDTH * 0.4
  const paths = buildConnectorPaths(layout, leftRound, CONNECTOR_WIDTH, stemX)

  return (
    <svg
      width={CONNECTOR_WIDTH}
      height={h}
      viewBox={`0 0 ${CONNECTOR_WIDTH} ${h}`}
      className="shrink-0 text-pink-primary/40 motion-reduce:opacity-60"
      aria-hidden
    >
      {paths.map(({ d, key }) => (
        <path
          key={key}
          d={d}
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      ))}
    </svg>
  )
}

function RoundColumnTree({
  matches,
  layout,
}: {
  matches: Match[]
  layout: BracketLayout
}) {
  return (
    <div
      className="relative flex-1 min-w-0 w-full max-w-md mx-auto"
      style={{ height: layout.totalHeight }}
    >
      {matches.map((m) => {
        const top = layout.topByMatchId.get(m.id) ?? 0
        return (
          <div
            key={m.id}
            className="absolute left-0 right-0 max-w-md mx-auto px-0.5 flex items-center justify-center"
            style={{
              top,
              height: layout.cardHeight,
            }}
          >
            {/* Natural-height card, vertically centered in slot — avoids empty white flex gap below short rows */}
            <MatchCard match={m} treeSlot className="w-full max-h-full" />
          </div>
        )
      })}
    </div>
  )
}

export function BracketView({ draw, showTitle = true }: BracketViewProps) {
  const [startIdx, setStartIdx] = useState(0)
  const [panelEnterDir, setPanelEnterDir] = useState<'next' | 'prev'>('next')

  const layout = useMemo(() => computeBracketLayout(draw), [draw])

  const matchesByRound = useMemo(
    () =>
      draw.matches.reduce<Record<number, typeof draw.matches>>((acc, match) => {
        if (!acc[match.round]) acc[match.round] = []
        acc[match.round].push(match)
        return acc
      }, {}),
    [draw.matches]
  )

  const roundNumbers = useMemo(
    () =>
      Object.keys(matchesByRound)
        .map(Number)
        .sort((a, b) => a - b),
    [matchesByRound]
  )

  // Two rounds side-by-side on all viewports so bracket connector lines show on mobile too
  const viewportSize = roundNumbers.length > 1 ? 2 : 1
  const maxStart = Math.max(0, roundNumbers.length - viewportSize)
  const needsNav = roundNumbers.length > viewportSize

  const roundsKey = roundNumbers.join(',')

  useEffect(() => {
    setStartIdx(0)
    setPanelEnterDir('next')
  }, [roundsKey])

  useEffect(() => {
    setStartIdx((i) => Math.min(Math.max(0, i), maxStart))
  }, [maxStart])

  const clampedStart = Math.min(startIdx, maxStart)
  const visibleRounds = roundNumbers.slice(clampedStart, clampedStart + viewportSize)

  const roundSubtitle = visibleRounds.map((r) => getRoundName(r)).join(' · ')

  const positionLabel =
    roundNumbers.length <= 1
      ? null
      : needsNav
        ? `View ${clampedStart + 1}–${Math.min(clampedStart + viewportSize, roundNumbers.length)} of ${roundNumbers.length}`
        : null

  const leftR = visibleRounds[0]
  const rightR = visibleRounds[1]
  const showTreeWithConnectors =
    visibleRounds.length === 2 &&
    rightR === leftR + 1 &&
    layout.matchesByRound[leftR]?.length > 0 &&
    layout.matchesByRound[rightR]?.length > 0

  return (
    <div className={showTitle ? 'rounded-3xl bg-white shadow-card p-4 sm:p-6 border border-pink-soft/50' : ''}>
      {showTitle && (
        <h2 className="font-display text-xl tracking-wider text-pink-text mb-4">
          TOURNAMENT DRAW
        </h2>
      )}

      {roundNumbers.length === 0 ? null : (
        <>
          {needsNav && (
            <div className="flex items-center gap-3 sm:gap-4 mb-4 sm:mb-5">
              <RoundNavButton
                direction="prev"
                disabled={clampedStart <= 0}
                onClick={() => {
                  setPanelEnterDir('prev')
                  setStartIdx((s) => Math.max(0, s - 1))
                }}
              />
              <div className="flex-1 min-w-0 text-center px-1">
                <p className="font-display text-xs sm:text-sm tracking-wider text-pink-primary uppercase leading-tight">
                  {roundSubtitle}
                </p>
                {positionLabel && (
                  <p className="text-pink-text-muted text-xs mt-1">{positionLabel}</p>
                )}
              </div>
              <RoundNavButton
                direction="next"
                disabled={clampedStart >= maxStart}
                onClick={() => {
                  setPanelEnterDir('next')
                  setStartIdx((s) => Math.min(maxStart, s + 1))
                }}
              />
            </div>
          )}

          {!needsNav && roundNumbers.length > 0 && (
            <div className="mb-4 sm:mb-5 text-center">
              <p className="font-display text-xs sm:text-sm tracking-wider text-pink-primary uppercase">
                {roundSubtitle}
              </p>
            </div>
          )}

          <div
            key={`bracket-${clampedStart}-${viewportSize}-${roundsKey}`}
            className={`flex justify-center items-start gap-1 sm:gap-0 pb-2 overflow-visible motion-reduce:animate-none ${
              needsNav
                ? panelEnterDir === 'next'
                  ? 'animate-bracket-slide-next'
                  : 'animate-bracket-slide-prev'
                : ''
            }`}
          >
            {showTreeWithConnectors ? (
              <>
                <RoundColumnTree matches={layout.matchesByRound[leftR] ?? []} layout={layout} />
                <div className="flex items-start pt-0 shrink-0 px-0.5" style={{ height: layout.totalHeight }}>
                  <BracketConnectors layout={layout} leftRound={leftR} />
                </div>
                <RoundColumnTree matches={layout.matchesByRound[rightR] ?? []} layout={layout} />
              </>
            ) : (
              <div className="flex flex-col sm:flex-row items-stretch sm:items-start justify-center gap-6 sm:gap-8 md:gap-10 w-full">
                {visibleRounds.map((round, idx) => (
                  <div key={round} className="flex flex-1 min-w-0 max-w-lg sm:max-w-md mx-auto w-full justify-center">
                    <div className="flex items-start w-full">
                      <div className="flex flex-col flex-1 min-w-0">
                        <div
                          className="flex flex-col justify-around gap-2"
                          style={{
                            minHeight: `${Math.max(matchesByRound[round].length * 88, 80)}px`,
                          }}
                        >
                          {matchesByRound[round].map((match) => (
                            <MatchCard key={match.id} match={match} />
                          ))}
                        </div>
                      </div>
                      {idx < visibleRounds.length - 1 && (
                        <div
                          className="hidden sm:block w-px self-stretch min-h-[100px] bg-pink-soft shrink-0 mx-4 md:mx-6"
                          aria-hidden
                        />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      <p className="text-pink-text-muted text-sm mt-4">
        {draw.participants.length} in main draw (first 16 sign-ups) • {draw.rounds} rounds • Single elimination
        {draw.matches.some((m) => m.predictedWinner) && (
          <span className="ml-2 text-pink-primary">• Winning predictions</span>
        )}
      </p>
    </div>
  )
}

function PlayerSlot({
  player,
  isWinner,
  isPredicted,
  winProbPercent,
  showProb,
}: {
  player: Participant | null
  isWinner: boolean
  isPredicted: boolean
  winProbPercent: number | null
  showProb: boolean
}) {
  const label = formatParticipantDrawInline(player)

  return (
    <div
      className={`px-3 py-2 text-sm font-medium flex justify-between items-center gap-2 min-h-[2.75rem] shrink-0 ${
        isWinner
          ? 'text-pink-primary bg-pink-soft font-semibold'
          : isPredicted
            ? 'text-pink-primary bg-pink-soft/60'
            : 'text-pink-text'
      }`}
    >
      <span className="min-w-0 flex-1 leading-snug break-words">
        {label}
        {isWinner && <span className="ml-1 text-xs">✓</span>}
      </span>
      {showProb && winProbPercent != null && (
        <span className="text-pink-primary text-xs font-semibold shrink-0">
          {winProbPercent.toFixed(0)}%
        </span>
      )}
    </div>
  )
}

function MatchCard({
  match,
  className = '',
  treeSlot = false,
}: {
  match: TournamentDraw['matches'][0]
  className?: string
  /** Bracket tree: fixed-height slot; card stays content-sized and is vertically centered */
  treeSlot?: boolean
}) {
  const isBye = match.isBye
  const predWinner = match.predictedWinner
  const winProb = match.predictedWinProb
  const showProb = winProb != null && !isBye && !match.score

  return (
    <div
      className={`w-full max-w-[min(100%,20rem)] mx-auto sm:max-w-none sm:mx-0 rounded-xl overflow-hidden shadow-card flex flex-col ${
        isBye ? 'border border-pink-muted bg-pink-soft/50' : 'border border-pink-soft bg-white'
      } ${treeSlot ? 'min-h-0 max-h-full overflow-y-auto' : ''} ${className}`}
    >
      <div className="px-3 py-2 bg-pink-soft flex justify-between items-center gap-2 shrink-0">
        <span className="text-pink-text-muted text-xs font-medium">
          Match {match.position + 1}
          {isBye && ' (Bye)'}
        </span>
        <span className="flex items-center gap-2 shrink-0">
          {match.score && (
            <span className="text-pink-accent text-xs font-semibold">{match.score}</span>
          )}
        </span>
      </div>
      {/* No flex-1 here — it stretched the white body to fill the tree slot and looked like empty space */}
      <div className="divide-y divide-pink-soft flex flex-col shrink-0">
        <PlayerSlot
          player={match.player1}
          isWinner={match.winner?.id === match.player1?.id}
          isPredicted={predWinner?.id === match.player1?.id && match.winner?.id !== match.player1?.id}
          winProbPercent={showProb ? winProb * 100 : null}
          showProb={showProb}
        />
        <PlayerSlot
          player={match.player2}
          isWinner={match.winner?.id === match.player2?.id}
          isPredicted={predWinner?.id === match.player2?.id && match.winner?.id !== match.player2?.id}
          winProbPercent={showProb ? (1 - winProb) * 100 : null}
          showProb={showProb}
        />
      </div>
    </div>
  )
}
