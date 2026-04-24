/**
 * MiniMax API proxy - keeps API key server-side
 */
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import {
  getParticipants,
  addParticipant,
  updateParticipant,
  deleteParticipant,
  getMatchResults,
  setMatchResult,
  clearMatchResults,
  getEventPlan,
  setEventPlan,
  getBracketAdmin,
  setBracketAdmin,
  getStoreBackend,
} from './store.js';
import { getSupabaseHealth } from './supabaseHealth.js';
import { bracketStatusForParticipant } from './drawPool.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.set('trust proxy', 1);
const PORT = process.env.PORT || 3001;
const MINIMAX_API_KEY = process.env.MINIMAX_API_KEY;
const ADMIN_SECRET = process.env.ADMIN_SECRET;

/** Client IP for waiver audit (Render / proxies set X-Forwarded-For). */
function getClientIp(req) {
  const xf = req.headers['x-forwarded-for'];
  if (typeof xf === 'string' && xf.trim()) {
    return xf.split(',')[0].trim();
  }
  return req.ip || req.socket?.remoteAddress || null;
}

function requireAdmin(req, res, next) {
  const key = req.headers['x-admin-key'] || req.query?.adminKey;
  if (!ADMIN_SECRET || key !== ADMIN_SECRET) {
    return res.status(401).json({ error: 'Admin authentication required' });
  }
  next();
}

app.use(cors({ origin: true }));
app.use(express.json());

async function callMiniMax(messages, options = {}) {
  if (!MINIMAX_API_KEY) {
    throw new Error('MINIMAX_API_KEY not set. Add it to .env or environment.');
  }
  const res = await fetch('https://api.minimax.io/v1/text/chatcompletion_v2', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${MINIMAX_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'M2-her',
      messages,
      max_completion_tokens: options.maxTokens ?? 2048,
      temperature: options.temperature ?? 0.7,
    }),
  });
  const data = await res.json();
  if (data.base_resp?.status_code !== 0 && data.base_resp?.status_code !== undefined) {
    throw new Error(data.base_resp?.status_msg || `API error: ${data.base_resp?.status_code}`);
  }
  const content = data.choices?.[0]?.message?.content ?? '';
  return content;
}

// Chat completion (for Tournament Assistant)
app.post('/api/chat', async (req, res) => {
  try {
    const { messages } = req.body;
    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'messages array required' });
    }
    const content = await callMiniMax(messages);
    res.json({ content });
  } catch (err) {
    console.error('MiniMax chat error:', err);
    res.status(500).json({ error: err.message || 'MiniMax API error' });
  }
});

app.get('/api/health', async (_, res) => {
  const store = getStoreBackend();
  const database = await getSupabaseHealth();
  res.json({
    ok: true,
    hasKey: !!MINIMAX_API_KEY,
    store,
    database,
  });
});

app.get('/api/participants', async (_, res) => {
  try {
    const participants = await getParticipants();
    res.json({ participants });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/participants', async (req, res) => {
  try {
    const {
      name,
      rating,
      type,
      partnerName,
      partnerRating,
      gender,
      partnerGender,
      waiverAccepted,
      waiverVersion,
      waiverLegalName,
      wechatId,
    } = req.body;
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'name is required' });
    }
    if (gender !== 'male' && gender !== 'female') {
      return res.status(400).json({ error: 'gender (male or female) is required' });
    }
    const evtType = type === 'doubles' ? 'doubles' : 'singles';
    if (evtType === 'doubles' && partnerGender !== 'male' && partnerGender !== 'female') {
      return res.status(400).json({ error: 'partnerGender (male or female) is required for doubles' });
    }
    if (waiverAccepted !== true) {
      return res.status(400).json({ error: 'Waiver acceptance is required to register' });
    }
    const ua = req.get('user-agent');
    const participant = await addParticipant({
      name: name.trim(),
      rating: rating != null ? Number(rating) : 3.0,
      type: evtType,
      gender,
      partnerName: evtType === 'doubles' && partnerName ? String(partnerName).trim() : null,
      partnerRating: evtType === 'doubles' && partnerRating != null ? Number(partnerRating) : null,
      partnerGender: evtType === 'doubles' ? partnerGender : null,
      waiverAccepted: true,
      waiverAcceptedAt: new Date().toISOString(),
      waiverVersion:
        typeof waiverVersion === 'string' && waiverVersion.trim() ? waiverVersion.trim() : 'v1.0',
      waiverIp: getClientIp(req),
      waiverUserAgent: ua ? ua.slice(0, 2048) : null,
      waiverLegalName: String(waiverLegalName).trim(),
      wechatId: typeof wechatId === 'string' ? wechatId.trim() : null,
    });
    const all = await getParticipants();
    const bracketStatus = bracketStatusForParticipant(all, participant.type, participant.id);
    res.status(201).json({ ...participant, bracketStatus });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Public: get match results (read-only for display)
app.get('/api/match-results', async (_, res) => {
  try {
    res.json(await getMatchResults());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin: verify key
app.get('/api/admin/verify', (req, res) => {
  const key = req.headers['x-admin-key'] || req.query?.adminKey;
  if (!ADMIN_SECRET) {
    return res.status(503).json({ error: 'Admin not configured' });
  }
  if (key === ADMIN_SECRET) {
    return res.json({ ok: true });
  }
  res.status(401).json({ error: 'Invalid admin key' });
});

// Admin: delete participant
app.delete('/api/admin/participants/:id', requireAdmin, async (req, res) => {
  try {
    const removed = await deleteParticipant(req.params.id);
    if (!removed) {
      return res.status(404).json({ error: 'Participant not found' });
    }
    res.json({ deleted: removed });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

function clampNtrpRating(label, value) {
  const r = Number(value);
  if (!Number.isFinite(r)) {
    throw new Error(`${label} must be a number`);
  }
  if (r < 2 || r > 5.5) {
    throw new Error(`${label} must be between 2.0 and 5.5`);
  }
  return Math.round(r * 10) / 10;
}

/** Merge admin PATCH into a participant row and return fields to persist. */
function mergeParticipantAdminUpdate(current, body) {
  const b = body && typeof body === 'object' ? body : {};
  const next = { ...current };
  if (b.name !== undefined) {
    if (typeof b.name !== 'string' || !b.name.trim()) {
      throw new Error('name must be a non-empty string');
    }
    next.name = b.name.trim();
  }
  if (b.rating !== undefined) {
    next.rating = clampNtrpRating('rating', b.rating);
  }
  if (b.type !== undefined) {
    if (b.type !== 'singles' && b.type !== 'doubles') {
      throw new Error('type must be singles or doubles');
    }
    next.type = b.type;
  }
  if (b.gender !== undefined) {
    if (b.gender !== 'male' && b.gender !== 'female') {
      throw new Error('gender must be male or female');
    }
    next.gender = b.gender;
  }
  if (b.partnerName !== undefined) {
    next.partnerName = typeof b.partnerName === 'string' ? b.partnerName.trim() || null : null;
  }
  if (b.partnerRating !== undefined) {
    if (b.partnerRating === null || b.partnerRating === '') {
      next.partnerRating = null;
    } else {
      next.partnerRating = clampNtrpRating('partnerRating', b.partnerRating);
    }
  }
  if (b.partnerGender !== undefined) {
    if (b.partnerGender !== null && b.partnerGender !== 'male' && b.partnerGender !== 'female') {
      throw new Error('partnerGender must be male, female, or null');
    }
    next.partnerGender = b.partnerGender;
  }
  if (b.adminSeedRank !== undefined) {
    if (b.adminSeedRank === null || b.adminSeedRank === '') {
      next.adminSeedRank = null;
    } else {
      const s = Number(b.adminSeedRank);
      if (!Number.isInteger(s) || s < 1 || s > 64) {
        throw new Error('adminSeedRank must be an integer 1–64, or null/empty to use NTRP only');
      }
      next.adminSeedRank = s;
    }
  }
  if (b.adminBracketSlot !== undefined) {
    if (b.adminBracketSlot === null || b.adminBracketSlot === '') {
      next.adminBracketSlot = null;
    } else if (b.adminBracketSlot === 'draw' || b.adminBracketSlot === 'waiting') {
      next.adminBracketSlot = b.adminBracketSlot;
    } else {
      throw new Error('adminBracketSlot must be "draw", "waiting", or null');
    }
  }
  if (next.type === 'singles') {
    next.partnerName = null;
    next.partnerRating = null;
    next.partnerGender = null;
  } else if (next.type === 'doubles') {
    if (!next.partnerName?.trim()) {
      throw new Error('Doubles requires a partner name');
    }
    if (next.partnerGender !== 'male' && next.partnerGender !== 'female') {
      throw new Error('Doubles requires partner gender (male or female)');
    }
  }
  if (next.gender !== 'male' && next.gender !== 'female') {
    throw new Error('gender (male or female) is required');
  }
  return {
    name: next.name,
    rating: next.rating,
    type: next.type,
    gender: next.gender,
    partnerName: next.partnerName,
    partnerRating: next.partnerRating,
    partnerGender: next.partnerGender,
    adminSeedRank: next.adminSeedRank ?? null,
    adminBracketSlot: next.adminBracketSlot ?? null,
  };
}

// Admin: update participant (name, ratings, type, seed rank, etc.)
app.patch('/api/admin/participants/:id', requireAdmin, async (req, res) => {
  try {
    const all = await getParticipants();
    const current = all.find((p) => p.id === req.params.id);
    if (!current) {
      return res.status(404).json({ error: 'Participant not found' });
    }
    const patch = mergeParticipantAdminUpdate(current, req.body);
    const updated = await updateParticipant(req.params.id, patch);
    res.json({ participant: updated });
  } catch (err) {
    res.status(400).json({ error: err.message || 'Update failed' });
  }
});

// Admin: bracket display order (match list order in admin)
app.get('/api/admin/bracket-config', requireAdmin, async (_, res) => {
  try {
    res.json(await getBracketAdmin());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/admin/bracket-config', requireAdmin, async (req, res) => {
  try {
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const saved = await setBracketAdmin({
      matchDisplayOrder: {
        singles: body.matchDisplayOrder?.singles,
        doubles: body.matchDisplayOrder?.doubles,
      },
    });
    res.json(saved);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin: set match result (winner + optional score)
app.post('/api/admin/match-result', requireAdmin, (req, res) => {
  try {
    const { matchId, winnerId, type, score } = req.body;
    if (!matchId || !winnerId || !type) {
      return res.status(400).json({ error: 'matchId, winnerId, and type (singles|doubles) required' });
    }
    if (type !== 'singles' && type !== 'doubles') {
      return res.status(400).json({ error: 'type must be singles or doubles' });
    }
    setMatchResult(type, matchId, winnerId, score ?? null);
    res.json(getMatchResults());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin: clear match result (matchIds=cascade clears downstream too)
app.delete('/api/admin/match-result', requireAdmin, async (req, res) => {
  try {
    const matchIdsParam = req.query.matchIds;
    const matchId = req.query.matchId;
    const type = req.query.type;
    if (!type) {
      return res.status(400).json({ error: 'type (singles|doubles) required' });
    }
    if (type !== 'singles' && type !== 'doubles') {
      return res.status(400).json({ error: 'type must be singles or doubles' });
    }
    const ids = matchIdsParam
      ? matchIdsParam.split(',').map((s) => s.trim()).filter(Boolean)
      : (matchId ? [matchId] : []);
    if (ids.length === 0) {
      return res.status(400).json({ error: 'matchId or matchIds required' });
    }
    await clearMatchResults(type, ids);
    res.json(await getMatchResults());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin: event planning (courts, schedule, checklist)
app.get('/api/admin/event-plan', requireAdmin, async (_, res) => {
  try {
    const plan = await getEventPlan();
    res.json(plan ?? {});
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/event-plan', requireAdmin, async (req, res) => {
  try {
    const plan = req.body && typeof req.body === 'object' ? req.body : {};
    await setEventPlan(plan);
    res.json(plan);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Serve static frontend in production (after build)
const distPath = path.join(__dirname, '..', 'dist');
if (fs.existsSync(path.join(distPath, 'index.html'))) {
  app.use(express.static(distPath));
  // SPA fallback: only for paths without a file extension (e.g. /admin). If a static file
  // like /tennis.svg is missing from dist, return 404 instead of sending index.html — that
  // wrong MIME type breaks the browser tab icon and confuses clients.
  app.get('*', (req, res) => {
    if (path.extname(req.path)) {
      return res.status(404).type('text/plain').send('Not found');
    }
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Data store: ${getStoreBackend()} (${getStoreBackend() === 'supabase' ? 'participants, match_results, event_plan in Supabase' : 'server/*.json files'})`);
  if (!MINIMAX_API_KEY) console.warn('Warning: MINIMAX_API_KEY not set');
  if (!ADMIN_SECRET) console.warn('Warning: ADMIN_SECRET not set - admin endpoints disabled');
});
