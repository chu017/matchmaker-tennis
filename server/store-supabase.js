/**
 * Supabase (Postgres) storage when SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY are set
 */
import { createClient } from '@supabase/supabase-js';

let _client;

function getClient() {
  if (!_client) {
    const url = process.env.SUPABASE_URL?.trim();
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
    if (!url || !key) {
      throw new Error('Supabase env vars missing');
    }
    _client = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return _client;
}

function rowToParticipant(row) {
  return {
    id: row.id,
    name: row.name,
    rating: row.rating != null ? Number(row.rating) : 3.0,
    type: row.type,
    partnerName: row.partner_name ?? null,
    partnerRating: row.partner_rating != null ? Number(row.partner_rating) : null,
    createdAt: row.created_at,
    waiverAccepted: row.waiver_accepted ?? false,
    waiverAcceptedAt: row.waiver_accepted_at ?? null,
    waiverVersion: row.waiver_version ?? null,
    waiverIp: row.waiver_ip ?? null,
    waiverUserAgent: row.waiver_user_agent ?? null,
    gender: row.gender ?? null,
    partnerGender: row.partner_gender ?? null,
    waiverLegalName: row.waiver_legal_name ?? null,
    wechatId: row.wechat_id ?? null,
    adminSeedRank:
      row.admin_seed_rank != null && Number.isFinite(Number(row.admin_seed_rank))
        ? Number(row.admin_seed_rank)
        : null,
    adminBracketSlot:
      row.admin_bracket_slot === 'draw' || row.admin_bracket_slot === 'waiting'
        ? row.admin_bracket_slot
        : null,
  };
}

export async function getParticipants() {
  const { data, error } = await getClient()
    .from('participants')
    .select('*')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data || []).map(rowToParticipant);
}

export async function addParticipant(participant) {
  const id = crypto.randomUUID();
  const row = {
    id,
    name: participant.name.trim(),
    rating: participant.rating ?? 3.0,
    type: participant.type || 'singles',
    partner_name: participant.partnerName?.trim() || null,
    partner_rating: participant.partnerRating != null ? participant.partnerRating : null,
    waiver_accepted: participant.waiverAccepted === true,
    waiver_accepted_at: participant.waiverAcceptedAt ?? null,
    waiver_version: participant.waiverVersion ?? null,
    waiver_ip: participant.waiverIp ?? null,
    waiver_user_agent: participant.waiverUserAgent ?? null,
    gender: participant.gender === 'male' || participant.gender === 'female' ? participant.gender : null,
    partner_gender:
      participant.partnerGender === 'male' || participant.partnerGender === 'female'
        ? participant.partnerGender
        : null,
    waiver_legal_name: participant.waiverLegalName?.trim() || null,
    wechat_id: participant.wechatId?.trim() || null,
  };
  const { data, error } = await getClient().from('participants').insert(row).select().single();
  if (error) throw error;
  return rowToParticipant(data);
}

export async function deleteParticipant(id) {
  const { data, error } = await getClient()
    .from('participants')
    .delete()
    .eq('id', id)
    .select()
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return rowToParticipant(data);
}

export async function updateParticipant(id, patch) {
  const row = {};
  if (patch.name !== undefined) row.name = patch.name;
  if (patch.rating !== undefined) row.rating = patch.rating;
  if (patch.type !== undefined) row.type = patch.type;
  if (patch.gender !== undefined) row.gender = patch.gender;
  if (patch.partnerName !== undefined) row.partner_name = patch.partnerName;
  if (patch.partnerRating !== undefined) row.partner_rating = patch.partnerRating;
  if (patch.partnerGender !== undefined) row.partner_gender = patch.partnerGender;
  if (patch.adminSeedRank !== undefined) row.admin_seed_rank = patch.adminSeedRank;
  if (patch.adminBracketSlot !== undefined) row.admin_bracket_slot = patch.adminBracketSlot;
  if (Object.keys(row).length === 0) {
    const { data, error } = await getClient().from('participants').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return data ? rowToParticipant(data) : null;
  }
  const { data, error } = await getClient().from('participants').update(row).eq('id', id).select().maybeSingle();
  if (error) throw error;
  return data ? rowToParticipant(data) : null;
}

function rowsToMatchResults(rows) {
  const out = { singles: {}, doubles: {} };
  for (const row of rows || []) {
    const bucket = row.draw_type === 'doubles' ? 'doubles' : 'singles';
    out[bucket][row.match_id] = {
      winnerId: row.winner_id,
      score: row.score ?? null,
    };
  }
  return out;
}

export async function getMatchResults() {
  const { data, error } = await getClient().from('match_results').select('draw_type, match_id, winner_id, score');
  if (error) throw error;
  return rowsToMatchResults(data);
}

export async function setMatchResult(type, matchId, winnerId, score = null) {
  const draw_type = type === 'doubles' ? 'doubles' : 'singles';
  const { error } = await getClient()
    .from('match_results')
    .upsert(
      {
        draw_type,
        match_id: matchId,
        winner_id: winnerId,
        score: score?.trim() || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'draw_type,match_id' },
    );
  if (error) throw error;
  return getMatchResults();
}

export async function clearMatchResult(type, matchId) {
  const draw_type = type === 'doubles' ? 'doubles' : 'singles';
  const { error } = await getClient()
    .from('match_results')
    .delete()
    .eq('draw_type', draw_type)
    .eq('match_id', matchId);
  if (error) throw error;
  return getMatchResults();
}

export async function clearMatchResults(type, matchIds) {
  const draw_type = type === 'doubles' ? 'doubles' : 'singles';
  if (!matchIds.length) {
    return getMatchResults();
  }
  const { error } = await getClient()
    .from('match_results')
    .delete()
    .eq('draw_type', draw_type)
    .in('match_id', matchIds);
  if (error) throw error;
  return getMatchResults();
}

export async function getEventPlan() {
  const { data, error } = await getClient().from('event_plan').select('payload').eq('id', 1).maybeSingle();
  if (error) throw error;
  if (!data?.payload) return null;
  return typeof data.payload === 'object' ? data.payload : {};
}

export async function setEventPlan(plan) {
  const { error } = await getClient()
    .from('event_plan')
    .upsert(
      {
        id: 1,
        payload: plan,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' },
    );
  if (error) throw error;
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

export async function getBracketAdmin() {
  const { data, error } = await getClient()
    .from('bracket_admin')
    .select('match_display_order')
    .eq('id', 1)
    .maybeSingle();
  if (error) throw error;
  const mod = data?.match_display_order;
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
  const { error } = await getClient()
    .from('bracket_admin')
    .upsert(
      {
        id: 1,
        match_display_order: matchDisplayOrder,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' },
    );
  if (error) throw error;
  return getBracketAdmin();
}
