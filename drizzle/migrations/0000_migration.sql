-- Public directory of safe profile fields
CREATE OR REPLACE VIEW public.public_profiles
WITH (security_invoker = false) AS
SELECT id, prenom, nom, avatar_url, genre, last_seen_at, created_at, account_type, business_name, business_year
FROM public.profiles;

REVOKE ALL ON public.public_profiles FROM PUBLIC;
GRANT SELECT ON public.public_profiles TO anon, authenticated;

-- Profiles table rows: only owner or admin
DROP POLICY IF EXISTS profiles_select_all ON public.profiles;
DROP POLICY IF EXISTS profiles_select_own ON public.profiles;
DROP POLICY IF EXISTS profiles_select_admin ON public.profiles;
CREATE POLICY profiles_select_own ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY profiles_select_admin ON public.profiles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Seller contact numbers for signed-in members only
CREATE OR REPLACE FUNCTION public.get_profile_contact(_id uuid)
RETURNS TABLE(tel text, whatsapp text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT p.tel::text, p.whatsapp::text FROM public.profiles p
  WHERE p.id = _id AND auth.uid() IS NOT NULL;
$$;
REVOKE ALL ON FUNCTION public.get_profile_contact(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_profile_contact(uuid) TO authenticated;