ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS whatsapp TEXT DEFAULT '';

GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
CREATE POLICY "profiles_insert_own" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "avatars_user_upload" ON storage.objects;
DROP POLICY IF EXISTS "avatars_user_update" ON storage.objects;
DROP POLICY IF EXISTS "avatars_user_delete" ON storage.objects;
DROP POLICY IF EXISTS "avatars_user_read" ON storage.objects;

CREATE POLICY "avatars_user_read" ON storage.objects
  FOR SELECT TO authenticated, anon
  USING (bucket_id = 'avatars');

CREATE POLICY "avatars_user_upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "avatars_user_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "avatars_user_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  meta jsonb := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);
  v_full_name text := COALESCE(meta->>'full_name', meta->>'name', '');
  v_prenom text := COALESCE(NULLIF(meta->>'prenom',''), NULLIF(meta->>'given_name',''), NULLIF(split_part(v_full_name,' ',1),''), '');
  v_nom text := COALESCE(
    NULLIF(meta->>'nom',''),
    NULLIF(meta->>'family_name',''),
    NULLIF(NULLIF(trim(substring(v_full_name from position(' ' in v_full_name)+1)),v_full_name),''),
    ''
  );
  v_avatar text := COALESCE(NULLIF(meta->>'avatar_url',''), NULLIF(meta->>'picture',''), NULL);
  v_tel text := COALESCE(NULLIF(meta->>'tel',''), NULLIF(NEW.phone,''), '');
  v_whatsapp text := COALESCE(NULLIF(meta->>'whatsapp',''), v_tel, '');
  v_genre text := COALESCE(NULLIF(meta->>'genre',''), '');
  v_date_text text := NULLIF(meta->>'date_naissance','');
  v_date_naissance date := NULL;
BEGIN
  IF v_date_text IS NOT NULL THEN
    BEGIN
      v_date_naissance := v_date_text::date;
    EXCEPTION WHEN others THEN
      v_date_naissance := NULL;
    END;
  END IF;

  INSERT INTO public.profiles (id, email, nom, prenom, genre, date_naissance, avatar_url, tel, whatsapp)
  VALUES (NEW.id, NEW.email, v_nom, v_prenom, v_genre, v_date_naissance, v_avatar, v_tel, v_whatsapp)
  ON CONFLICT (id) DO UPDATE SET
    email = COALESCE(NULLIF(EXCLUDED.email,''), public.profiles.email),
    nom = COALESCE(NULLIF(public.profiles.nom,''), EXCLUDED.nom),
    prenom = COALESCE(NULLIF(public.profiles.prenom,''), EXCLUDED.prenom),
    genre = COALESCE(NULLIF(public.profiles.genre,''), EXCLUDED.genre),
    date_naissance = COALESCE(public.profiles.date_naissance, EXCLUDED.date_naissance),
    avatar_url = COALESCE(public.profiles.avatar_url, EXCLUDED.avatar_url),
    tel = COALESCE(NULLIF(public.profiles.tel,''), EXCLUDED.tel),
    whatsapp = COALESCE(NULLIF(public.profiles.whatsapp,''), EXCLUDED.whatsapp),
    updated_at = now();

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user')
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;