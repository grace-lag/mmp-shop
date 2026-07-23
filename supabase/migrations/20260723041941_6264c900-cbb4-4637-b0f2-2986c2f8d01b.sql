
-- 1) Allow signed-in users to see their own visit rows (Historique › Annonces visitées)
CREATE POLICY views_select_own_visits ON public.annonce_views
FOR SELECT TO authenticated
USING (user_id = auth.uid());

-- 2) Restore public read on seller_followers (follower counts + public followers page)
GRANT SELECT ON public.seller_followers TO anon;
DROP POLICY IF EXISTS followers_read_authenticated ON public.seller_followers;
CREATE POLICY followers_read_all ON public.seller_followers
FOR SELECT
USING (true);

-- 3) Widen annonces-images upload policy to accept document/archive/text mimetypes
--    (chat & comment attachments — invoices, PDFs, resumes, contracts, etc.)
DROP POLICY IF EXISTS "annonces_images_auth_upload" ON storage.objects;
CREATE POLICY "annonces_images_auth_upload" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'annonces-images'
  AND (
    lower(coalesce(metadata->>'mimetype','')) LIKE 'image/%'
    OR lower(coalesce(metadata->>'mimetype','')) LIKE 'video/%'
    OR lower(coalesce(metadata->>'mimetype','')) LIKE 'audio/%'
    OR lower(coalesce(metadata->>'mimetype','')) LIKE 'application/pdf'
    OR lower(coalesce(metadata->>'mimetype','')) LIKE 'application/zip'
    OR lower(coalesce(metadata->>'mimetype','')) LIKE 'application/x-zip%'
    OR lower(coalesce(metadata->>'mimetype','')) LIKE 'application/x-rar%'
    OR lower(coalesce(metadata->>'mimetype','')) LIKE 'application/x-7z%'
    OR lower(coalesce(metadata->>'mimetype','')) LIKE 'application/msword'
    OR lower(coalesce(metadata->>'mimetype','')) LIKE 'application/vnd.openxmlformats-officedocument.%'
    OR lower(coalesce(metadata->>'mimetype','')) LIKE 'application/vnd.ms-%'
    OR lower(coalesce(metadata->>'mimetype','')) LIKE 'application/vnd.oasis.opendocument.%'
    OR lower(coalesce(metadata->>'mimetype','')) LIKE 'application/rtf'
    OR lower(coalesce(metadata->>'mimetype','')) LIKE 'application/json'
    OR lower(coalesce(metadata->>'mimetype','')) LIKE 'application/octet-stream'
    OR lower(coalesce(metadata->>'mimetype','')) LIKE 'text/%'
  )
);
