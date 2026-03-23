-- Waiver acceptance audit fields (signup liability release)
ALTER TABLE public.participants
  ADD COLUMN IF NOT EXISTS waiver_accepted boolean NOT NULL DEFAULT false;

ALTER TABLE public.participants
  ADD COLUMN IF NOT EXISTS waiver_accepted_at timestamptz;

ALTER TABLE public.participants
  ADD COLUMN IF NOT EXISTS waiver_version text;

ALTER TABLE public.participants
  ADD COLUMN IF NOT EXISTS waiver_ip text;

ALTER TABLE public.participants
  ADD COLUMN IF NOT EXISTS waiver_user_agent text;

COMMENT ON COLUMN public.participants.waiver_accepted IS 'Whether participant accepted the liability waiver at signup';
COMMENT ON COLUMN public.participants.waiver_accepted_at IS 'Server timestamp when waiver was accepted';
COMMENT ON COLUMN public.participants.waiver_version IS 'Waiver document version (e.g. v1.0)';
COMMENT ON COLUMN public.participants.waiver_ip IS 'Client IP at signup (from proxy headers when applicable)';
COMMENT ON COLUMN public.participants.waiver_user_agent IS 'User-Agent header at signup';
