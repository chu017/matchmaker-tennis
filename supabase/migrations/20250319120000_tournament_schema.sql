-- SF Tennis Matchmaker — Supabase schema
-- Run in: Supabase Dashboard → SQL Editor → New query → Paste → Run
-- Or: supabase db push (if using Supabase CLI linked to this project)

-- Participants (replaces server/participants.json)
CREATE TABLE IF NOT EXISTS public.participants (
  id uuid PRIMARY KEY,
  name text NOT NULL,
  rating numeric NOT NULL DEFAULT 3.0,
  type text NOT NULL DEFAULT 'singles' CHECK (type IN ('singles', 'doubles')),
  partner_name text,
  partner_rating numeric,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_participants_created_at ON public.participants (created_at);

-- Match results (replaces server/match-results.json singles/doubles maps)
CREATE TABLE IF NOT EXISTS public.match_results (
  draw_type text NOT NULL CHECK (draw_type IN ('singles', 'doubles')),
  match_id text NOT NULL,
  winner_id text NOT NULL,
  score text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (draw_type, match_id)
);

-- Event plan singleton (replaces server/event-plan.json)
CREATE TABLE IF NOT EXISTS public.event_plan (
  id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.event_plan (id, payload)
VALUES (1, '{}'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- RLS: no policies = no direct browser/anon access via PostgREST.
-- Your Express server uses the service_role key, which bypasses RLS.
ALTER TABLE public.participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_plan ENABLE ROW LEVEL SECURITY;

-- Optional: allow read-only public access (NOT recommended unless you drop Express for reads)
-- For this app, keep all access through the API + service role only.

COMMENT ON TABLE public.participants IS 'Tournament signups';
COMMENT ON TABLE public.match_results IS 'Per-match winner + score; keys match draw match ids';
COMMENT ON TABLE public.event_plan IS 'Single-row JSON document for admin event planning UI';
