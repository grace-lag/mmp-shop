
-- Annonces: expiration (1 month default) + renewal
ALTER TABLE public.annonces 
  ADD COLUMN IF NOT EXISTS expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 days');

-- Helper to renew an annonce for 30 days
CREATE OR REPLACE FUNCTION public.renew_annonce(_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.annonces
    SET expires_at = GREATEST(now(), expires_at) + interval '30 days'
    WHERE id = _id AND seller_id = auth.uid();
END;
$$;
REVOKE ALL ON FUNCTION public.renew_annonce(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.renew_annonce(uuid) TO authenticated;

-- Track last seen time (for online / last seen)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS last_seen_at timestamptz;

CREATE OR REPLACE FUNCTION public.touch_last_seen()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.profiles SET last_seen_at = now() WHERE id = auth.uid();
$$;
REVOKE ALL ON FUNCTION public.touch_last_seen() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.touch_last_seen() TO authenticated;

-- Helpful indexes
CREATE INDEX IF NOT EXISTS annonces_expires_at_idx ON public.annonces(expires_at);
CREATE INDEX IF NOT EXISTS annonces_seller_id_idx ON public.annonces(seller_id);
