import { useState } from 'react'
import { Participant } from '../lib/tournament'
import { getSeedingSuggestions, type SeedingSuggestion } from '../lib/minimaxApi'

interface SeedingSuggestionsProps {
  onApply: (participants: Participant[]) => void
}

export function SeedingSuggestions({ onApply }: SeedingSuggestionsProps) {
  const [descriptions, setDescriptions] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [suggestions, setSuggestions] = useState<SeedingSuggestion[] | null>(null)

  const handleGetSuggestions = async () => {
    const text = descriptions.trim()
    if (!text) return
    setLoading(true)
    setError(null)
    setSuggestions(null)
    try {
      const result = await getSeedingSuggestions(text)
      setSuggestions(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get suggestions')
    } finally {
      setLoading(false)
    }
  }

  const handleApply = () => {
    if (!suggestions?.length) return
    const participants: Participant[] = suggestions.map((s) => ({
      id: crypto.randomUUID(),
      name: s.name,
      seed: s.seed,
      rating: s.rating,
    }))
    onApply(participants)
    setSuggestions(null)
    setDescriptions('')
  }

  return (
    <div className="rounded-xl border border-court-line/20 bg-court-green/30 p-6 mt-6">
      <h2 className="font-display text-xl tracking-wider text-court-line mb-2">
        AI SEEDING SUGGESTIONS
      </h2>
      <p className="text-court-line/60 text-sm mb-4">
        Describe your players and MiniMax will suggest seeds and ratings.
      </p>
      <textarea
        value={descriptions}
        onChange={(e) => setDescriptions(e.target.value)}
        placeholder="e.g. Alice is a former college player, very strong. Bob is a beginner. Carol has been playing for 2 years, intermediate level..."
        rows={4}
        className="w-full px-4 py-3 rounded-lg bg-black/30 border border-court-line/20 text-court-line placeholder-court-line/50 focus:outline-none focus:ring-2 focus:ring-court-accent/50 resize-none text-sm"
      />
      <div className="flex gap-2 mt-3">
        <button
          onClick={handleGetSuggestions}
          disabled={loading || !descriptions.trim()}
          className="px-4 py-2 rounded-lg bg-court-accent text-court-green font-semibold hover:bg-court-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Getting suggestions...' : 'Get AI Suggestions'}
        </button>
        {suggestions && suggestions.length > 0 && (
          <button
            onClick={handleApply}
            className="px-4 py-2 rounded-lg bg-court-line text-court-green font-semibold hover:bg-court-line/90 transition-colors"
          >
            Apply to Participants
          </button>
        )}
      </div>
      {error && (
        <p className="text-red-400 text-sm mt-2">{error}</p>
      )}
      {suggestions && suggestions.length > 0 && (
        <div className="mt-4 p-3 rounded-lg bg-black/20 border border-court-line/10">
          <p className="text-court-line/70 text-xs mb-2">Suggested:</p>
          <ul className="space-y-1 text-sm text-court-line">
            {suggestions.map((s, i) => (
              <li key={i}>
                {s.name}
                {s.seed != null && <span className="text-court-accent ml-1">#{s.seed}</span>}
                {s.rating != null && <span className="text-amber-400/80 ml-1">({s.rating})</span>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
