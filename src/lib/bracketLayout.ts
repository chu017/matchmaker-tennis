/**
 * Vertical tree layout + connector geometry for single-elimination bracket columns.
 * Match (round r, position p) is fed by (r-1, 2p) and (r-1, 2p+1).
 */
import type { Match, TournamentDraw } from './tournament'

export const BRACKET_SLOT_PX = 100
export const BRACKET_CARD_GAP = 12
export const BRACKET_CARD_HEIGHT = BRACKET_SLOT_PX - BRACKET_CARD_GAP

export type BracketLayout = {
  /** Top offset in px for each match id */
  topByMatchId: Map<string, number>
  /** Total column height in px */
  totalHeight: number
  cardHeight: number
  slotPitch: number
  /** Center Y for (round, position) */
  centerY: (round: number, position: number) => number | undefined
  matchesByRound: Record<number, Match[]>
  rounds: number
}

function sortMatchesByRound(draw: TournamentDraw): Record<number, Match[]> {
  const byRound: Record<number, Match[]> = {}
  for (const m of draw.matches) {
    if (!byRound[m.round]) byRound[m.round] = []
    byRound[m.round].push(m)
  }
  for (const k of Object.keys(byRound)) {
    byRound[+k].sort((a, b) => a.position - b.position)
  }
  return byRound
}

export function computeBracketLayout(draw: TournamentDraw): BracketLayout {
  const byRound = sortMatchesByRound(draw)
  const rounds = draw.rounds
  const r1 = byRound[1] ?? []
  const slotPitch = BRACKET_SLOT_PX
  const cardH = BRACKET_CARD_HEIGHT

  const centers: Record<number, Record<number, number>> = {}

  for (let i = 0; i < r1.length; i++) {
    if (!centers[1]) centers[1] = {}
    centers[1][i] = i * slotPitch + cardH / 2
  }

  for (let r = 2; r <= rounds; r++) {
    const list = byRound[r] ?? []
    for (const m of list) {
      const p = m.position
      const c0 = centers[r - 1]?.[p * 2]
      const c1 = centers[r - 1]?.[p * 2 + 1]
      if (!centers[r]) centers[r] = {}
      if (c0 != null && c1 != null) centers[r][p] = (c0 + c1) / 2
      else if (c0 != null) centers[r][p] = c0
      else if (c1 != null) centers[r][p] = c1
      else centers[r][p] = 0
    }
  }

  const totalHeight =
    r1.length > 0 ? (r1.length - 1) * slotPitch + cardH : Math.max(cardH, 80)

  const topByMatchId = new Map<string, number>()
  for (let r = 1; r <= rounds; r++) {
    for (const m of byRound[r] ?? []) {
      const cy = centers[r][m.position]
      topByMatchId.set(m.id, cy - cardH / 2)
    }
  }

  const centerY = (round: number, position: number) => centers[round]?.[position]

  return {
    topByMatchId,
    totalHeight,
    cardHeight: cardH,
    slotPitch,
    centerY,
    matchesByRound: byRound,
    rounds,
  }
}

export type ConnectorSegment = {
  d: string
  key: string
}

/** SVG path commands for H–V–H links from left round to right round (right = left + 1). */
export function buildConnectorPaths(
  layout: BracketLayout,
  leftRound: number,
  svgWidth: number,
  stemX: number
): ConnectorSegment[] {
  const rightRound = leftRound + 1
  const parents = layout.matchesByRound[rightRound] ?? []
  const segments: ConnectorSegment[] = []

  for (const m of parents) {
    const p = m.position
    const yA = layout.centerY(leftRound, p * 2)
    const yB = layout.centerY(leftRound, p * 2 + 1)
    const yP = layout.centerY(rightRound, p)
    if (yA == null || yB == null || yP == null) continue

    const x0 = 0
    const x1 = stemX
    const x2 = svgWidth

    // Horizontal out from left column, vertical rail, horizontal into right column
    const d = [
      `M ${x0} ${yA} L ${x1} ${yA}`,
      `M ${x0} ${yB} L ${x1} ${yB}`,
      `M ${x1} ${yA} L ${x1} ${yB}`,
      `M ${x1} ${yP} L ${x2} ${yP}`,
    ].join(' ')

    segments.push({ d, key: m.id })
  }

  return segments
}
