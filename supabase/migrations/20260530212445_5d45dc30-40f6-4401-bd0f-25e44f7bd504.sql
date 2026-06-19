
-- 1. Tighten anon column access on annonces (defense in depth; column grants already restrict, make REVOKE explicit)
REVOKE SELECT (phone, whatsapp) ON public.annonces FROM anon;
REVOKE SELECT (phone, whatsapp) ON public.annonces FROM PUBLIC;

-- 2. Tighten anon column access on profiles
REVOKE SELECT (email, tel) ON public.profiles FROM anon;
REVOKE SELECT (email, tel) ON public.profiles FROM PUBLIC;

-- 3. Drop overly permissive realtime broadcast policy.
-- The app uses postgres_changes on public.messages (gated by messages_select_party),
-- not broadcast channels, so removing this closes the leak.
DROP POLICY IF EXISTS authenticated_can_receive_broadcasts ON realtime.messages;

-- 4. Avatars storage bucket for profile pictures
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "avatars_public_read"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

CREATE POLICY "avatars_user_upload"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "avatars_user_update"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "avatars_user_delete"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
