DROP POLICY IF EXISTS premium_settings_read ON public.premium_settings;
REVOKE SELECT ON public.premium_settings FROM anon;
GRANT SELECT ON public.premium_settings TO authenticated;
GRANT ALL ON public.premium_settings TO service_role;
CREATE POLICY premium_settings_read_authenticated
ON public.premium_settings
FOR SELECT
TO authenticated
USING ((SELECT auth.uid()) IS NOT NULL);