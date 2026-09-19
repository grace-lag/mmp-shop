DROP POLICY IF EXISTS "Site banners are readable" ON storage.objects;
CREATE POLICY "Site banners are readable"
ON storage.objects FOR SELECT TO anon, authenticated
USING (bucket_id = 'site-banners');

DROP POLICY IF EXISTS "Admins upload site banners" ON storage.objects;
CREATE POLICY "Admins upload site banners"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'site-banners' AND public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins update site banners" ON storage.objects;
CREATE POLICY "Admins update site banners"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'site-banners' AND public.has_role(auth.uid(), 'admin'))
WITH CHECK (bucket_id = 'site-banners' AND public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins delete site banners" ON storage.objects;
CREATE POLICY "Admins delete site banners"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'site-banners' AND public.has_role(auth.uid(), 'admin'));