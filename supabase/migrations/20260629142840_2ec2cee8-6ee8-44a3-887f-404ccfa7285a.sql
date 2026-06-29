
-- Lecture publique du bucket privé (URL stable, comme un bucket public)
CREATE POLICY "shorts_videos_public_read"
ON storage.objects FOR SELECT TO anon, authenticated
USING (bucket_id = 'shorts-videos');

CREATE POLICY "shorts_videos_owner_insert"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'shorts-videos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "shorts_videos_owner_update"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'shorts-videos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "shorts_videos_owner_delete"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'shorts-videos' AND (storage.foldername(name))[1] = auth.uid()::text);
