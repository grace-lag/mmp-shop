ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS edited_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- Sender can edit own message within 15 min
DROP POLICY IF EXISTS "messages_update_by_sender_15min" ON public.messages;
CREATE POLICY "messages_update_by_sender_15min" ON public.messages
  FOR UPDATE TO authenticated
  USING (auth.uid() = sender_id AND created_at > (now() - interval '15 minutes'))
  WITH CHECK (auth.uid() = sender_id);

-- Sender can delete own message within 15 min
DROP POLICY IF EXISTS "messages_delete_by_sender_15min" ON public.messages;
CREATE POLICY "messages_delete_by_sender_15min" ON public.messages
  FOR DELETE TO authenticated
  USING (auth.uid() = sender_id AND created_at > (now() - interval '15 minutes'));

-- Ensure realtime broadcasts
ALTER TABLE public.messages REPLICA IDENTITY FULL;
DO $$ BEGIN
  PERFORM 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='messages';
  IF NOT FOUND THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.messages';
  END IF;
END $$;