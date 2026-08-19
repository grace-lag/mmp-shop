DROP POLICY IF EXISTS annonces_images_auth_upload ON storage.objects;
DROP POLICY IF EXISTS annonces_images_owner_update ON storage.objects;
DROP POLICY IF EXISTS annonces_images_owner_delete ON storage.objects;

CREATE POLICY annonces_images_auth_upload ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'annonces-images'
  AND (storage.foldername(name))[1] = (auth.uid())::text
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

CREATE POLICY annonces_images_owner_update ON storage.objects
FOR UPDATE TO authenticated
USING (
  bucket_id = 'annonces-images'
  AND (storage.foldername(name))[1] = (auth.uid())::text
)
WITH CHECK (
  bucket_id = 'annonces-images'
  AND (storage.foldername(name))[1] = (auth.uid())::text
);

CREATE POLICY annonces_images_owner_delete ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'annonces-images'
  AND (storage.foldername(name))[1] = (auth.uid())::text
);