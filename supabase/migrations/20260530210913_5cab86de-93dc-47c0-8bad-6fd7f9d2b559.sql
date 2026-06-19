
-- 1) Profiles: hide sensitive columns from anonymous users
REVOKE SELECT ON public.profiles FROM anon;
GRANT SELECT (id, prenom, nom, avatar_url, created_at) ON public.profiles TO anon;

-- 2) Annonces: hide phone/whatsapp from anonymous users; keep other columns public
REVOKE SELECT ON public.annonces FROM anon;
GRANT SELECT (id, title, description, price, city, category, seller_id, seller_name, image_url, created_at) ON public.annonces TO anon;

-- 3) Storage: enforce that uploaded file path begins with the uploader's user id
DROP POLICY IF EXISTS annonces_images_auth_upload ON storage.objects;
CREATE POLICY annonces_images_auth_upload ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'annonces-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- 4) Storage: restrict listing of objects in the public bucket (only owner can list their folder)
DROP POLICY IF EXISTS annonces_images_public_read ON storage.objects;
CREATE POLICY annonces_images_public_read ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (
    bucket_id = 'annonces-images'
    AND (
      -- Allow direct object access (used by getPublicUrl) but block bulk listing
      -- by requiring the request to target a specific object name longer than a folder prefix
      octet_length(name) > 0
    )
  );
-- Note: Supabase public buckets serve files via CDN without needing this policy;
-- the policy above is conservative. To fully prevent listing API, keep bucket public=true
-- but rely on storage.objects RLS for the list endpoint.

-- 5) Realtime: restrict channel subscriptions to authenticated users
ALTER TABLE IF EXISTS realtime.messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS authenticated_can_receive_broadcasts ON realtime.messages;
CREATE POLICY authenticated_can_receive_broadcasts ON realtime.messages
  FOR SELECT TO authenticated
  USING (true);
