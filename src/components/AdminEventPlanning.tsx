import { useState, useEffect, useCallback } from 'react'
import type { TournamentDraw } from '../lib/tournament'
import { getRoundName } from '../lib/tournament'
import {
  fetchEventPlan,
  saveEventPlan,
  type EventPlan,
  type EventPlanChecklistItem,
  type EventPlanMatchSlot,
} from '../lib/adminApi'

const DEFAULT_CHECKLIST: EventPlanChecklistItem[] = [
  { id: 'c1', label: 'Reserve / confirm tennis courts (venue, date, hours)', done: false },
  { id: 'c2', label: 'Confirm fees, payment, and cancellation policy', done: false },
  { id: 'c3', label: 'Assign each bracket match to a court + time (table below)', done: false },
  { id: 'c4', label: 'Balls, water, shade, first aid basics', done: false },
  { id: 'c5', label: 'Player check-in + printed or on-screen bracket', done: false },
  { id: 'c6', label: 'Weather / rain backup plan', done: false },
]

function slotKey(type: 'singles' | 'doubles', matchId: string) {
  return `${type}:${matchId}`
}

function mergeChecklist(saved?: EventPlanChecklistItem[]): EventPlanChecklistItem[] {
  if (!saved?.length) return DEFAULT_CHECKLIST.map((c) => ({ ...c }))
  const byId = new Map(saved.map((c) => [c.id, c]))
  const merged: EventPlanChecklistItem[] = []
  for (const d of DEFAULT_CHECKLIST) {
    const s = byId.get(d.id)
    merged.push(s ? { ...d, done: s.done, label: s.label || d.label } : { ...d })
  }
  for (const c of saved) {
    if (!DEFAULT_CHECKLIST.some((d) => d.id === c.id)) merged.push({ ...c })
  }
  return merged
}

interface AdminEventPlanningProps {
  adminKey: string
  singlesDraw: TournamentDraw | null
  doublesDraw: TournamentDraw | null
  onError: (msg: string | null) => void
  doublesEnabled?: boolean
}

export function AdminEventPlanning({
  adminKey,
  singlesDraw,
  doublesDraw,
  onError,
  doublesEnabled = true,
}: AdminEventPlanningProps) {
  const [scheduleTab, setScheduleTab] = useState<'singles' | 'doubles'>('singles')

  useEffect(() => {
    if (!doublesEnabled && scheduleTab === 'doubles') setScheduleTab('singles')
  }, [doublesEnabled, scheduleTab])
  const [checklist, setChecklist] = useState<EventPlanChecklistItem[]>(() => mergeChecklist())
  const [courtRentalNotes, setCourtRentalNotes] = useState('')
  const [matchSlots, setMatchSlots] = useState<Record<string, EventPlanMatchSlot>>({})
  const [generalNotes, setGeneralNotes] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savedFlash, setSavedFlash] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    onError(null)
    try {
      const p = await fetchEventPlan(adminKey)
      setChecklist(mergeChecklist(p.checklist))
      setCourtRentalNotes(p.courtRentalNotes ?? '')
      setMatchSlots(p.matchSlots ?? {})
      setGeneralNotes(p.generalNotes ?? '')
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Failed to load event plan')
    } finally {
      setLoading(false)
    }
  }, [adminKey, onError])

  useEffect(() => {
    load()
  }, [load])

  const handleSave = async () => {
    setSaving(true)
    onError(null)
    setSavedFlash(false)
    try {
      const plan: EventPlan = {
        checklist,
        courtRentalNotes,
        matchSlots,
        generalNotes,
      }
      await saveEventPlan(plan, adminKey)
      setSavedFlash(true)
      setTimeout(() => setSavedFlash(false), 2000)
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Failed to save event plan')
    } finally {
      setSaving(false)
    }
  }

  const updateSlot = (key: string, field: keyof EventPlanMatchSlot, value: string) => {
    setMatchSlots((prev) => ({
      ...prev,
      [key]: { ...prev[key], [field]: value },
    }))
  }

  const draw = scheduleTab === 'singles' ? singlesDraw : doublesDraw
  const rounds = draw ? [...new Set(draw.matches.map((m) => m.round))].sort((a, b) => a - b) : []

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-pink-text-muted text-sm">
          Plan courts, times, and logistics. Saved on the server (admin only).
        </p>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || loading}
          className="min-h-[40px] px-4 rounded-xl bg-pink-primary text-white text-sm font-medium hover:opacity-95 disabled:opacity-50"
        >
          {saving ? 'Saving…' : savedFlash ? 'Saved!' : 'Save event plan'}
        </button>
      </div>

      {loading && <p className="text-pink-text-muted text-sm">Loading…</p>}

      <section className="rounded-3xl bg-white shadow-card p-4 sm:p-6 border border-pink-soft/50">
        <h2 className="font-display text-lg text-pink-text mb-3">Court rental & venue</h2>
        <textarea
          value={courtRentalNotes}
          onChange={(e) => setCourtRentalNotes(e.target.value)}
          placeholder="e.g. 3 courts at Golden Gate Park Tennis Center, Sat 9am–5pm, reservation #…, contact…"
          rows={4}
          className="w-full rounded-xl bg-pink-soft/40 border border-pink-soft px-3 py-2 text-sm text-pink-text placeholder-pink-text-muted"
        />
      </section>

      <section className="rounded-3xl bg-white shadow-card p-4 sm:p-6 border border-pink-soft/50">
        <h2 className="font-display text-lg text-pink-text mb-3">Organizer checklist</h2>
        <ul className="space-y-2">
          {checklist.map((item, idx) => (
            <li key={item.id} className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={item.done}
                onChange={(e) => {
                  const next = [...checklist]
                  next[idx] = { ...item, done: e.target.checked }
                  setChecklist(next)
                }}
                className="mt-1 accent-pink-primary"
              />
              <input
                type="text"
                value={item.label}
                onChange={(e) => {
                  const next = [...checklist]
                  next[idx] = { ...item, label: e.target.value }
                  setChecklist(next)
                }}
                className="flex-1 min-h-[36px] rounded-lg border border-pink-soft px-2 py-1 text-sm text-pink-text"
              />
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-3xl bg-white shadow-card p-4 sm:p-6 border border-pink-soft/50 overflow-x-auto">
        <h2 className="font-display text-lg text-pink-text mb-2">Match → court & time</h2>
        <p className="text-pink-text-muted text-xs mb-4">
          Rows follow your current bracket. Use Court (e.g. 1, A) and Time (e.g. 10:00) so players know where to go.
        </p>
        <div className="flex gap-2 mb-4">
          <button
            type="button"
            onClick={() => setScheduleTab('singles')}
            className={`min-h-[40px] px-3 rounded-full text-sm font-medium ${
              scheduleTab === 'singles' ? 'bg-pink-primary text-white' : 'bg-pink-soft/80 text-pink-text-muted'
            }`}
          >
            Singles draw
          </button>
          <button
            type="button"
            disabled={!doublesEnabled}
            onClick={() => doublesEnabled && setScheduleTab('doubles')}
            className={`min-h-[40px] px-3 rounded-full text-sm font-medium ${
              !doublesEnabled
                ? 'opacity-45 cursor-not-allowed bg-pink-soft/50 text-pink-text-muted'
                : scheduleTab === 'doubles'
                  ? 'bg-pink-primary text-white'
                  : 'bg-pink-soft/80 text-pink-text-muted'
            }`}
          >
            Doubles draw
          </button>
        </div>
        {!draw ? (
          <p className="text-pink-text-muted text-sm">Need at least 2 {scheduleTab} participants for a draw.</p>
        ) : (
          <div className="min-w-[640px]">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="text-left text-pink-text-muted border-b border-pink-soft">
                  <th className="py-2 pr-2">Round</th>
                  <th className="py-2 pr-2">Match</th>
                  <th className="py-2 pr-2">Players</th>
                  <th className="py-2 pr-2 w-20">Court</th>
                  <th className="py-2 pr-2 w-28">Time</th>
                  <th className="py-2">Notes</th>
                </tr>
              </thead>
              <tbody>
                {rounds.map((round) =>
                  draw.matches
                    .filter((m) => m.round === round)
                    .map((match) => {
                      const key = slotKey(scheduleTab, match.id)
                      const slot = matchSlots[key] ?? {}
                      const p1 = match.player1?.name ?? 'TBD'
                      const p2 = match.player2?.name ?? 'TBD'
                      const bye = match.isBye ? ' (Bye)' : ''
                      return (
                        <tr key={match.id} className="border-b border-pink-soft/60 align-top">
                          <td className="py-2 pr-2 text-pink-primary font-medium">{getRoundName(round, draw.rounds)}</td>
                          <td className="py-2 pr-2 text-pink-text-muted">#{match.position + 1}</td>
                          <td className="py-2 pr-2 text-pink-text">
                            {p1} vs {p2}
                            {bye}
                          </td>
                          <td className="py-2 pr-2">
                            <input
                              value={slot.court ?? ''}
                              onChange={(e) => updateSlot(key, 'court', e.target.value)}
                              placeholder="—"
                              className="w-full min-h-[32px] rounded border border-pink-soft px-1 text-pink-text"
                            />
                          </td>
                          <td className="py-2 pr-2">
                            <input
                              value={slot.time ?? ''}
                              onChange={(e) => updateSlot(key, 'time', e.target.value)}
                              placeholder="—"
                              className="w-full min-h-[32px] rounded border border-pink-soft px-1 text-pink-text"
                            />
                          </td>
                          <td className="py-2">
                            <input
                              value={slot.notes ?? ''}
                              onChange={(e) => updateSlot(key, 'notes', e.target.value)}
                              placeholder="Warm-up, umpire…"
                              className="w-full min-h-[32px] rounded border border-pink-soft px-1 text-pink-text"
                            />
                          </td>
                        </tr>
                      )
                    })
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-3xl bg-pink-soft/30 border border-pink-soft/50 p-4 sm:p-6">
        <h2 className="font-display text-lg text-pink-text mb-3">Tips for a smooth event</h2>
        <ul className="list-disc pl-5 space-y-2 text-sm text-pink-text-muted">
          <li>
            <strong className="text-pink-text">Parallel courts:</strong> Schedule first-round matches across courts at the same time if you have enough courts.
          </li>
          <li>
            <strong className="text-pink-text">Later rounds:</strong> Winners need rest — leave buffer between a player’s matches.
          </li>
          {doublesEnabled && (
            <li>
              <strong className="text-pink-text">Doubles vs singles:</strong> If both run the same day, stagger or use separate court blocks to avoid conflicts.
            </li>
          )}
          <li>
            <strong className="text-pink-text">Check-in:</strong> Arrive 15–30 min before first match; confirm names
            {doublesEnabled ? ' and format (singles/doubles)' : ' (singles event)'}.
          </li>
          <li>
            <strong className="text-pink-text">Public draw:</strong> Keep the main app open on a tablet/TV so everyone sees live results.
          </li>
        </ul>
      </section>

      <section className="rounded-3xl bg-white shadow-card p-4 sm:p-6 border border-pink-soft/50">
        <h2 className="font-display text-lg text-pink-text mb-3">General notes</h2>
        <textarea
          value={generalNotes}
          onChange={(e) => setGeneralNotes(e.target.value)}
          placeholder="Parking, food, prizes, volunteers, anything else…"
          rows={5}
          className="w-full rounded-xl bg-pink-soft/40 border border-pink-soft px-3 py-2 text-sm text-pink-text placeholder-pink-text-muted"
        />
      </section>
    </div>
  )
}
