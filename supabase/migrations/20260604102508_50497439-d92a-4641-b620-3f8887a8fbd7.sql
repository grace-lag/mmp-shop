
-- Unique views
CREATE TABLE public.annonce_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  annonce_id uuid NOT NULL REFERENCES public.annonces(id) ON DELETE CASCADE,
  user_id uuid,
  session_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX annonce_views_user_unique ON public.annonce_views(annonce_id, user_id) WHERE user_id IS NOT NULL;
CREATE UNIQUE INDEX annonce_views_session_unique ON public.annonce_views(annonce_id, session_id) WHERE user_id IS NULL AND session_id IS NOT NULL;

GRANT SELECT, INSERT ON public.annonce_views TO anon, authenticated;
GRANT ALL ON public.annonce_views TO service_role;
ALTER TABLE public.annonce_views ENABLE ROW LEVEL SECURITY;
CREATE POLICY "views_select_all" ON public.annonce_views FOR SELECT USING (true);
CREATE POLICY "views_insert_any" ON public.annonce_views FOR INSERT WITH CHECK (true);

-- Replace increment function to enforce uniqueness
CREATE OR REPLACE FUNCTION public.increment_annonce_views(_id uuid, _session_id text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _inserted boolean := false;
BEGIN
  IF _uid IS NOT NULL THEN
    INSERT INTO public.annonce_views(annonce_id, user_id)
    VALUES (_id, _uid)
    ON CONFLICT DO NOTHING;
    GET DIAGNOSTICS _inserted = ROW_COUNT;
  ELSIF _session_id IS NOT NULL THEN
    INSERT INTO public.annonce_views(annonce_id, session_id)
    VALUES (_id, _session_id)
    ON CONFLICT DO NOTHING;
    GET DIAGNOSTICS _inserted = ROW_COUNT;
  END IF;
  IF _inserted THEN
    UPDATE public.annonces SET views = views + 1 WHERE id = _id;
  END IF;
END $$;

-- Comments
CREATE TABLE public.annonce_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  annonce_id uuid NOT NULL REFERENCES public.annonces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL CHECK (length(content) > 0 AND length(content) <= 1000),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX annonce_comments_annonce_idx ON public.annonce_comments(annonce_id, created_at DESC);

GRANT SELECT ON public.annonce_comments TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.annonce_comments TO authenticated;
GRANT ALL ON public.annonce_comments TO service_role;
ALTER TABLE public.annonce_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "comments_select_all" ON public.annonce_comments FOR SELECT USING (true);
CREATE POLICY "comments_insert_own" ON public.annonce_comments FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "comments_update_own" ON public.annonce_comments FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "comments_delete_own" ON public.annonce_comments FOR DELETE TO authenticated USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'));
