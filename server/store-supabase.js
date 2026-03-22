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
