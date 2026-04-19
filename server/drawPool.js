/** First `maxInDraw` sign-ups (by createdAt) are in the bracket; rest are waiting.
 * Optional `adminBracketSlot`: `'draw'` = always in main draw (up to cap), `'waiting'` = always waiting,
 * otherwise signup order among “neutral” players fills remaining main-draw slots. */

const MAX_DRAW_PLAYERS = 16;

function compareSignupOrder(a, b) {
  const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
  const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
  if (ta !== tb) return ta - tb;
  return String(a.id).localeCompare(String(b.id));
}

export function splitPoolBySignupOrder(all, type, maxInDraw = MAX_DRAW_PLAYERS) {
  const pool = all
    .filter((p) => p.type === type)
    .sort(compareSignupOrder);

  const forcedWaiting = pool.filter((p) => p.adminBracketSlot === 'waiting');
  const forcedDraw = pool.filter((p) => p.adminBracketSlot === 'draw');
  const neutral = pool.filter(
    (p) => p.adminBracketSlot !== 'waiting' && p.adminBracketSlot !== 'draw',
  );

  const forcedDrawSorted = [...forcedDraw].sort(compareSignupOrder);
  const inDrawForced = forcedDrawSorted.slice(0, maxInDraw);
  const forcedDrawOverflow = forcedDrawSorted.slice(maxInDraw);

  const slotsLeft = maxInDraw - inDrawForced.length;
  const neutralSorted = [...neutral].sort(compareSignupOrder);
  const neutralInDraw = slotsLeft > 0 ? neutralSorted.slice(0, slotsLeft) : [];
  const neutralWaiting = slotsLeft > 0 ? neutralSorted.slice(slotsLeft) : [...neutralSorted];

  const inDraw = [...inDrawForced, ...neutralInDraw].sort(compareSignupOrder);
  const waiting = [...forcedWaiting, ...neutralWaiting, ...forcedDrawOverflow].sort(compareSignupOrder);

  return { inDraw, waiting };
}

export function bracketStatusForParticipant(all, type, participantId) {
  const { inDraw } = splitPoolBySignupOrder(all, type);
  return inDraw.some((p) => p.id === participantId) ? 'draw' : 'waiting';
}
