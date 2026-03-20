import { useState } from 'react'
import { Participant } from '../lib/tournament'

interface ParticipantListProps {
  participants: Participant[]
  onChange: (participants: Participant[]) => void
  onGenerateDraw: () => void
}

export function ParticipantList({ participants, onChange, onGenerateDraw }: ParticipantListProps) {
  const [newName, setNewName] = useState('')
  const [newSeed, setNewSeed] = useState('')
  const [newRating, setNewRating] = useState('')

  const handleAdd = () => {
    const name = newName.trim()
    if (!name) return

    const seed = newSeed.trim() ? parseInt(newSeed, 10) : undefined
    if (newSeed && (isNaN(seed!) || seed! < 1)) return

    const rating = newRating.trim() ? parseInt(newRating, 10) : undefined
    if (newRating && (isNaN(rating!) || rating! < 0)) return

    const newParticipant: Participant = {
      id: crypto.randomUUID(),
      name,
      seed,
      rating,
    }
    onChange([...participants, newParticipant])
    setNewName('')
    setNewSeed('')
    setNewRating('')
  }

  const handleRemove = (id: string) => {
    onChange(participants.filter((p) => p.id !== id))
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleAdd()
  }

  return (
    <div className="rounded-xl border border-court-line/20 bg-court-green/30 p-6">
      <h2 className="font-display text-xl tracking-wider text-court-line mb-4">
        PARTICIPANTS
      </h2>

      <div className="space-y-3 mb-4">
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Player name"
          className="w-full px-4 py-2.5 rounded-lg bg-black/30 border border-court-line/20 text-court-line placeholder-court-line/50 focus:outline-none focus:ring-2 focus:ring-court-accent/50 focus:border-court-accent/50"
        />
        <div className="flex gap-2 flex-wrap">
          <input
            type="number"
            min="1"
            value={newSeed}
            onChange={(e) => setNewSeed(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Seed (opt)"
            className="flex-1 min-w-0 px-4 py-2.5 rounded-lg bg-black/30 border border-court-line/20 text-court-line placeholder-court-line/50 focus:outline-none focus:ring-2 focus:ring-court-accent/50 focus:border-court-accent/50"
          />
          <input
            type="number"
            min="0"
            value={newRating}
            onChange={(e) => setNewRating(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Rating (Elo)"
            title="Elo rating for minimax prediction"
            className="flex-1 min-w-0 px-4 py-2.5 rounded-lg bg-black/30 border border-court-line/20 text-court-line placeholder-court-line/50 focus:outline-none focus:ring-2 focus:ring-court-accent/50 focus:border-court-accent/50"
          />
          <button
            onClick={handleAdd}
            className="px-4 py-2.5 rounded-lg bg-court-accent text-court-green font-semibold hover:bg-court-accent/90 transition-colors shrink-0"
          >
            Add
          </button>
        </div>
        <p className="text-court-line/40 text-xs mt-1">
          Rating powers minimax predictions (or use seed)
        </p>
      </div>

      <ul className="space-y-2 mb-6 max-h-64 overflow-y-auto">
        {participants.map((p) => (
          <li
            key={p.id}
            className="flex items-center justify-between px-3 py-2 rounded-lg bg-black/20 border border-court-line/10"
          >
            <span className="text-court-line">
              {p.seed && (
                <span className="text-court-accent font-semibold mr-2">#{p.seed}</span>
              )}
              {p.rating != null && (
                <span className="text-amber-400/80 text-xs mr-2">{p.rating}</span>
              )}
              {p.name}
            </span>
            <button
              onClick={() => handleRemove(p.id)}
              className="text-court-line/50 hover:text-red-400 transition-colors text-sm"
              aria-label="Remove"
            >
              ×
            </button>
          </li>
        ))}
      </ul>

      <button
        onClick={onGenerateDraw}
        disabled={participants.length < 2}
        className="w-full py-3 rounded-lg font-display text-lg tracking-wider bg-court-line text-court-green hover:bg-court-line/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
      >
        GENERATE DRAW
      </button>

      {participants.length > 0 && participants.length < 2 && (
        <p className="text-amber-400/80 text-sm mt-2 text-center">
          Add at least 2 players
        </p>
      )}
    </div>
  )
}
