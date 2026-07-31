-- 1) annonce_views: remove permissive direct INSERT, force use of the definer RPC
DROP POLICY IF EXISTS "views_insert_self_or_anon" ON public.annonce_views;

CREATE POLICY "views_insert_self_authenticated"
ON public.annonce_views
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid() AND session_id IS NULL);

REVOKE INSERT ON public.annonce_views FROM anon;

CREATE OR REPLACE FUNCTION public.increment_annonce_views(_id uuid, _session_id text DEFAULT NULL::text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _inserted boolean := false;
BEGIN
  IF _uid IS NOT NULL THEN
    INSERT INTO public.annonce_views(annonce_id, user_id)
    VALUES (_id, _uid)
    ON CONFLICT DO NOTHING;
    GET DIAGNOSTICS _inserted = ROW_COUNT;
  ELSIF _session_id IS NOT NULL THEN
    -- only accept a well-formed UUID session id
    IF _session_id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
      RETURN;
    END IF;
    -- basic anti-flood: ignore if this session already viewed recently
    IF EXISTS (
      SELECT 1 FROM public.annonce_views v
      WHERE v.annonce_id = _id AND v.session_id = _session_id
    ) THEN
      RETURN;
    END IF;
    INSERT INTO public.annonce_views(annonce_id, session_id)
    VALUES (_id, _session_id)
    ON CONFLICT DO NOTHING;
    GET DIAGNOSTICS _inserted = ROW_COUNT;
  END IF;
  IF _inserted THEN
    UPDATE public.annonces SET views = views + 1 WHERE id = _id;
  END IF;
END $function$;

REVOKE ALL ON FUNCTION public.increment_annonce_views(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_annonce_views(uuid, text) TO anon, authenticated;

-- 2) annonces: stop bulk exposure of phone/whatsapp
REVOKE SELECT (phone, whatsapp) ON public.annonces FROM authenticated;
REVOKE SELECT (phone, whatsapp) ON public.annonces FROM anon;

CREATE OR REPLACE FUNCTION public.get_annonce_contact(_id uuid)
RETURNS TABLE (phone text, whatsapp text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT a.phone, a.whatsapp
  FROM public.annonces a
  WHERE a.id = _id
    AND auth.uid() IS NOT NULL
  LIMIT 1
$function$;

REVOKE ALL ON FUNCTION public.get_annonce_contact(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_annonce_contact(uuid) TO authenticated;

-- 3) chat-files: exact path match instead of LIKE pattern
DROP POLICY IF EXISTS "chat_files_owner_read" ON storage.objects;

CREATE POLICY "chat_files_owner_read"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'chat-files'
  AND (
    (storage.foldername(name))[1] = (auth.uid())::text
    OR EXISTS (
      SELECT 1 FROM public.messages m
      WHERE split_part(m.attachment_url, '/chat-files/', 2) = objects.name
        AND (m.sender_id = auth.uid() OR m.receiver_id = auth.uid())
    )
  )
);