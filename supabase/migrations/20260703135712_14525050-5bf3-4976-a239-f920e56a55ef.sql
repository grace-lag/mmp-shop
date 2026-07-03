-- Notify seller when someone comments their annonce
CREATE OR REPLACE FUNCTION public.notify_annonce_comment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _seller uuid;
  _title text;
BEGIN
  SELECT seller_id, title INTO _seller, _title FROM public.annonces WHERE id = NEW.annonce_id;
  IF _seller IS NOT NULL AND _seller <> NEW.user_id THEN
    INSERT INTO public.notifications (user_id, actor_id, type, entity_type, entity_id, title)
    VALUES (_seller, NEW.user_id, 'comment_annonce', 'annonce', NEW.annonce_id, _title);
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_notify_annonce_comment ON public.annonce_comments;
CREATE TRIGGER trg_notify_annonce_comment
AFTER INSERT ON public.annonce_comments
FOR EACH ROW EXECUTE FUNCTION public.notify_annonce_comment();

-- Notify short owner when someone comments their short
CREATE OR REPLACE FUNCTION public.notify_short_comment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _owner uuid;
  _title text;
BEGIN
  SELECT user_id, COALESCE(title,'Votre short') INTO _owner, _title FROM public.shorts WHERE id = NEW.short_id;
  IF _owner IS NOT NULL AND _owner <> NEW.user_id THEN
    INSERT INTO public.notifications (user_id, actor_id, type, entity_type, entity_id, title)
    VALUES (_owner, NEW.user_id, 'comment_short', 'short', NEW.short_id, _title);
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_notify_short_comment ON public.shorts_comments;
CREATE TRIGGER trg_notify_short_comment
AFTER INSERT ON public.shorts_comments
FOR EACH ROW EXECUTE FUNCTION public.notify_short_comment();

-- Notify seller when someone follows their shop
CREATE OR REPLACE FUNCTION public.notify_new_follower()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.seller_id IS NOT NULL AND NEW.seller_id <> NEW.follower_id THEN
    INSERT INTO public.notifications (user_id, actor_id, type, entity_type, entity_id, title)
    VALUES (NEW.seller_id, NEW.follower_id, 'new_follower', 'user', NEW.follower_id, NULL);
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_notify_new_follower ON public.seller_followers;
CREATE TRIGGER trg_notify_new_follower
AFTER INSERT ON public.seller_followers
FOR EACH ROW EXECUTE FUNCTION public.notify_new_follower();

-- Attach comment triggers (they were defined earlier but may not be wired to the tables)
DROP TRIGGER IF EXISTS trg_notify_annonce_like ON public.annonce_likes;
CREATE TRIGGER trg_notify_annonce_like
AFTER INSERT ON public.annonce_likes
FOR EACH ROW EXECUTE FUNCTION public.notify_annonce_like();

DROP TRIGGER IF EXISTS trg_notify_short_like ON public.shorts_likes;
CREATE TRIGGER trg_notify_short_like
AFTER INSERT ON public.shorts_likes
FOR EACH ROW EXECUTE FUNCTION public.notify_short_like();