import { getDisplayName, type StoredParticipant } from '../lib/participantsApi'

interface ParticipantsListProps {
  participants: StoredParticipant[]
}

export function ParticipantsList({ participants }: ParticipantsListProps) {
  return (
    <div className="rounded-xl border border-court-line/20 bg-court-green/30 p-6">
      <h2 className="font-display text-xl tracking-wider text-court-line mb-4">
        PARTICIPANTS
      </h2>
      <p className="text-court-line/50 text-sm mb-4">
        {participants.length} signed up • Live
      </p>
      <ul className="space-y-2 max-h-64 overflow-y-auto">
        {participants.length === 0 ? (
          <li className="text-court-line/50 text-sm">No participants yet. Be the first to sign up!</li>
        ) : (
          participants.map((p) => (
            <li
              key={p.id}
              className="flex items-center justify-between px-3 py-2 rounded-lg bg-black/20 border border-court-line/10"
            >
              <span className="text-court-line">
                {getDisplayName(p)}
                <span className="text-court-accent/80 ml-2 text-xs">({p.rating})</span>
                <span className="text-court-line/50 ml-2 text-xs capitalize">{p.type}</span>
              </span>
            </li>
          ))
        )}
      </ul>
    </div>
  )
}
