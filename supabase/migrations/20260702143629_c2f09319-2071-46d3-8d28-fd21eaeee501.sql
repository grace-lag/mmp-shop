
-- Add title/description to shorts
ALTER TABLE public.shorts
  ADD COLUMN IF NOT EXISTS title text,
  ADD COLUMN IF NOT EXISTS description text;

-- Likes on shorts
CREATE TABLE IF NOT EXISTS public.shorts_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  short_id uuid NOT NULL REFERENCES public.shorts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(short_id, user_id)
);
GRANT SELECT, INSERT, DELETE ON public.shorts_likes TO authenticated;
GRANT SELECT ON public.shorts_likes TO anon;
GRANT ALL ON public.shorts_likes TO service_role;
ALTER TABLE public.shorts_likes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "shorts_likes_select" ON public.shorts_likes;
CREATE POLICY "shorts_likes_select" ON public.shorts_likes FOR SELECT USING (true);
DROP POLICY IF EXISTS "shorts_likes_insert" ON public.shorts_likes;
CREATE POLICY "shorts_likes_insert" ON public.shorts_likes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "shorts_likes_delete" ON public.shorts_likes;
CREATE POLICY "shorts_likes_delete" ON public.shorts_likes FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Favorites on shorts
CREATE TABLE IF NOT EXISTS public.shorts_favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  short_id uuid NOT NULL REFERENCES public.shorts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(short_id, user_id)
);
GRANT SELECT, INSERT, DELETE ON public.shorts_favorites TO authenticated;
GRANT ALL ON public.shorts_favorites TO service_role;
ALTER TABLE public.shorts_favorites ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "shorts_fav_own" ON public.shorts_favorites;
CREATE POLICY "shorts_fav_own" ON public.shorts_favorites FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Comments on shorts
CREATE TABLE IF NOT EXISTS public.shorts_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  short_id uuid NOT NULL REFERENCES public.shorts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.shorts_comments TO authenticated;
GRANT SELECT ON public.shorts_comments TO anon;
GRANT ALL ON public.shorts_comments TO service_role;
ALTER TABLE public.shorts_comments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "shorts_comments_select" ON public.shorts_comments;
CREATE POLICY "shorts_comments_select" ON public.shorts_comments FOR SELECT USING (true);
DROP POLICY IF EXISTS "shorts_comments_insert" ON public.shorts_comments;
CREATE POLICY "shorts_comments_insert" ON public.shorts_comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "shorts_comments_delete_own" ON public.shorts_comments;
CREATE POLICY "shorts_comments_delete_own" ON public.shorts_comments FOR DELETE TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));

-- Likes counter trigger for shorts
CREATE OR REPLACE FUNCTION public.update_shorts_likes_count()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.shorts SET likes_count = likes_count + 1 WHERE id = NEW.short_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.shorts SET likes_count = GREATEST(likes_count - 1, 0) WHERE id = OLD.short_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END $$;

DROP TRIGGER IF EXISTS trg_shorts_likes_count ON public.shorts_likes;
CREATE TRIGGER trg_shorts_likes_count
AFTER INSERT OR DELETE ON public.shorts_likes
FOR EACH ROW EXECUTE FUNCTION public.update_shorts_likes_count();
