
-- 1) Add columns to annonces
ALTER TABLE public.annonces
  ADD COLUMN IF NOT EXISTS images text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS subcategory text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS views integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS likes_count integer NOT NULL DEFAULT 0;

-- Re-grant the new safe columns to anon (existing public select policy already allows reads)
GRANT SELECT (id, title, description, price, city, category, subcategory, seller_id, seller_name, image_url, images, views, likes_count, created_at) ON public.annonces TO anon;
GRANT SELECT (id, title, description, price, city, category, subcategory, seller_id, seller_name, image_url, images, views, likes_count, created_at, phone, whatsapp) ON public.annonces TO authenticated;

-- 2) annonce_likes table
CREATE TABLE IF NOT EXISTS public.annonce_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  annonce_id uuid NOT NULL REFERENCES public.annonces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(annonce_id, user_id)
);

GRANT SELECT ON public.annonce_likes TO anon;
GRANT SELECT, INSERT, DELETE ON public.annonce_likes TO authenticated;
GRANT ALL ON public.annonce_likes TO service_role;

ALTER TABLE public.annonce_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "likes_select_all" ON public.annonce_likes FOR SELECT USING (true);
CREATE POLICY "likes_insert_own" ON public.annonce_likes FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "likes_delete_own" ON public.annonce_likes FOR DELETE TO authenticated USING (user_id = auth.uid());

-- 3) Triggers to keep likes_count in sync
CREATE OR REPLACE FUNCTION public.update_annonce_likes_count()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.annonces SET likes_count = likes_count + 1 WHERE id = NEW.annonce_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.annonces SET likes_count = GREATEST(likes_count - 1, 0) WHERE id = OLD.annonce_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END $$;

DROP TRIGGER IF EXISTS trg_annonce_likes_ins ON public.annonce_likes;
DROP TRIGGER IF EXISTS trg_annonce_likes_del ON public.annonce_likes;
CREATE TRIGGER trg_annonce_likes_ins AFTER INSERT ON public.annonce_likes FOR EACH ROW EXECUTE FUNCTION public.update_annonce_likes_count();
CREATE TRIGGER trg_annonce_likes_del AFTER DELETE ON public.annonce_likes FOR EACH ROW EXECUTE FUNCTION public.update_annonce_likes_count();

-- 4) Public RPC to increment views
CREATE OR REPLACE FUNCTION public.increment_annonce_views(_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.annonces SET views = views + 1 WHERE id = _id;
END $$;

GRANT EXECUTE ON FUNCTION public.increment_annonce_views(uuid) TO anon, authenticated;
