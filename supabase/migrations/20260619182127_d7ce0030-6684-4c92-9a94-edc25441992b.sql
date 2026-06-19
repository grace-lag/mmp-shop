
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Backfill profile rows for any existing auth users that don't have one yet
INSERT INTO public.profiles (id, email, nom, prenom)
SELECT
  u.id,
  u.email,
  COALESCE(u.raw_user_meta_data->>'nom',''),
  COALESCE(u.raw_user_meta_data->>'prenom','')
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'user'::public.app_role
FROM auth.users u
LEFT JOIN public.user_roles r ON r.user_id = u.id AND r.role = 'user'
WHERE r.user_id IS NULL
ON CONFLICT (user_id, role) DO NOTHING;
