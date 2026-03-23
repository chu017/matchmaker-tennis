-- Player gender for signup; doubles uses partner_gender for pairing strength (female NTRP −0.5 vs male baseline)
ALTER TABLE public.participants
  ADD COLUMN IF NOT EXISTS gender text CHECK (gender IS NULL OR gender IN ('male', 'female'));

ALTER TABLE public.participants
  ADD COLUMN IF NOT EXISTS partner_gender text CHECK (partner_gender IS NULL OR partner_gender IN ('male', 'female'));

COMMENT ON COLUMN public.participants.gender IS 'Primary player gender (singles or doubles)';
COMMENT ON COLUMN public.participants.partner_gender IS 'Doubles partner gender';
