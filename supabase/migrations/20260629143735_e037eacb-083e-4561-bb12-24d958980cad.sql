GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_comment_safe(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_conversation(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.archive_conversation(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.renew_annonce(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.touch_last_seen() TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_annonce_views(uuid, text) TO authenticated, anon;