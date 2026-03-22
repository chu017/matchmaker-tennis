/** First `maxInDraw` sign-ups (by createdAt) are in the bracket; rest are waiting. */

const MAX_DRAW_PLAYERS = 16;

export function splitPoolBySignupOrder(all, type, maxInDraw = MAX_DRAW_PLAYERS) {
  const pool = all
    .filter((p) => p.type === type)
    .sort((a, b) => {
      const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      if (ta !== tb) return ta - tb;
      return String(a.id).localeCompare(String(b.id));
    });
  return {
    inDraw: pool.slice(0, maxInDraw),
    waiting: pool.slice(maxInDraw),
  };
}

export function bracketStatusForParticipant(all, type, participantId) {
  const { inDraw } = splitPoolBySignupOrder(all, type);
  return inDraw.some((p) => p.id === participantId) ? 'draw' : 'waiting';
}
