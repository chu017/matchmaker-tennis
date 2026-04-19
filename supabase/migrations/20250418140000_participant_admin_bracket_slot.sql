-- Admin: force participant into main draw or waiting list (overrides signup-time cutoff).
-- Run in Supabase → SQL → New query if this file was not applied yet.
-- Allowed values enforced in the app: NULL | 'draw' | 'waiting'

ALTER TABLE public.participants
  ADD COLUMN IF NOT EXISTS admin_bracket_slot text;

COMMENT ON COLUMN public.participants.admin_bracket_slot IS 'NULL = use signup order; draw = always in first 16 for type; waiting = always waiting';

-- Tell PostgREST to refresh its schema cache (avoids "column not in schema cache" right after DDL)
NOTIFY pgrst, 'reload schema';
