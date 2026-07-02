
-- Price column for shorts
ALTER TABLE public.shorts ADD COLUMN IF NOT EXISTS price numeric;

-- Notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  type text NOT NULL,
  entity_type text,
  entity_id uuid,
  title text,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notif_select_own" ON public.notifications;
CREATE POLICY "notif_select_own" ON public.notifications FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "notif_update_own" ON public.notifications;
CREATE POLICY "notif_update_own" ON public.notifications FOR UPDATE TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "notif_delete_own" ON public.notifications;
CREATE POLICY "notif_delete_own" ON public.notifications FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS notifications_user_created_idx ON public.notifications(user_id, created_at DESC);

-- Trigger: notify seller on annonce like
CREATE OR REPLACE FUNCTION public.notify_annonce_like()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _seller uuid;
  _title text;
BEGIN
  SELECT seller_id, title INTO _seller, _title FROM public.annonces WHERE id = NEW.annonce_id;
  IF _seller IS NOT NULL AND _seller <> NEW.user_id THEN
    INSERT INTO public.notifications (user_id, actor_id, type, entity_type, entity_id, title)
    VALUES (_seller, NEW.user_id, 'like_annonce', 'annonce', NEW.annonce_id, _title);
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_notify_annonce_like ON public.annonce_likes;
CREATE TRIGGER trg_notify_annonce_like AFTER INSERT ON public.annonce_likes
FOR EACH ROW EXECUTE FUNCTION public.notify_annonce_like();

-- Trigger: notify short owner on short like
CREATE OR REPLACE FUNCTION public.notify_short_like()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _owner uuid;
  _title text;
BEGIN
  SELECT user_id, COALESCE(title, 'Votre short') INTO _owner, _title FROM public.shorts WHERE id = NEW.short_id;
  IF _owner IS NOT NULL AND _owner <> NEW.user_id THEN
    INSERT INTO public.notifications (user_id, actor_id, type, entity_type, entity_id, title)
    VALUES (_owner, NEW.user_id, 'like_short', 'short', NEW.short_id, _title);
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_notify_short_like ON public.shorts_likes;
CREATE TRIGGER trg_notify_short_like AFTER INSERT ON public.shorts_likes
FOR EACH ROW EXECUTE FUNCTION public.notify_short_like();
