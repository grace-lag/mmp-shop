
REVOKE SELECT ON public.profiles FROM anon;
GRANT SELECT (id, nom, prenom, avatar_url, genre, created_at, updated_at, last_seen_at, account_type, business_name, business_year) ON public.profiles TO anon;
