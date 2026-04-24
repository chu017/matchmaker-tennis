-- WeChat ID collected at signup for player communication
ALTER TABLE public.participants
  ADD COLUMN IF NOT EXISTS wechat_id text;

COMMENT ON COLUMN public.participants.wechat_id IS 'WeChat ID provided by the player at signup';
