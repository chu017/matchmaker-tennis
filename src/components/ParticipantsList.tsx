import { useState } from 'react'
import { getDisplayName, type StoredParticipant } from '../lib/participantsApi'

interface ParticipantsListProps {
  participants: StoredParticipant[]
}

type Tab = 'singles' | 'doubles'

export function ParticipantsList({ participants }: ParticipantsListProps) {
  const [tab, setTab] = useState<Tab>('singles')
  const singles = participants.filter((p) => p.type === 'singles')
  const doubles = participants.filter((p) => p.type === 'doubles')
  const list = tab === 'singles' ? singles : doubles

  return (
    <div className="rounded-xl border border-court-line/20 bg-court-green/30 p-6">
      <h2 className="font-display text-xl tracking-wider text-court-line mb-4">
        PARTICIPANTS
      </h2>
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setTab('singles')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            tab === 'singles'
              ? 'bg-court-accent text-court-green'
              : 'bg-black/30 text-court-line/70 hover:bg-black/40'
          }`}
        >
          Singles ({singles.length})
        </button>
        <button
          onClick={() => setTab('doubles')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            tab === 'doubles'
              ? 'bg-court-accent text-court-green'
              : 'bg-black/30 text-court-line/70 hover:bg-black/40'
          }`}
        >
          Doubles ({doubles.length})
        </button>
      </div>
      <p className="text-court-line/50 text-sm mb-4">
        {list.length} signed up • Live
      </p>
      <ul className="space-y-2 max-h-64 overflow-y-auto">
        {list.length === 0 ? (
          <li className="text-court-line/50 text-sm">
            No {tab} participants yet. Be the first to sign up!
          </li>
        ) : (
          list.map((p) => (
            <li
              key={p.id}
              className="flex items-center justify-between px-3 py-2 rounded-lg bg-black/20 border border-court-line/10"
            >
              <span className="text-court-line">
                {getDisplayName(p)}
                <span className="text-court-accent/80 ml-2 text-xs">({p.rating})</span>
              </span>
            </li>
          ))
        )}
      </ul>
    </div>
  )
}
