
-- 1. annonce_views: fix overly permissive INSERT policy
DROP POLICY IF EXISTS "views_insert_any" ON public.annonce_views;
CREATE POLICY "views_insert_self_or_anon" ON public.annonce_views
  FOR INSERT TO anon, authenticated
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());

-- 2. profiles: restrict anon to safe columns only
REVOKE SELECT ON public.profiles FROM anon;
GRANT SELECT (id, nom, prenom, avatar_url, created_at) ON public.profiles TO anon;
-- authenticated keeps full row access via existing grants / policies

-- 3. annonces: restrict anon to safe columns (no phone/whatsapp)
REVOKE SELECT ON public.annonces FROM anon;
GRANT SELECT (
  id, title, description, price, city, category, subcategory,
  seller_id, seller_name, image_url, images, views, likes_count,
  created_at, "subcategory"
) ON public.annonces TO anon;

-- 4. SECURITY DEFINER functions: revoke broad EXECUTE
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_annonce_likes_count() FROM PUBLIC, anon, authenticated;

-- Drop unused single-arg overload
DROP FUNCTION IF EXISTS public.increment_annonce_views(uuid);

-- The 2-arg increment_annonce_views must remain callable for view tracking.
-- Keep EXECUTE for anon/authenticated; it's hardened (uses auth.uid() / session_id, no privilege escalation).

-- 5. Storage: drop broad listing policies on public buckets.
-- Public file URLs still work without these policies (public buckets serve via /object/public/).
DROP POLICY IF EXISTS "annonces_images_public_read" ON storage.objects;
DROP POLICY IF EXISTS "avatars_public_read" ON storage.objects;
