
-- 1) Hide seller phone/whatsapp from anonymous users via column-level grants
REVOKE SELECT ON public.annonces FROM anon;
GRANT SELECT (
  id, title, description, price, city, category, subcategory,
  seller_id, seller_name, image_url, images, views, likes_count,
  created_at, expires_at
) ON public.annonces TO anon;

-- 2) Restrict annonce_views SELECT to the ad owner or admins
DROP POLICY IF EXISTS views_select_all ON public.annonce_views;
CREATE POLICY views_select_owner_or_admin ON public.annonce_views
  FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1 FROM public.annonces a
      WHERE a.id = annonce_views.annonce_id AND a.seller_id = auth.uid()
    )
  );

-- 3) Restrict seller_followers SELECT to authenticated users
DROP POLICY IF EXISTS followers_read_all ON public.seller_followers;
CREATE POLICY followers_read_authenticated ON public.seller_followers
  FOR SELECT
  TO authenticated
  USING (true);
REVOKE SELECT ON public.seller_followers FROM anon;
