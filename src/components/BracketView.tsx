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
    <div className={showTitle ? 'rounded-xl border border-court-line/20 bg-court-green/30 p-6 overflow-x-auto' : ''}>
      {showTitle && (
        <h2 className="font-display text-xl tracking-wider text-court-line mb-6">
          TOURNAMENT DRAW
        </h2>
      )}
      <div className="flex gap-8 min-w-max pb-4">
        {roundNumbers.map((round) => (
          <div key={round} className="flex flex-col">
            <h3 className="font-display text-sm tracking-wider text-court-accent mb-4 text-center">
              {getRoundName(round).toUpperCase()}
            </h3>
            <div
              className="flex flex-col justify-around gap-2"
              style={{
                minHeight: `${matchesByRound[round].length * 80}px`,
              }}
            >
              {matchesByRound[round].map((match) => (
                <MatchCard key={match.id} match={match} />
              ))}
            </div>
          </div>
        ))}
      </div>

      <p className="text-court-line/50 text-sm mt-4">
        {draw.participants.length} players • {draw.rounds} rounds • Single elimination
        {draw.matches.some((m) => m.predictedWinner) && (
          <span className="ml-2 text-amber-400/70">• Minimax predictions</span>
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
      className={`w-48 rounded-lg border overflow-hidden ${
        isBye
          ? 'border-amber-500/40 bg-amber-500/10'
          : 'border-court-line/30 bg-black/20'
      }`}
    >
      <div className="px-3 py-2 border-b border-court-line/20 flex justify-between items-center">
        <span className="text-court-line/70 text-xs">
          Match {match.position + 1}
          {isBye && ' (Bye)'}
        </span>
        {winProb != null && !isBye && (
          <span className="text-amber-400/80 text-xs" title="P(player1 wins)">
            {(winProb * 100).toFixed(0)}%
          </span>
        )}
      </div>
      <div className="divide-y divide-court-line/10">
        <div
          className={`px-3 py-2 text-sm font-medium ${
            predWinner?.id === match.player1?.id
              ? 'text-amber-400 bg-amber-500/10'
              : 'text-court-line'
          }`}
        >
          {p1}
          {match.player1?.seed && (
            <span className="text-court-accent/80 ml-1">#{match.player1.seed}</span>
          )}
        </div>
        <div
          className={`px-3 py-2 text-sm font-medium ${
            predWinner?.id === match.player2?.id
              ? 'text-amber-400 bg-amber-500/10'
              : 'text-court-line'
          }`}
        >
          {p2}
          {match.player2?.seed && (
            <span className="text-court-accent/80 ml-1">#{match.player2.seed}</span>
          )}
        </div>
      </div>
    </div>
  )
}
