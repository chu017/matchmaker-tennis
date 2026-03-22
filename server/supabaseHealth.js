/**
 * Optional Supabase connectivity check (does not replace JSON store yet).
 */
import { createClient } from '@supabase/supabase-js';

/**
 * @returns {Promise<{
 *   configured: boolean,
 *   ok?: boolean,
 *   message?: string,
 *   participantCount?: number | null,
 *   error?: string
 * }>}
 */
export async function getSupabaseHealth() {
  const url = process.env.SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!url || !key) {
    return {
      configured: false,
      message: 'Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to test DB; app data still uses JSON files.',
    };
  }

  try {
    const supabase = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { error, count } = await supabase
      .from('participants')
      .select('*', { count: 'exact', head: true });

    if (error) {
      return {
        configured: true,
        ok: false,
        error: error.message,
        hint:
          error.message?.includes('relation') || error.code === '42P01'
            ? 'Run supabase/migrations/20250319120000_tournament_schema.sql in the SQL Editor.'
            : undefined,
      };
    }

    return {
      configured: true,
      ok: true,
      participantCount: count ?? 0,
    };
  } catch (e) {
    return {
      configured: true,
      ok: false,
      error: e?.message || String(e),
    };
  }
}
