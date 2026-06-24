
-- Seller ratings
CREATE TABLE public.seller_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rater_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(seller_id, rater_id)
);
GRANT SELECT ON public.seller_ratings TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.seller_ratings TO authenticated;
GRANT ALL ON public.seller_ratings TO service_role;
ALTER TABLE public.seller_ratings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ratings_read_all" ON public.seller_ratings FOR SELECT USING (true);
CREATE POLICY "ratings_insert_own" ON public.seller_ratings FOR INSERT TO authenticated WITH CHECK (auth.uid() = rater_id AND auth.uid() <> seller_id);
CREATE POLICY "ratings_update_own" ON public.seller_ratings FOR UPDATE TO authenticated USING (auth.uid() = rater_id) WITH CHECK (auth.uid() = rater_id);
CREATE POLICY "ratings_delete_own" ON public.seller_ratings FOR DELETE TO authenticated USING (auth.uid() = rater_id);

-- Seller followers
CREATE TABLE public.seller_followers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  follower_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(seller_id, follower_id)
);
GRANT SELECT ON public.seller_followers TO anon;
GRANT SELECT, INSERT, DELETE ON public.seller_followers TO authenticated;
GRANT ALL ON public.seller_followers TO service_role;
ALTER TABLE public.seller_followers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "followers_read_all" ON public.seller_followers FOR SELECT USING (true);
CREATE POLICY "followers_insert_own" ON public.seller_followers FOR INSERT TO authenticated WITH CHECK (auth.uid() = follower_id AND auth.uid() <> seller_id);
CREATE POLICY "followers_delete_own" ON public.seller_followers FOR DELETE TO authenticated USING (auth.uid() = follower_id);

-- Attachments on messages & comments
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS attachment_url text;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS attachment_type text;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS attachment_name text;
ALTER TABLE public.messages ALTER COLUMN content DROP NOT NULL;

ALTER TABLE public.annonce_comments ADD COLUMN IF NOT EXISTS attachment_url text;
ALTER TABLE public.annonce_comments ADD COLUMN IF NOT EXISTS attachment_type text;
ALTER TABLE public.annonce_comments ADD COLUMN IF NOT EXISTS attachment_name text;
ALTER TABLE public.annonce_comments ALTER COLUMN content DROP NOT NULL;
