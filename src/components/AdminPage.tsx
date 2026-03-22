import { useState, useEffect, useCallback } from 'react'
import {
  fetchParticipants,
  fetchMatchResults,
  normalizeMatchResults,
  type StoredParticipant,
  type MatchResults,
} from '../lib/participantsApi'
import { toTournamentParticipants } from '../lib/participantUtils'
import {
  generateDraw,
  applyMatchResults,
  getRoundName,
  getDownstreamMatchIds,
  type TournamentDraw,
  type Participant,
} from '../lib/tournament'
import { formatParticipantDrawInline } from '../lib/drawDisplay'
import { applyPredictionsToDraw } from '../lib/minimax'
import { verifyAdminKey, deleteParticipant, setMatchResult, clearMatchResult } from '../lib/adminApi'
import { AdminEventPlanning } from './AdminEventPlanning'
import { getDisplayNameWithRatings } from '../lib/participantsApi'
import { DOUBLES_ENABLED } from '../lib/featureFlags'
import { splitPoolBySignupOrder, formatAdminSignedUpAt } from '../lib/drawPool'

const ADMIN_KEY_STORAGE = 'sf-tennis-admin-key'

interface MatchResultRowProps {
  match: { id: string; position: number; isBye?: boolean }
  p1: Participant | null
  p2: Participant | null
  winnerId: string
  score: string
  onSetResult: (matchId: string, winnerId: string, score?: string | null) => void
  onClear: (matchId: string) => void
  saving?: boolean
  saved?: boolean
}

/** Parse "6-4, 6-3" or "6-4, 6-7(3), 10-8" into set pairs */
function parseScore(s: string): [number, number][] {
  const sets: [number, number][] = []
  const re = /(\d+)-(\d+)/g
  let m
  while ((m = re.exec(s))) {
    sets.push([+m[1], +m[2]])
  }
  return sets
}

/** Format sets to "6-4, 6-3" */
function formatScore(sets: [number, number][]): string {
  return sets
    .filter(([a, b]) => a > 0 || b > 0)
    .map(([a, b]) => `${a}-${b}`)
    .join(', ')
}

function MatchResultRow({ match, p1, p2, winnerId, score, onSetResult, onClear, saving, saved }: MatchResultRowProps) {
  const [localWinner, setLocalWinner] = useState(winnerId)
  const [localSets, setLocalSets] = useState<[number, number][]>(() => parseScore(score).length ? parseScore(score) : [[0, 0], [0, 0], [0, 0]])

  useEffect(() => {
    setLocalWinner(winnerId)
    const parsed = parseScore(score)
    setLocalSets(parsed.length ? parsed : [[0, 0], [0, 0], [0, 0]])
  }, [winnerId, score])

  const handleSetChange = (setIdx: number, slot: 0 | 1, val: string) => {
    const n = val === '' ? 0 : Math.min(99, Math.max(0, parseInt(val, 10) || 0))
    setLocalSets((prev) => {
      const next = prev.map((s) => [s[0], s[1]] as [number, number])
      while (next.length <= setIdx) next.push([0, 0])
      const [a, b] = next[setIdx]
      next[setIdx] = slot === 0 ? [n, b] : [a, n]
      return next
    })
  }

  const handleSave = () => {
    const scoreStr = formatScore(localSets)
    if (localWinner) onSetResult(match.id, localWinner, scoreStr || undefined)
  }

  return (
    <div className="flex flex-wrap items-center gap-2 p-3 rounded-xl bg-pink-soft/40 border border-pink-soft">
      <span className="text-sm text-pink-text-muted w-20 shrink-0">Match {match.position + 1}</span>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-pink-text text-sm min-w-0 flex-1">
        <span className="font-medium">{formatParticipantDrawInline(p1)}</span>
        <span className="text-pink-text-muted shrink-0">vs</span>
        <span className="font-medium">{formatParticipantDrawInline(p2)}</span>
      </div>
      {!match.isBye && p1 && p2 && (
        <>
          <select
            value={localWinner}
            onChange={(e) => setLocalWinner(e.target.value)}
            className="min-h-[36px] px-3 rounded-lg bg-white border border-pink-soft text-pink-text text-sm"
          >
            <option value="">— Set winner —</option>
            <option value={p1.id}>{p1.name}</option>
            <option value={p2.id}>{p2.name}</option>
          </select>
          <div className="flex items-center gap-1.5" title="Set 1, Set 2, Set 3 (optional)">
            {[0, 1, 2].map((i) => (
              <span key={i} className="flex items-center gap-0.5">
                <input
                  type="number"
                  min={0}
                  max={99}
                  placeholder="—"
                  value={localSets[i]?.[0] || ''}
                  onChange={(e) => handleSetChange(i, 0, e.target.value)}
                  className="w-10 h-8 text-center rounded bg-white border border-pink-soft text-pink-text text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <span className="text-pink-text-muted text-xs">-</span>
                <input
                  type="number"
                  min={0}
                  max={99}
                  placeholder="—"
                  value={localSets[i]?.[1] || ''}
                  onChange={(e) => handleSetChange(i, 1, e.target.value)}
                  className="w-10 h-8 text-center rounded bg-white border border-pink-soft text-pink-text text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                {i < 2 && <span className="text-pink-text-muted text-xs ml-0.5">,</span>}
              </span>
            ))}
          </div>
          <button
            onClick={handleSave}
            disabled={!localWinner || saving}
            className="min-h-[36px] px-3 rounded-lg bg-pink-primary text-white text-sm font-medium hover:opacity-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving…' : saved ? 'Saved!' : 'Save'}
          </button>
          {winnerId && (
            <button
              onClick={() => onClear(match.id)}
              className="min-h-[36px] px-3 rounded-lg bg-pink-soft/80 text-pink-text-muted text-sm hover:bg-pink-muted/60"
            >
              Clear
            </button>
          )}
        </>
      )}
    </div>
  )
}

interface AdminPageProps {
  onBack: () => void
}

export function AdminPage({ onBack }: AdminPageProps) {
  const [adminKey, setAdminKey] = useState(() => sessionStorage.getItem(ADMIN_KEY_STORAGE) || '')
  const [verified, setVerified] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [participants, setParticipants] = useState<StoredParticipant[]>([])
  const [matchResults, setMatchResults] = useState<MatchResults>({ singles: {}, doubles: {} })
  const [singlesDraw, setSinglesDraw] = useState<TournamentDraw | null>(null)
  const [doublesDraw, setDoublesDraw] = useState<TournamentDraw | null>(null)
  const [tab, setTab] = useState<'singles' | 'doubles'>('singles')
  const [adminSection, setAdminSection] = useState<'draw' | 'planning'>('draw')
  const [savingMatchId, setSavingMatchId] = useState<string | null>(null)
  const [savedMatchId, setSavedMatchId] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    try {
      const [data, resultsRaw] = await Promise.all([fetchParticipants(), fetchMatchResults()])
      setParticipants(data)
      const results = normalizeMatchResults(resultsRaw)
      setMatchResults(results)

      const singlesInDraw = splitPoolBySignupOrder(data, 'singles').inDraw
      const doublesInDraw = splitPoolBySignupOrder(data, 'doubles').inDraw

      if (singlesInDraw.length >= 2) {
        const sp = toTournamentParticipants(singlesInDraw)
        let draw = applyMatchResults(generateDraw(sp), results.singles)
        draw = applyPredictionsToDraw(draw)
        setSinglesDraw(draw)
      } else {
        setSinglesDraw(null)
      }
      if (doublesInDraw.length >= 2) {
        const dp = toTournamentParticipants(doublesInDraw)
        let draw = applyMatchResults(generateDraw(dp), results.doubles)
        draw = applyPredictionsToDraw(draw)
        setDoublesDraw(draw)
      } else {
        setDoublesDraw(null)
      }
    } catch {
      setParticipants([])
      setMatchResults({ singles: {}, doubles: {} })
      setSinglesDraw(null)
      setDoublesDraw(null)
    }
  }, [])

  useEffect(() => {
    if (verified) loadData()
  }, [verified, loadData])

  useEffect(() => {
    if (!DOUBLES_ENABLED && tab === 'doubles') setTab('singles')
  }, [tab])

  useEffect(() => {
    const id = verified ? setInterval(loadData, 3000) : 0
    return () => clearInterval(id)
  }, [verified, loadData])

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!adminKey.trim()) {
      setError('Enter admin key')
      return
    }
    try {
      const ok = await verifyAdminKey(adminKey.trim())
      if (ok) {
        sessionStorage.setItem(ADMIN_KEY_STORAGE, adminKey.trim())
        setVerified(true)
      } else {
        setError('Invalid admin key')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed')
    }
  }

  const handleDelete = async (id: string) => {
    if (!verified || !adminKey) return
    if (!confirm('Delete this participant?')) return
    setError(null)
    try {
      await deleteParticipant(id, adminKey)
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed')
    }
  }

  const handleSetResult = async (matchId: string, winnerId: string, score?: string | null) => {
    if (!verified || !adminKey) return
    setError(null)
    setSavingMatchId(matchId)
    setSavedMatchId(null)
    try {
      const results = await setMatchResult(matchId, winnerId, tab, adminKey, score)
      setMatchResults(normalizeMatchResults(results))
      await loadData()
      setSavedMatchId(matchId)
      setTimeout(() => setSavedMatchId(null), 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to set result')
    } finally {
      setSavingMatchId(null)
    }
  }

  const handleClearWinner = async (matchId: string) => {
    if (!verified || !adminKey) return
    setError(null)
    const draw = tab === 'singles' ? singlesDraw : doublesDraw
    const ids = draw ? [matchId, ...getDownstreamMatchIds(matchId, draw)] : [matchId]
    try {
      const results = await clearMatchResult(ids, tab, adminKey)
      setMatchResults(normalizeMatchResults(results))
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clear result')
    }
  }

  if (!verified) {
    return (
      <div className="min-h-screen bg-pink-soft/30 p-6 flex items-center justify-center">
        <div className="rounded-3xl bg-white shadow-card p-8 max-w-md w-full border border-pink-soft/50">
          <h1 className="font-display text-xl text-pink-text mb-2">Admin Login</h1>
          <p className="text-pink-text-muted text-sm mb-6">Enter your admin key to manage participants and match scores.</p>
          <form onSubmit={handleVerify} className="space-y-4">
            <input
              type="password"
              value={adminKey}
              onChange={(e) => setAdminKey(e.target.value)}
              placeholder="Admin key"
              className="w-full min-h-[44px] px-4 py-3 rounded-xl bg-pink-soft/60 border-0 text-pink-text placeholder-pink-text-muted focus:outline-none focus:ring-2 focus:ring-pink-primary/40"
              autoFocus
            />
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <div className="flex gap-3">
              <button type="submit" className="flex-1 min-h-[44px] py-3 rounded-full bg-pink-primary text-white font-medium hover:opacity-95">
                Login
              </button>
              <a href="/" className="flex-1 min-h-[44px] py-3 rounded-full bg-pink-soft/80 text-pink-text font-medium text-center flex items-center justify-center hover:bg-pink-muted/60">
                Back
              </a>
            </div>
          </form>
        </div>
      </div>
    )
  }

  const draw = tab === 'singles' ? singlesDraw : doublesDraw
  const results = (tab === 'singles' ? matchResults.singles : matchResults.doubles) ?? {}
  const poolSplit = splitPoolBySignupOrder(participants, tab)
  const seedById = new Map(
    toTournamentParticipants(poolSplit.inDraw).map((tp) => [tp.id, tp.seed as number]),
  )

  const getResult = (matchId: string): { winnerId: string; score: string } => {
    const val = results[matchId]
    if (!val) return { winnerId: '', score: '' }
    if (typeof val === 'string') return { winnerId: val, score: '' }
    const entry = val as { winnerId?: string; score?: string | null }
    return { winnerId: entry.winnerId || '', score: entry.score || '' }
  }

  return (
    <div className="min-h-screen bg-pink-soft/30">
      <header className="border-b border-pink-soft bg-white/90 sticky top-0 z-10 px-4 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <h1 className="font-display text-xl text-pink-text">Admin</h1>
          <div className="flex gap-2">
            <button
              onClick={() => {
                sessionStorage.removeItem(ADMIN_KEY_STORAGE)
                setVerified(false)
              }}
              className="min-h-[40px] px-4 rounded-xl bg-pink-soft/80 text-pink-text-muted text-sm hover:bg-pink-muted/60"
            >
              Logout
            </button>
            <button
              onClick={onBack}
              className="min-h-[40px] px-4 rounded-xl bg-pink-primary text-white text-sm font-medium flex items-center hover:opacity-95"
            >
              Back to app
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 space-y-6">
        {error && (
          <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-red-700 text-sm">
            {error}
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setAdminSection('draw')}
            className={`min-h-[44px] px-4 py-2.5 rounded-full text-sm font-medium ${
              adminSection === 'draw' ? 'bg-pink-primary text-white' : 'bg-pink-soft/80 text-pink-text-muted'
            }`}
          >
            Draw & results
          </button>
          <button
            type="button"
            onClick={() => setAdminSection('planning')}
            className={`min-h-[44px] px-4 py-2.5 rounded-full text-sm font-medium ${
              adminSection === 'planning' ? 'bg-pink-primary text-white' : 'bg-pink-soft/80 text-pink-text-muted'
            }`}
          >
            Event planning
          </button>
        </div>

        {adminSection === 'planning' ? (
          <AdminEventPlanning
            adminKey={adminKey}
            singlesDraw={singlesDraw}
            doublesDraw={doublesDraw}
            onError={setError}
            doublesEnabled={DOUBLES_ENABLED}
          />
        ) : (
          <>
        <div className="flex gap-2">
          <button
            onClick={() => setTab('singles')}
            className={`min-h-[44px] px-4 py-2.5 rounded-full text-sm font-medium ${
              tab === 'singles' ? 'bg-pink-primary text-white' : 'bg-pink-soft/80 text-pink-text-muted'
            }`}
          >
            Singles
          </button>
          <button
            type="button"
            disabled={!DOUBLES_ENABLED}
            onClick={() => DOUBLES_ENABLED && setTab('doubles')}
            className={`min-h-[44px] px-4 py-2.5 rounded-full text-sm font-medium ${
              !DOUBLES_ENABLED
                ? 'opacity-45 cursor-not-allowed bg-pink-soft/50 text-pink-text-muted'
                : tab === 'doubles'
                  ? 'bg-pink-primary text-white'
                  : 'bg-pink-soft/80 text-pink-text-muted'
            }`}
          >
            Doubles
          </button>
        </div>

        <section className="rounded-3xl bg-white shadow-card p-4 sm:p-6 border border-pink-soft/50 space-y-6">
          <h2 className="font-display text-lg text-pink-text">Participants (delete)</h2>
          <p className="text-pink-text-muted text-xs">
            Main draw = first 16 sign-ups (by time). NTRP seed shown for bracket. Everyone’s{' '}
            <strong>signup time</strong> is listed below. Waiting = sign-ups after the 16th.
          </p>
          <div>
            <h3 className="text-sm font-semibold text-pink-text mb-2">Main draw</h3>
            <ul className="space-y-2 divide-y divide-pink-soft">
              {poolSplit.inDraw.length === 0 ? (
                <li className="text-pink-text-muted text-sm py-2">No {tab} entrants</li>
              ) : (
                poolSplit.inDraw.map((p) => (
                  <li
                    key={p.id}
                    className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between py-3"
                  >
                    <div className="text-pink-text text-sm min-w-0">
                      <div>
                        {getDisplayNameWithRatings(p)}
                        <span className="text-pink-accent ml-2 text-xs font-semibold">
                          seed #{seedById.get(p.id) ?? '—'}
                        </span>
                      </div>
                      <div className="text-pink-text-muted text-xs mt-1">
                        Signed up: {formatAdminSignedUpAt(p.createdAt)}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDelete(p.id)}
                      className="min-h-[36px] px-3 rounded-lg bg-red-100 text-red-600 text-sm font-medium hover:bg-red-200 shrink-0 self-start sm:self-center"
                    >
                      Delete
                    </button>
                  </li>
                ))
              )}
            </ul>
          </div>
          {poolSplit.waiting.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-pink-text mb-2">Waiting list</h3>
              <ul className="space-y-2 divide-y divide-pink-soft">
                {poolSplit.waiting.map((p, i) => (
                  <li
                    key={p.id}
                    className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between py-3"
                  >
                    <div className="text-pink-text-muted text-sm min-w-0">
                      <div>
                        WL #{i + 1} · {getDisplayNameWithRatings(p)}
                      </div>
                      <div className="text-pink-text-muted text-xs mt-1">
                        Signed up: {formatAdminSignedUpAt(p.createdAt)}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDelete(p.id)}
                      className="min-h-[36px] px-3 rounded-lg bg-red-100 text-red-600 text-sm font-medium hover:bg-red-200 shrink-0 self-start sm:self-center"
                    >
                      Delete
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        <section className="rounded-3xl bg-white shadow-card p-4 sm:p-6 border border-pink-soft/50">
          <div className="mb-4">
            <h2 className="font-display text-lg text-pink-text">Match results</h2>
          </div>
          {!draw ? (
            <p className="text-pink-text-muted text-sm">At least 2 {tab} participants needed for the draw</p>
          ) : (
            <div className="space-y-6">
              {[1, 2, 3, 4].filter((r) => draw.matches.some((m) => m.round === r)).map((round) => {
                const matches = draw.matches.filter((m) => m.round === round)
                return (
                  <div key={round}>
                    <h3 className="font-display text-sm text-pink-primary mb-3">{getRoundName(round, draw.rounds)}</h3>
                    <div className="space-y-2">
                      {matches.map((match) => {
                        const p1 = match.player1
                        const p2 = match.player2
                        const { winnerId, score } = getResult(match.id)
                        return (
                          <MatchResultRow
                            key={match.id}
                            match={match}
                            p1={p1}
                            p2={p2}
                            winnerId={winnerId}
                            score={score}
                            onSetResult={handleSetResult}
                            onClear={handleClearWinner}
                            saving={savingMatchId === match.id}
                            saved={savedMatchId === match.id}
                          />
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>
          </>
        )}
      </main>
    </div>
  )
}
