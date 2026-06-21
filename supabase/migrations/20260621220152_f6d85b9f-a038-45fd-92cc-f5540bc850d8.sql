
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS read_at timestamptz;

DROP POLICY IF EXISTS "messages_mark_read_by_receiver" ON public.messages;
CREATE POLICY "messages_mark_read_by_receiver"
ON public.messages
FOR UPDATE
TO authenticated
USING (auth.uid() = receiver_id)
WITH CHECK (auth.uid() = receiver_id);
