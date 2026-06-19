
-- Deny all realtime broadcast/presence access. The app only uses postgres_changes
-- on public.messages, which is independently gated by messages_select_party RLS.
CREATE POLICY "deny_all_realtime_messages"
ON realtime.messages
FOR SELECT
TO authenticated
USING (false);
