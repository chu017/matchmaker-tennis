/**
 * JSON file storage (default when Supabase env vars are unset)
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_FILE = path.join(__dirname, 'participants.json');
const MATCH_RESULTS_FILE = path.join(__dirname, 'match-results.json');
const EVENT_PLAN_FILE = path.join(__dirname, 'event-plan.json');
const BRACKET_ADMIN_FILE = path.join(__dirname, 'bracket-admin.json');

function read() {
  try {
    const data = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(data);
  } catch {
    return { participants: [] };
  }
}

function write(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

function readMatchResults() {
  try {
    const data = fs.readFileSync(MATCH_RESULTS_FILE, 'utf8');
    return JSON.parse(data);
  } catch {
    return { singles: {}, doubles: {} };
  }
}

function writeMatchResults(data) {
  fs.writeFileSync(MATCH_RESULTS_FILE, JSON.stringify(data, null, 2));
}

export async function getParticipants() {
  const list = read().participants;
  // Stable pseudo signup time for legacy rows missing createdAt (preserves file order)
  const epoch = Date.parse('2020-01-01T00:00:00.000Z');
  return list.map((p, i) => ({
    ...p,
    createdAt: p.createdAt || new Date(epoch + i * 60_000).toISOString(),
    waiverAccepted: p.waiverAccepted ?? false,
    waiverAcceptedAt: p.waiverAcceptedAt ?? null,
    waiverVersion: p.waiverVersion ?? null,
    waiverIp: p.waiverIp ?? null,
    waiverUserAgent: p.waiverUserAgent ?? null,
    gender: p.gender ?? null,
    partnerGender: p.partnerGender ?? null,
    waiverLegalName: p.waiverLegalName ?? null,
    wechatId: p.wechatId ?? null,
    adminSeedRank:
      p.admin_seed_rank != null && Number.isFinite(Number(p.admin_seed_rank))
        ? Number(p.admin_seed_rank)
        : p.adminSeedRank != null && Number.isFinite(Number(p.adminSeedRank))
          ? Number(p.adminSeedRank)
          : null,
    adminBracketSlot:
      p.admin_bracket_slot === 'draw' || p.admin_bracket_slot === 'waiting'
        ? p.admin_bracket_slot
        : p.adminBracketSlot === 'draw' || p.adminBracketSlot === 'waiting'
          ? p.adminBracketSlot
          : null,
  }));
}

export async function addParticipant(participant) {
  const data = read();
  const id = crypto.randomUUID();
  const entry = {
    id,
    name: participant.name.trim(),
    rating: participant.rating ?? 3.0,
    type: participant.type || 'singles',
    partnerName: participant.partnerName?.trim() || null,
    partnerRating: participant.partnerRating != null ? participant.partnerRating : null,
    createdAt: new Date().toISOString(),
    waiverAccepted: participant.waiverAccepted === true,
    waiverAcceptedAt: participant.waiverAcceptedAt ?? null,
    waiverVersion: participant.waiverVersion ?? null,
    waiverIp: participant.waiverIp ?? null,
    waiverUserAgent: participant.waiverUserAgent ?? null,
    gender: participant.gender === 'female' || participant.gender === 'male' ? participant.gender : null,
    partnerGender:
      participant.partnerGender === 'female' || participant.partnerGender === 'male'
        ? participant.partnerGender
        : null,
    waiverLegalName: participant.waiverLegalName?.trim() || null,
    wechatId: participant.wechatId?.trim() || null,
    adminSeedRank: null,
    adminBracketSlot: null,
  };
  data.participants.push(entry);
  write(data);
  return entry;
}

export async function updateParticipant(id, patch) {
  const data = read();
  const idx = data.participants.findIndex((p) => p.id === id);
  if (idx === -1) return null;
  const cur = data.participants[idx];
  const next = { ...cur };
  if (patch.name !== undefined) next.name = patch.name;
  if (patch.rating !== undefined) next.rating = patch.rating;
  if (patch.type !== undefined) next.type = patch.type;
  if (patch.gender !== undefined) next.gender = patch.gender;
  if (patch.partnerName !== undefined) next.partnerName = patch.partnerName;
  if (patch.partnerRating !== undefined) next.partnerRating = patch.partnerRating;
  if (patch.partnerGender !== undefined) next.partnerGender = patch.partnerGender;
  if (patch.adminSeedRank !== undefined) {
    next.adminSeedRank = patch.adminSeedRank;
    delete next.admin_seed_rank;
  }
  if (patch.adminBracketSlot !== undefined) {
    next.adminBracketSlot = patch.adminBracketSlot;
    delete next.admin_bracket_slot;
  }
  data.participants[idx] = next;
  write(data);
  return (await getParticipants()).find((p) => p.id === id) ?? null;
}

export async function deleteParticipant(id) {
  const data = read();
  const idx = data.participants.findIndex((p) => p.id === id);
  if (idx === -1) return null;
  const [removed] = data.participants.splice(idx, 1);
  write(data);
  return removed;
}

export async function getMatchResults() {
  return readMatchResults();
}

export async function setMatchResult(type, matchId, winnerId, score = null) {
  const data = readMatchResults();
  const key = type === 'doubles' ? 'doubles' : 'singles';
  data[key][matchId] = { winnerId, score: score?.trim() || null };
  writeMatchResults(data);
  return data;
}

export async function clearMatchResult(type, matchId) {
  const data = readMatchResults();
  const key = type === 'doubles' ? 'doubles' : 'singles';
  delete data[key][matchId];
  writeMatchResults(data);
  return data;
}

export async function clearMatchResults(type, matchIds) {
  const data = readMatchResults();
  const key = type === 'doubles' ? 'doubles' : 'singles';
  for (const id of matchIds) {
    delete data[key][id];
  }
  writeMatchResults(data);
  return data;
}

function readEventPlan() {
  try {
    const raw = fs.readFileSync(EVENT_PLAN_FILE, 'utf8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function writeEventPlan(data) {
  fs.writeFileSync(EVENT_PLAN_FILE, JSON.stringify(data, null, 2));
}

export async function getEventPlan() {
  return readEventPlan();
}

export async function setEventPlan(plan) {
  writeEventPlan(plan);
  return plan;
}

function normalizeOrderMap(o) {
  if (!o || typeof o !== 'object' || Array.isArray(o)) return {};
  const out = {};
  for (const [k, v] of Object.entries(o)) {
    const n = Number(v);
    if (Number.isFinite(n)) out[k] = n;
  }
  return out;
}

function readBracketAdminRaw() {
  try {
    const raw = fs.readFileSync(BRACKET_ADMIN_FILE, 'utf8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function getBracketAdmin() {
  const j = readBracketAdminRaw();
  const mod = j?.matchDisplayOrder;
  return {
    matchDisplayOrder: {
      singles: normalizeOrderMap(mod?.singles),
      doubles: normalizeOrderMap(mod?.doubles),
    },
  };
}

export async function setBracketAdmin(config) {
  const matchDisplayOrder = {
    singles: normalizeOrderMap(config?.matchDisplayOrder?.singles),
    doubles: normalizeOrderMap(config?.matchDisplayOrder?.doubles),
  };
  fs.writeFileSync(BRACKET_ADMIN_FILE, JSON.stringify({ matchDisplayOrder }, null, 2));
  return getBracketAdmin();
}
