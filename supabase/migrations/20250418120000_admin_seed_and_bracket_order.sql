-- Admin: manual seed rank per participant; custom match list order in admin UI
ALTER TABLE public.participants ADD COLUMN IF NOT EXISTS admin_seed_rank integer;

CREATE TABLE IF NOT EXISTS public.bracket_admin (
  id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  match_display_order jsonb NOT NULL DEFAULT '{"singles": {}, "doubles": {}}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.bracket_admin (id, match_display_order)
VALUES (1, '{"singles": {}, "doubles": {}}'::jsonb)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.bracket_admin ENABLE ROW LEVEL SECURITY;

COMMENT ON COLUMN public.participants.admin_seed_rank IS 'Optional 1..n override for bracket seeding order (lower = stronger). NULL = use NTRP only.';
COMMENT ON TABLE public.bracket_admin IS 'Singleton JSON: match_display_order for admin match list sorting';
