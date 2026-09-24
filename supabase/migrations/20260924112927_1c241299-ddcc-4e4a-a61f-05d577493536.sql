REVOKE SELECT ON public.profiles FROM authenticated;
GRANT SELECT (id,nom,prenom,genre,tel,avatar_url,created_at,updated_at,date_naissance,whatsapp,last_seen_at,account_type,business_name,business_year) ON public.profiles TO authenticated;
DROP POLICY IF EXISTS banned_words_read ON public.banned_words;
CREATE POLICY banned_words_read ON public.banned_words FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));