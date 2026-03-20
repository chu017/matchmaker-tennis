import { TournamentDraw, getRoundName } from '../lib/tournament'

interface BracketViewProps {
  draw: TournamentDraw
  showTitle?: boolean
}

export function BracketView({ draw, showTitle = true }: BracketViewProps) {
  const matchesByRound = draw.matches.reduce<Record<number, typeof draw.matches>>(
    (acc, match) => {
      if (!acc[match.round]) acc[match.round] = []
      acc[match.round].push(match)
      return acc
    },
    {}
  )

  const roundNumbers = Object.keys(matchesByRound)
    .map(Number)
    .sort((a, b) => a - b)

  return (
    <div className={showTitle ? 'rounded-3xl bg-white shadow-card p-4 sm:p-6 overflow-x-auto border border-pink-soft/50' : ''}>
      {showTitle && (
        <h2 className="font-display text-xl tracking-wider text-pink-text mb-6">
          TOURNAMENT DRAW
        </h2>
      )}
      <div className="flex gap-3 sm:gap-6 md:gap-8 min-w-max pb-4 overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
        {roundNumbers.map((round, idx) => (
          <div key={round} className="flex items-center">
            <div className="flex flex-col pr-4 sm:pr-6 md:pr-8">
              <h3 className="font-display text-sm tracking-wider text-pink-primary mb-4 text-center">
                {getRoundName(round).toUpperCase()}
              </h3>
              <div
                className="flex flex-col justify-around gap-2"
                style={{ minHeight: `${matchesByRound[round].length * 80}px` }}
              >
                {matchesByRound[round].map((match) => (
                  <MatchCard key={match.id} match={match} />
                ))}
              </div>
            </div>
            {idx < roundNumbers.length - 1 && (
              <div className="w-px self-stretch min-h-[120px] bg-pink-soft flex-shrink-0 mx-2 sm:mx-3 md:mx-4" aria-hidden />
            )}
          </div>
        ))}
      </div>

      <p className="text-pink-text-muted text-sm mt-4">
        {draw.participants.length} players • {draw.rounds} rounds • Single elimination
        {draw.matches.some((m) => m.predictedWinner) && (
          <span className="ml-2 text-pink-primary">• Minimax predictions</span>
        )}
      </p>
    </div>
  )
}

function MatchCard({
  match,
}: {
  match: TournamentDraw['matches'][0]
}) {
  const p1 = match.player1?.name ?? 'TBD'
  const p2 = match.player2?.name ?? 'TBD'
  const isBye = match.isBye
  const predWinner = match.predictedWinner
  const winProb = match.predictedWinProb

  return (
    <div
      className={`w-32 sm:w-44 md:w-48 shrink-0 rounded-xl overflow-hidden shadow-card ${
        isBye ? 'border border-pink-muted bg-pink-soft/50' : 'border border-pink-soft bg-white'
      }`}
    >
      <div className="px-3 py-2 bg-pink-soft flex justify-between items-center gap-2">
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
      <div className="divide-y divide-pink-soft">
        <div
          className={`px-3 py-2 text-sm font-medium flex justify-between items-center gap-2 ${
            match.winner?.id === match.player1?.id
              ? 'text-pink-primary bg-pink-soft font-semibold'
              : predWinner?.id === match.player1?.id
                ? 'text-pink-primary bg-pink-soft/60'
                : 'text-pink-text'
          }`}
        >
          <span>
            {p1}
            {match.winner?.id === match.player1?.id && <span className="ml-1 text-xs">✓</span>}
            {match.player1?.seed && <span className="text-pink-accent ml-1">#{match.player1.seed}</span>}
          </span>
          {winProb != null && !isBye && !match.score && (
            <span className="text-pink-primary text-xs font-semibold shrink-0">
              {(winProb * 100).toFixed(0)}%
            </span>
          )}
        </div>
        <div
          className={`px-3 py-2 text-sm font-medium flex justify-between items-center gap-2 ${
            match.winner?.id === match.player2?.id
              ? 'text-pink-primary bg-pink-soft font-semibold'
              : predWinner?.id === match.player2?.id
                ? 'text-pink-primary bg-pink-soft/60'
                : 'text-pink-text'
          }`}
        >
          <span>
            {p2}
            {match.winner?.id === match.player2?.id && <span className="ml-1 text-xs">✓</span>}
            {match.player2?.seed && <span className="text-pink-accent ml-1">#{match.player2.seed}</span>}
          </span>
          {winProb != null && !isBye && !match.score && (
            <span className="text-pink-primary text-xs font-semibold shrink-0">
              {((1 - winProb) * 100).toFixed(0)}%
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
