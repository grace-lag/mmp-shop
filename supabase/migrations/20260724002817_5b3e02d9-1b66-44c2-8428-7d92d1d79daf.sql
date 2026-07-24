
-- Restore Data API grants that were dropped by a prior security migration.
GRANT SELECT (id, title, description, price, city, category, seller_id, seller_name, image_url, images, subcategory, views, likes_count, created_at, expires_at, is_job_offer) ON public.annonces TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.annonces TO authenticated;
GRANT ALL ON public.annonces TO service_role;

GRANT SELECT ON public.shorts TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shorts TO authenticated;
GRANT ALL ON public.shorts TO service_role;
