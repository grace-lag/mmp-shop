-- 1) Reset annonces validity to the original 30 days after publication
UPDATE public.annonces
SET expires_at = created_at + interval '30 days'
WHERE expires_at > created_at + interval '30 days';

-- 2) Shorts expiration, same rules as annonces
ALTER TABLE public.shorts
  ADD COLUMN IF NOT EXISTS expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 days');

UPDATE public.shorts SET expires_at = created_at + interval '30 days';

CREATE INDEX IF NOT EXISTS shorts_expires_at_idx ON public.shorts(expires_at);

GRANT SELECT (expires_at) ON public.shorts TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.renew_short(_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.shorts
    SET expires_at = GREATEST(now(), expires_at) + interval '30 days'
  WHERE id = _id AND user_id = auth.uid();
END;
$$;

REVOKE ALL ON FUNCTION public.renew_short(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.renew_short(uuid) TO authenticated;

-- 3) Automatic permanent deletion 3 days after expiration
CREATE OR REPLACE FUNCTION public.purge_expired_content()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.annonces WHERE expires_at < now() - interval '3 days';
  DELETE FROM public.shorts WHERE expires_at < now() - interval '3 days';
END;
$$;

REVOKE ALL ON FUNCTION public.purge_expired_content() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.purge_expired_content() TO service_role;

CREATE EXTENSION IF NOT EXISTS pg_cron;

DO $$
BEGIN
  PERFORM cron.unschedule('purge-expired-content');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule('purge-expired-content', '17 3 * * *', $$SELECT public.purge_expired_content();$$);

-- 4) Homepage banner slides managed by admins
CREATE TABLE IF NOT EXISTS public.site_banners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  media_url text NOT NULL,
  media_type text NOT NULL DEFAULT 'image',
  caption text NOT NULL DEFAULT '',
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT site_banners_media_type_chk CHECK (media_type IN ('image', 'video'))
);

GRANT SELECT ON public.site_banners TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.site_banners TO authenticated;
GRANT ALL ON public.site_banners TO service_role;

ALTER TABLE public.site_banners ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view active banners" ON public.site_banners;
CREATE POLICY "Anyone can view active banners"
ON public.site_banners FOR SELECT TO anon, authenticated
USING (is_active OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins manage banners insert" ON public.site_banners;
CREATE POLICY "Admins manage banners insert"
ON public.site_banners FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins manage banners update" ON public.site_banners;
CREATE POLICY "Admins manage banners update"
ON public.site_banners FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins manage banners delete" ON public.site_banners;
CREATE POLICY "Admins manage banners delete"
ON public.site_banners FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));