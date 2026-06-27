DROP POLICY IF EXISTS profiles_delete_own ON public.profiles;
CREATE POLICY profiles_delete_own
ON public.profiles
FOR DELETE
TO authenticated
USING (auth.uid() = id);

DROP POLICY IF EXISTS profiles_delete_admin ON public.profiles;
CREATE POLICY profiles_delete_admin
ON public.profiles
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS annonces_delete_own ON public.annonces;
CREATE POLICY annonces_delete_own
ON public.annonces
FOR DELETE
TO authenticated
USING ((auth.uid() = seller_id) OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS annonces_update_own ON public.annonces;
CREATE POLICY annonces_update_own
ON public.annonces
FOR UPDATE
TO authenticated
USING ((auth.uid() = seller_id) OR public.has_role(auth.uid(), 'admin'))
WITH CHECK ((auth.uid() = seller_id) OR public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.delete_annonce_cascade(_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _seller uuid;
BEGIN
  SELECT seller_id INTO _seller FROM public.annonces WHERE id = _id;
  IF _seller IS NULL THEN
    RETURN;
  END IF;

  IF auth.uid() IS NULL OR (auth.uid() <> _seller AND NOT public.has_role(auth.uid(), 'admin')) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  DELETE FROM public.annonce_comments WHERE annonce_id = _id;
  DELETE FROM public.annonce_likes WHERE annonce_id = _id;
  DELETE FROM public.annonce_views WHERE annonce_id = _id;
  DELETE FROM public.favorites WHERE annonce_id = _id;
  DELETE FROM public.orders WHERE annonce_id = _id;
  UPDATE public.messages SET annonce_id = NULL WHERE annonce_id = _id;
  DELETE FROM public.annonces WHERE id = _id;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_annonce_cascade(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_annonce_cascade(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_annonce_cascade(uuid) TO service_role;