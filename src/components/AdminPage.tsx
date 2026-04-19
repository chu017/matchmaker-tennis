import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
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
  sortMatchesByDisplayOrder,
  type Participant,
} from '../lib/tournament'
import { formatParticipantDrawInline } from '../lib/drawDisplay'
import {
  verifyAdminKey,
  deleteParticipant,
  setMatchResult,
  clearMatchResult,
  updateParticipantAdmin,
  patchParticipantBracketSlot,
  fetchBracketAdminConfig,
  saveBracketAdminConfig,
  type BracketAdminConfig,
} from '../lib/adminApi'
import { AdminEventPlanning } from './AdminEventPlanning'
import { DOUBLES_ENABLED } from '../lib/featureFlags'
import { splitPoolBySignupOrder, formatAdminSignedUpAt } from '../lib/drawPool'

const ADMIN_KEY_STORAGE = 'sf-tennis-admin-key'

const NTRP_LEVELS = [2.5, 3.0, 3.5, 4.0, 4.5] as const

function storedToAdminPayload(p: StoredParticipant) {
  if (p.gender !== 'male' && p.gender !== 'female') {
    throw new Error(`${p.name || 'Player'}: set gender (male/female) before saving`)
  }
  return {
    name: p.name.trim(),
    rating: p.rating,
    type: p.type,
    gender: p.gender,
    partnerName: p.type === 'doubles' ? p.partnerName?.trim() || null : null,
    partnerRating: p.type === 'doubles' ? p.partnerRating ?? null : null,
    partnerGender: p.type === 'doubles' ? p.partnerGender ?? null : null,
    adminSeedRank: p.adminSeedRank != null && p.adminSeedRank > 0 ? p.adminSeedRank : null,
    adminBracketSlot:
      p.adminBracketSlot === 'draw' || p.adminBracketSlot === 'waiting' ? p.adminBracketSlot : null,
  }
}

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
  displayOrderValue?: number
  onDisplayOrderChange?: (matchId: string, value: string) => void
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

function MatchResultRow({
  match,
  p1,
  p2,
  winnerId,
  score,
  onSetResult,
  onClear,
  saving,
  saved,
  displayOrderValue,
  onDisplayOrderChange,
}: MatchResultRowProps) {
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
      {onDisplayOrderChange !== undefined && displayOrderValue !== undefined && (
        <label className="flex items-center gap-1 text-xs text-pink-text-muted shrink-0" title="Display order in this list (lower = earlier)">
          <span className="sr-only">Order</span>
          #
          <input
            type="number"
            min={0}
            max={99}
            value={displayOrderValue}
            onChange={(e) => onDisplayOrderChange(match.id, e.target.value)}
            className="w-11 h-8 text-center rounded bg-white border border-pink-soft text-pink-text text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
        </label>
      )}
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
  const [tab, setTab] = useState<'singles' | 'doubles'>('singles')
  const [adminSection, setAdminSection] = useState<'draw' | 'planning'>('draw')
  const [savingMatchId, setSavingMatchId] = useState<string | null>(null)
  const [savedMatchId, setSavedMatchId] = useState<string | null>(null)
  const [participantDrafts, setParticipantDrafts] = useState<Record<string, StoredParticipant>>({})
  const [matchDisplayOrder, setMatchDisplayOrder] = useState<{
    singles: Record<string, number>
    doubles: Record<string, number>
  }>({ singles: {}, doubles: {} })
  const [adminEditsDirty, setAdminEditsDirty] = useState(false)
  const [savingBracketEdits, setSavingBracketEdits] = useState(false)
  const [bracketSlotMovingId, setBracketSlotMovingId] = useState<string | null>(null)
  const adminEditsDirtyRef = useRef(false)

  useEffect(() => {
    adminEditsDirtyRef.current = adminEditsDirty
  }, [adminEditsDirty])

  const loadData = useCallback(
    async (force = false) => {
      if (adminEditsDirtyRef.current && !force) return
      try {
        const key = adminKey.trim()
        const [data, resultsRaw] = await Promise.all([fetchParticipants(), fetchMatchResults()])
        setParticipants(data)
        const results = normalizeMatchResults(resultsRaw)
        setMatchResults(results)
        let bracketCfg: BracketAdminConfig = { matchDisplayOrder: { singles: {}, doubles: {} } }
        if (key) {
          try {
            bracketCfg = await fetchBracketAdminConfig(key)
          } catch {
            /* Bracket order is optional; don’t wipe participants if this endpoint or DB row is missing. */
          }
        }
        setMatchDisplayOrder(bracketCfg.matchDisplayOrder)
        setParticipantDrafts({})
        setAdminEditsDirty(false)
      } catch {
        setParticipants([])
        setMatchResults({ singles: {}, doubles: {} })
        setMatchDisplayOrder({ singles: {}, doubles: {} })
        setParticipantDrafts({})
        setAdminEditsDirty(false)
      }
    },
    [adminKey],
  )

  useEffect(() => {
    if (verified) void loadData(false)
  }, [verified, loadData])

  useEffect(() => {
    if (!DOUBLES_ENABLED && tab === 'doubles') setTab('singles')
  }, [tab])

  useEffect(() => {
    if (!verified) return
    const id = setInterval(() => void loadData(false), 3000)
    return () => clearInterval(id)
  }, [verified, loadData])

  const effectiveParticipants = useMemo(
    () => participants.map((p) => participantDrafts[p.id] ?? p),
    [participants, participantDrafts],
  )

  const singlesDraw = useMemo(() => {
    const singlesInDraw = splitPoolBySignupOrder(effectiveParticipants, 'singles').inDraw
    if (singlesInDraw.length < 2) return null
    const sp = toTournamentParticipants(singlesInDraw)
    return applyMatchResults(generateDraw(sp), matchResults.singles)
  }, [effectiveParticipants, matchResults.singles])

  const doublesDraw = useMemo(() => {
    if (!DOUBLES_ENABLED) return null
    const doublesInDraw = splitPoolBySignupOrder(effectiveParticipants, 'doubles').inDraw
    if (doublesInDraw.length < 2) return null
    const dp = toTournamentParticipants(doublesInDraw)
    return applyMatchResults(generateDraw(dp), matchResults.doubles)
  }, [effectiveParticipants, matchResults.doubles])

  const mergeParticipantDraft = (id: string, partial: Partial<StoredParticipant>) => {
    setParticipantDrafts((prev) => {
      const base = participants.find((x) => x.id === id)
      if (!base) return prev
      const cur = prev[id] ?? base
      return { ...prev, [id]: { ...cur, ...partial } }
    })
    setAdminEditsDirty(true)
  }

  const handleMatchDisplayOrderChange = (matchId: string, value: string) => {
    setMatchDisplayOrder((prev) => {
      const nextTab = { ...prev[tab] }
      if (value.trim() === '') {
        delete nextTab[matchId]
      } else {
        const n = parseInt(value, 10)
        if (Number.isFinite(n)) nextTab[matchId] = n
      }
      return { ...prev, [tab]: nextTab }
    })
    setAdminEditsDirty(true)
  }

  const handleSaveBracketEdits = async () => {
    if (!verified || !adminKey.trim()) return
    setError(null)
    setSavingBracketEdits(true)
    try {
      for (const id of Object.keys(participantDrafts)) {
        const p = participantDrafts[id]
        await updateParticipantAdmin(id, storedToAdminPayload(p), adminKey.trim())
      }
      await saveBracketAdminConfig({ matchDisplayOrder }, adminKey.trim())
      setParticipantDrafts({})
      setAdminEditsDirty(false)
      await loadData(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSavingBracketEdits(false)
    }
  }

  const handleBracketSlotMove = async (id: string, slot: 'draw' | 'waiting' | null) => {
    if (!verified || !adminKey.trim()) return
    setError(null)
    setBracketSlotMovingId(id)
    try {
      await patchParticipantBracketSlot(id, slot, adminKey.trim())
      await loadData(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update draw / waiting status')
    } finally {
      setBracketSlotMovingId(null)
    }
  }

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
      await loadData(true)
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
      await loadData(true)
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
      await loadData(true)
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
  const poolSplit = splitPoolBySignupOrder(effectiveParticipants, tab)
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

        {adminEditsDirty && adminSection === 'draw' && (
          <div className="rounded-xl border border-amber-200 bg-amber-50/90 px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <p className="text-sm text-amber-950">
              You have unsaved bracket edits. Live refresh is paused until you save or discard by refreshing.
            </p>
            <button
              type="button"
              onClick={() => void handleSaveBracketEdits()}
              disabled={savingBracketEdits}
              className="min-h-[40px] px-5 rounded-full bg-pink-primary text-white text-sm font-medium hover:opacity-95 disabled:opacity-50 shrink-0"
            >
              {savingBracketEdits ? 'Saving…' : 'Save bracket edits'}
            </button>
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
          <h2 className="font-display text-lg text-pink-text">Participants &amp; seeding</h2>
          <p className="text-pink-text-muted text-xs">
            By default the main draw is the first 16 sign-ups (by time). Use <strong>Move to waiting list</strong> /{' '}
            <strong>Promote to main draw</strong> (saved immediately) to override that. Edit other fields and use{' '}
            <strong>Save bracket edits</strong>. <strong>Clear slot override</strong> returns placement to signup order.
            Manual seed overrides NTRP for bracket order. Match list <strong>#</strong> is display order only. Gender is
            required before save (legacy rows: pick male/female).
          </p>
          <div>
            <h3 className="text-sm font-semibold text-pink-text mb-2">Main draw</h3>
            <ul className="space-y-4 divide-y divide-pink-soft">
              {poolSplit.inDraw.length === 0 ? (
                <li className="text-pink-text-muted text-sm py-2">No {tab} entrants</li>
              ) : (
                poolSplit.inDraw.map((p) => {
                  const ratingChoices: number[] = [...NTRP_LEVELS]
                  if (!ratingChoices.some((x) => Math.abs(x - p.rating) < 0.001)) {
                    ratingChoices.push(p.rating)
                    ratingChoices.sort((a, b) => a - b)
                  }
                  return (
                    <li key={p.id} className="flex flex-col gap-3 py-4">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="flex flex-col gap-1 min-w-0">
                          <span className="text-pink-accent text-xs font-semibold">
                            Bracket seed #{seedById.get(p.id) ?? '—'}
                          </span>
                          {(p.adminBracketSlot === 'draw' || p.adminBracketSlot === 'waiting') && (
                            <span className="text-pink-text-muted text-[11px]">
                              Slot override:{' '}
                              <strong>{p.adminBracketSlot === 'draw' ? 'main draw' : 'waiting'}</strong>
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-2 justify-end shrink-0">
                          <button
                            type="button"
                            disabled={bracketSlotMovingId === p.id}
                            onClick={() => void handleBracketSlotMove(p.id, 'waiting')}
                            className="min-h-[36px] px-3 rounded-lg bg-pink-soft/90 text-pink-text text-sm font-medium hover:bg-pink-muted/60 disabled:opacity-50"
                          >
                            {bracketSlotMovingId === p.id ? '…' : 'Move to waiting list'}
                          </button>
                          {(p.adminBracketSlot === 'draw' || p.adminBracketSlot === 'waiting') && (
                            <button
                              type="button"
                              disabled={bracketSlotMovingId === p.id}
                              onClick={() => void handleBracketSlotMove(p.id, null)}
                              className="min-h-[36px] px-3 rounded-lg bg-white border border-pink-soft text-pink-text-muted text-sm hover:bg-pink-soft/40 disabled:opacity-50"
                            >
                              Clear slot override
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleDelete(p.id)}
                            className="min-h-[36px] px-3 rounded-lg bg-red-100 text-red-600 text-sm font-medium hover:bg-red-200"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                        <label className="block min-w-0">
                          <span className="text-pink-text-muted text-xs">Name</span>
                          <input
                            type="text"
                            value={p.name}
                            onChange={(e) => mergeParticipantDraft(p.id, { name: e.target.value })}
                            className="mt-1 w-full min-h-[40px] px-3 rounded-lg border border-pink-soft bg-white text-pink-text"
                          />
                        </label>
                        <label className="block min-w-0">
                          <span className="text-pink-text-muted text-xs">NTRP</span>
                          <select
                            value={p.rating}
                            onChange={(e) => mergeParticipantDraft(p.id, { rating: parseFloat(e.target.value) })}
                            className="mt-1 w-full min-h-[40px] px-3 rounded-lg border border-pink-soft bg-white text-pink-text"
                          >
                            {ratingChoices.map((r) => (
                              <option key={r} value={r}>
                                {r.toFixed(1)}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="block min-w-0">
                          <span className="text-pink-text-muted text-xs">Manual seed (optional)</span>
                          <input
                            type="number"
                            min={1}
                            max={32}
                            placeholder="Auto (NTRP)"
                            value={p.adminSeedRank != null && p.adminSeedRank > 0 ? p.adminSeedRank : ''}
                            onChange={(e) => {
                              const v = e.target.value
                              if (v === '') mergeParticipantDraft(p.id, { adminSeedRank: null })
                              else mergeParticipantDraft(p.id, { adminSeedRank: parseInt(v, 10) })
                            }}
                            className="mt-1 w-full min-h-[40px] px-3 rounded-lg border border-pink-soft bg-white text-pink-text [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                        </label>
                        <label className="block min-w-0">
                          <span className="text-pink-text-muted text-xs">Gender</span>
                          <select
                            value={p.gender === 'female' || p.gender === 'male' ? p.gender : ''}
                            onChange={(e) =>
                              mergeParticipantDraft(p.id, {
                                gender: e.target.value === 'male' || e.target.value === 'female' ? e.target.value : null,
                              })
                            }
                            className="mt-1 w-full min-h-[40px] px-3 rounded-lg border border-pink-soft bg-white text-pink-text"
                          >
                            <option value="">—</option>
                            <option value="male">Male</option>
                            <option value="female">Female</option>
                          </select>
                        </label>
                        <label className="block min-w-0 sm:col-span-2">
                          <span className="text-pink-text-muted text-xs">Format</span>
                          <select
                            value={p.type}
                            onChange={(e) => {
                              const t = e.target.value === 'doubles' ? 'doubles' : 'singles'
                              if (t === 'singles') {
                                mergeParticipantDraft(p.id, {
                                  type: 'singles',
                                  partnerName: null,
                                  partnerRating: null,
                                  partnerGender: null,
                                  adminBracketSlot: null,
                                })
                              } else {
                                mergeParticipantDraft(p.id, {
                                  type: 'doubles',
                                  partnerName: p.partnerName || '',
                                  partnerRating: p.partnerRating ?? 3.0,
                                  partnerGender:
                                    p.partnerGender === 'male' || p.partnerGender === 'female' ? p.partnerGender : 'male',
                                  adminBracketSlot: null,
                                })
                              }
                            }}
                            className="mt-1 w-full min-h-[40px] px-3 rounded-lg border border-pink-soft bg-white text-pink-text"
                          >
                            <option value="singles">Singles</option>
                            <option value="doubles">Doubles</option>
                          </select>
                        </label>
                        {p.type === 'doubles' && (
                          <>
                            <label className="block min-w-0 sm:col-span-2">
                              <span className="text-pink-text-muted text-xs">Partner name</span>
                              <input
                                type="text"
                                value={p.partnerName || ''}
                                onChange={(e) => mergeParticipantDraft(p.id, { partnerName: e.target.value })}
                                className="mt-1 w-full min-h-[40px] px-3 rounded-lg border border-pink-soft bg-white text-pink-text"
                              />
                            </label>
                            <label className="block min-w-0">
                              <span className="text-pink-text-muted text-xs">Partner NTRP</span>
                              <select
                                value={p.partnerRating ?? 3.0}
                                onChange={(e) =>
                                  mergeParticipantDraft(p.id, { partnerRating: parseFloat(e.target.value) })
                                }
                                className="mt-1 w-full min-h-[40px] px-3 rounded-lg border border-pink-soft bg-white text-pink-text"
                              >
                                {NTRP_LEVELS.map((r) => (
                                  <option key={r} value={r}>
                                    {r.toFixed(1)}
                                  </option>
                                ))}
                              </select>
                            </label>
                            <label className="block min-w-0">
                              <span className="text-pink-text-muted text-xs">Partner gender</span>
                              <select
                                value={p.partnerGender === 'female' || p.partnerGender === 'male' ? p.partnerGender : ''}
                                onChange={(e) =>
                                  mergeParticipantDraft(p.id, {
                                    partnerGender:
                                      e.target.value === 'male' || e.target.value === 'female' ? e.target.value : null,
                                  })
                                }
                                className="mt-1 w-full min-h-[40px] px-3 rounded-lg border border-pink-soft bg-white text-pink-text"
                              >
                                <option value="">—</option>
                                <option value="male">Male</option>
                                <option value="female">Female</option>
                              </select>
                            </label>
                          </>
                        )}
                      </div>
                      <div className="text-pink-text-muted text-xs">
                        Signed up: {formatAdminSignedUpAt(p.createdAt)}
                      </div>
                    </li>
                  )
                })
              )}
            </ul>
          </div>
          {poolSplit.waiting.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-pink-text mb-2">Waiting list</h3>
              <ul className="space-y-4 divide-y divide-pink-soft">
                {poolSplit.waiting.map((p, i) => {
                  const ratingChoices: number[] = [...NTRP_LEVELS]
                  if (!ratingChoices.some((x) => Math.abs(x - p.rating) < 0.001)) {
                    ratingChoices.push(p.rating)
                    ratingChoices.sort((a, b) => a - b)
                  }
                  return (
                    <li key={p.id} className="flex flex-col gap-3 py-4">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="flex flex-col gap-1 min-w-0">
                          <span className="text-pink-text-muted text-xs font-medium">WL #{i + 1}</span>
                          {(p.adminBracketSlot === 'draw' || p.adminBracketSlot === 'waiting') && (
                            <span className="text-pink-text-muted text-[11px]">
                              Slot override:{' '}
                              <strong>{p.adminBracketSlot === 'draw' ? 'main draw' : 'waiting'}</strong>
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-2 justify-end shrink-0">
                          <button
                            type="button"
                            disabled={bracketSlotMovingId === p.id}
                            onClick={() => void handleBracketSlotMove(p.id, 'draw')}
                            className="min-h-[36px] px-3 rounded-lg bg-pink-primary text-white text-sm font-medium hover:opacity-95 disabled:opacity-50"
                          >
                            {bracketSlotMovingId === p.id ? '…' : 'Promote to main draw'}
                          </button>
                          {(p.adminBracketSlot === 'draw' || p.adminBracketSlot === 'waiting') && (
                            <button
                              type="button"
                              disabled={bracketSlotMovingId === p.id}
                              onClick={() => void handleBracketSlotMove(p.id, null)}
                              className="min-h-[36px] px-3 rounded-lg bg-white border border-pink-soft text-pink-text-muted text-sm hover:bg-pink-soft/40 disabled:opacity-50"
                            >
                              Clear slot override
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleDelete(p.id)}
                            className="min-h-[36px] px-3 rounded-lg bg-red-100 text-red-600 text-sm font-medium hover:bg-red-200"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                        <label className="block min-w-0">
                          <span className="text-pink-text-muted text-xs">Name</span>
                          <input
                            type="text"
                            value={p.name}
                            onChange={(e) => mergeParticipantDraft(p.id, { name: e.target.value })}
                            className="mt-1 w-full min-h-[40px] px-3 rounded-lg border border-pink-soft bg-white text-pink-text"
                          />
                        </label>
                        <label className="block min-w-0">
                          <span className="text-pink-text-muted text-xs">NTRP</span>
                          <select
                            value={p.rating}
                            onChange={(e) => mergeParticipantDraft(p.id, { rating: parseFloat(e.target.value) })}
                            className="mt-1 w-full min-h-[40px] px-3 rounded-lg border border-pink-soft bg-white text-pink-text"
                          >
                            {ratingChoices.map((r) => (
                              <option key={r} value={r}>
                                {r.toFixed(1)}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="block min-w-0">
                          <span className="text-pink-text-muted text-xs">Gender</span>
                          <select
                            value={p.gender === 'female' || p.gender === 'male' ? p.gender : ''}
                            onChange={(e) =>
                              mergeParticipantDraft(p.id, {
                                gender: e.target.value === 'male' || e.target.value === 'female' ? e.target.value : null,
                              })
                            }
                            className="mt-1 w-full min-h-[40px] px-3 rounded-lg border border-pink-soft bg-white text-pink-text"
                          >
                            <option value="">—</option>
                            <option value="male">Male</option>
                            <option value="female">Female</option>
                          </select>
                        </label>
                        <label className="block min-w-0 sm:col-span-2">
                          <span className="text-pink-text-muted text-xs">Format</span>
                          <select
                            value={p.type}
                            onChange={(e) => {
                              const t = e.target.value === 'doubles' ? 'doubles' : 'singles'
                              if (t === 'singles') {
                                mergeParticipantDraft(p.id, {
                                  type: 'singles',
                                  partnerName: null,
                                  partnerRating: null,
                                  partnerGender: null,
                                  adminBracketSlot: null,
                                })
                              } else {
                                mergeParticipantDraft(p.id, {
                                  type: 'doubles',
                                  partnerName: p.partnerName || '',
                                  partnerRating: p.partnerRating ?? 3.0,
                                  partnerGender:
                                    p.partnerGender === 'male' || p.partnerGender === 'female' ? p.partnerGender : 'male',
                                  adminBracketSlot: null,
                                })
                              }
                            }}
                            className="mt-1 w-full min-h-[40px] px-3 rounded-lg border border-pink-soft bg-white text-pink-text"
                          >
                            <option value="singles">Singles</option>
                            <option value="doubles">Doubles</option>
                          </select>
                        </label>
                        {p.type === 'doubles' && (
                          <>
                            <label className="block min-w-0 sm:col-span-2">
                              <span className="text-pink-text-muted text-xs">Partner name</span>
                              <input
                                type="text"
                                value={p.partnerName || ''}
                                onChange={(e) => mergeParticipantDraft(p.id, { partnerName: e.target.value })}
                                className="mt-1 w-full min-h-[40px] px-3 rounded-lg border border-pink-soft bg-white text-pink-text"
                              />
                            </label>
                            <label className="block min-w-0">
                              <span className="text-pink-text-muted text-xs">Partner NTRP</span>
                              <select
                                value={p.partnerRating ?? 3.0}
                                onChange={(e) =>
                                  mergeParticipantDraft(p.id, { partnerRating: parseFloat(e.target.value) })
                                }
                                className="mt-1 w-full min-h-[40px] px-3 rounded-lg border border-pink-soft bg-white text-pink-text"
                              >
                                {NTRP_LEVELS.map((r) => (
                                  <option key={r} value={r}>
                                    {r.toFixed(1)}
                                  </option>
                                ))}
                              </select>
                            </label>
                            <label className="block min-w-0">
                              <span className="text-pink-text-muted text-xs">Partner gender</span>
                              <select
                                value={p.partnerGender === 'female' || p.partnerGender === 'male' ? p.partnerGender : ''}
                                onChange={(e) =>
                                  mergeParticipantDraft(p.id, {
                                    partnerGender:
                                      e.target.value === 'male' || e.target.value === 'female' ? e.target.value : null,
                                  })
                                }
                                className="mt-1 w-full min-h-[40px] px-3 rounded-lg border border-pink-soft bg-white text-pink-text"
                              >
                                <option value="">—</option>
                                <option value="male">Male</option>
                                <option value="female">Female</option>
                              </select>
                            </label>
                          </>
                        )}
                      </div>
                      <div className="text-pink-text-muted text-xs">
                        Signed up: {formatAdminSignedUpAt(p.createdAt)}
                      </div>
                    </li>
                  )
                })}
              </ul>
            </div>
          )}
        </section>

        <section className="rounded-3xl bg-white shadow-card p-4 sm:p-6 border border-pink-soft/50">
          <div className="mb-4">
            <h2 className="font-display text-lg text-pink-text">Match results</h2>
            <p className="text-pink-text-muted text-xs mt-1">
              Use <strong>#</strong> to reorder rows in this admin list (lower plays earlier on your run-of-show).
            </p>
          </div>
          {!draw ? (
            <p className="text-pink-text-muted text-sm">At least 2 {tab} participants needed for the draw</p>
          ) : (
            <div className="space-y-6">
              {[1, 2, 3, 4].filter((r) => draw.matches.some((m) => m.round === r)).map((round) => {
                const orderMap = matchDisplayOrder[tab]
                const matches = sortMatchesByDisplayOrder(
                  draw.matches.filter((m) => m.round === round),
                  orderMap,
                )
                return (
                  <div key={round}>
                    <h3 className="font-display text-sm text-pink-primary mb-3">{getRoundName(round, draw.rounds)}</h3>
                    <div className="space-y-2">
                      {matches.map((match) => {
                        const p1 = match.player1
                        const p2 = match.player2
                        const { winnerId, score } = getResult(match.id)
                        const displayOrderValue =
                          orderMap[match.id] !== undefined ? orderMap[match.id] : match.position
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
                            displayOrderValue={displayOrderValue}
                            onDisplayOrderChange={handleMatchDisplayOrderChange}
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
