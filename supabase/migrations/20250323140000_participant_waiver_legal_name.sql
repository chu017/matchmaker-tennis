-- Full legal name as entered when acknowledging the waiver (may differ from display name)
ALTER TABLE public.participants
  ADD COLUMN IF NOT EXISTS waiver_legal_name text;

COMMENT ON COLUMN public.participants.waiver_legal_name IS 'Legal name entered when reading/signing the liability waiver';
