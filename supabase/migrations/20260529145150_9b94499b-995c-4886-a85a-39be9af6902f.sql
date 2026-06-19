
REVOKE EXECUTE ON FUNCTION public.has_role(UUID, app_role) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
DROP POLICY IF EXISTS "annonces_images_public_read" ON storage.objects;
-- Public read by exact path (no listing). Reading a known object URL still works.
CREATE POLICY "annonces_images_public_read" ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'annonces-images');
-- Note: with the bucket public, direct object URLs work; the listing API is restricted by RLS to authenticated owner.
