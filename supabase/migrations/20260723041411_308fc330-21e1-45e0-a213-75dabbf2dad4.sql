-- Add explicit ownership-scoped policies for the private chat-files bucket.
-- Files are uploaded under a path prefix that starts with the sender's user id
-- (e.g. "<uid>/<msg_id>-<filename>"). Only the sender may write; only sender
-- or receiver of the underlying message may read.

DROP POLICY IF EXISTS "chat_files_owner_read" ON storage.objects;
DROP POLICY IF EXISTS "chat_files_owner_write" ON storage.objects;
DROP POLICY IF EXISTS "chat_files_owner_update" ON storage.objects;
DROP POLICY IF EXISTS "chat_files_owner_delete" ON storage.objects;

-- Sender or receiver (via messages.attachment_url) can read
CREATE POLICY "chat_files_owner_read"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'chat-files'
  AND (
    -- Uploader (path starts with their uid)
    (storage.foldername(name))[1] = auth.uid()::text
    OR EXISTS (
      SELECT 1 FROM public.messages m
      WHERE m.attachment_url LIKE '%' || storage.objects.name
        AND (m.sender_id = auth.uid() OR m.receiver_id = auth.uid())
    )
  )
);

-- Only the uploader (their uid prefix) can write
CREATE POLICY "chat_files_owner_write"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'chat-files'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "chat_files_owner_update"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'chat-files'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "chat_files_owner_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'chat-files'
  AND (storage.foldername(name))[1] = auth.uid()::text
);