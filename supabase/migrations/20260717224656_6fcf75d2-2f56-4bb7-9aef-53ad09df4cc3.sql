
-- Fix: annonces phone/whatsapp column exposure (previous full GRANT undid column restriction)
REVOKE SELECT ON public.annonces FROM anon;
REVOKE SELECT ON public.annonces FROM authenticated;
GRANT SELECT (
  id, title, description, price, city, category, subcategory,
  seller_id, seller_name, image_url, images, views, likes_count,
  created_at, expires_at
) ON public.annonces TO anon;
GRANT SELECT (
  id, title, description, price, city, category, subcategory,
  seller_id, seller_name, image_url, images, views, likes_count,
  created_at, expires_at, phone, whatsapp
) ON public.annonces TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.annonces TO authenticated;
GRANT ALL ON public.annonces TO service_role;

-- Fix: annonce_views insert requires session_id when anonymous
DROP POLICY IF EXISTS "views_insert_any" ON public.annonce_views;
DROP POLICY IF EXISTS "views_insert_self_or_anon" ON public.annonce_views;
CREATE POLICY "views_insert_self_or_anon" ON public.annonce_views
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    (auth.uid() IS NOT NULL AND user_id = auth.uid() AND session_id IS NULL)
    OR (auth.uid() IS NULL AND user_id IS NULL AND session_id IS NOT NULL AND length(session_id) BETWEEN 8 AND 128)
  );

-- Fix: SECURITY DEFINER functions - restrict EXECUTE
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_annonce_likes_count() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_shorts_likes_count() FROM PUBLIC, anon, authenticated;
-- has_role stays executable by authenticated (required by RLS policy evaluation)
-- increment_annonce_views stays executable by anon/authenticated (view tracking)

-- Fix: Public bucket listing - drop broad SELECT policies (public URLs still work via public bucket)
DROP POLICY IF EXISTS "annonces_images_public_read" ON storage.objects;
DROP POLICY IF EXISTS "avatars_public_read" ON storage.objects;
DROP POLICY IF EXISTS "Public read annonces-images" ON storage.objects;
DROP POLICY IF EXISTS "Public read avatars" ON storage.objects;

-- Fix: MIME type validation on uploads to public image buckets
DROP POLICY IF EXISTS "annonces_images_auth_upload" ON storage.objects;
CREATE POLICY "annonces_images_auth_upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'annonces-images'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
    )
    AND (
      (lower(coalesce(metadata->>'mimetype','')) LIKE 'image/%')
      OR (lower(coalesce(metadata->>'mimetype','')) LIKE 'video/%')
      OR (lower(coalesce(metadata->>'mimetype','')) LIKE 'audio/%')
    )
  );

DROP POLICY IF EXISTS "avatars_user_upload" ON storage.objects;
CREATE POLICY "avatars_user_upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
    AND lower(coalesce(metadata->>'mimetype','')) LIKE 'image/%'
  );
