
-- ============================================
-- PHASE 1: Fondations BDD pour refonte globale
-- ============================================

-- 1) Table shorts (vidéos courtes type TikTok)
CREATE TABLE IF NOT EXISTS public.shorts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  annonce_id uuid REFERENCES public.annonces(id) ON DELETE SET NULL,
  video_url text NOT NULL,
  thumbnail_url text,
  caption text,
  views integer NOT NULL DEFAULT 0,
  likes_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.shorts TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.shorts TO authenticated;
GRANT ALL ON public.shorts TO service_role;

ALTER TABLE public.shorts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "shorts_public_read" ON public.shorts FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "shorts_owner_insert" ON public.shorts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "shorts_owner_update" ON public.shorts FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "shorts_owner_delete" ON public.shorts FOR DELETE TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS shorts_created_idx ON public.shorts (created_at DESC);
CREATE INDEX IF NOT EXISTS shorts_user_idx ON public.shorts (user_id);

-- 2) Table mots interdits + trigger
CREATE TABLE IF NOT EXISTS public.banned_words (
  word text PRIMARY KEY
);
GRANT SELECT ON public.banned_words TO authenticated;
GRANT ALL ON public.banned_words TO service_role;
ALTER TABLE public.banned_words ENABLE ROW LEVEL SECURITY;
CREATE POLICY "banned_words_read" ON public.banned_words FOR SELECT TO authenticated USING (true);

-- Liste de mots français interdits (insultes courantes + variantes)
INSERT INTO public.banned_words(word) VALUES
('con'),('cons'),('conne'),('connes'),('connard'),('connards'),('connasse'),('connasses'),
('pute'),('putes'),('putain'),('putains'),('salope'),('salopes'),('salopard'),('salopards'),
('enculé'),('encule'),('enculés'),('encules'),('enculée'),('enculee'),('enculer'),
('merde'),('merdes'),('merdeux'),('merdeuse'),('emmerde'),('emmerder'),
('bite'),('bites'),('couille'),('couilles'),('queue'),('zob'),('zizi'),('penis'),('pénis'),
('chatte'),('chattes'),('chibre'),('teub'),('teubé'),
('nique'),('niquer'),('niquée'),('niquees'),('niqués'),('niquer'),('nik'),('niktamere'),
('tg'),('ftg'),('ferme ta gueule'),('ta gueule'),('gueule'),
('batard'),('bâtard'),('batards'),('bâtards'),('batarde'),('bâtarde'),
('pédé'),('pede'),('pédés'),('pedes'),('pd'),('tapette'),('tarlouze'),('tarlouse'),
('gouine'),('gouines'),('fiotte'),('fiottes'),
('negro'),('nègre'),('negre'),('nègres'),('negres'),('bougnoul'),('bougnoule'),('bougnoules'),
('youpin'),('youpine'),('chinetoque'),('niakoué'),('niakoue'),
('fdp'),('fils de pute'),('fils de putes'),('filsdepute'),
('ntm'),('ntmere'),('nta'),
('clitoris'),('cul'),('culs'),('foutre'),('jouir'),('jouis'),('branler'),('branle'),('branleur'),('branleuse'),
('viol'),('violeur'),('violer'),('violée'),
('crève'),('creve'),('crever'),('suicide-toi'),('tue toi'),('tuetoi'),('vatecrever'),
('idiot'),('idiote'),('imbecile'),('imbécile'),('crétin'),('cretin'),('crétine'),('cretine'),
('débile'),('debile'),('attardé'),('attarde'),('attardée'),('attardee'),
('connasse'),('garce'),('garces'),('grognasse'),('grognasses'),
('couillon'),('couillonne'),('abruti'),('abrutie'),('abrutis'),
('chiotte'),('chiottes'),('chier'),('chiant'),('chiante'),('chiants'),('chiantes'),
('bordel'),('bordels'),('saloperie'),('saloperies'),
('arabe de merde'),('sale arabe'),('sale juif'),('sale noir'),('sale blanc'),('sale chinois'),
('mongol'),('mongole'),('mongoliens'),('handicapé de la tête'),
('encule ta mere'),('encule ta mère'),('niquetamere'),('niqueta mere'),
('shut up'),('fuck'),('fucking'),('fucker'),('fuckers'),('bitch'),('bitches'),('asshole'),('shit'),('motherfucker'),('cunt'),('whore'),('faggot'),('nigger'),('retard'),('retarded'),('dickhead'),
('damn'),('bastard'),('bastards'),('slut'),('sluts'),('jerk'),('moron'),('idiot')
ON CONFLICT (word) DO NOTHING;

CREATE OR REPLACE FUNCTION public.text_contains_banned(_text text)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _lower text;
  _w text;
BEGIN
  IF _text IS NULL OR length(trim(_text)) = 0 THEN RETURN false; END IF;
  _lower := lower(_text);
  FOR _w IN SELECT word FROM public.banned_words LOOP
    IF _lower ~ ('\m' || regexp_replace(_w, '([.\\+*?\[\^\]\$\(\)\{\}\=\!\<\>\|\:\-])', '\\\1', 'g') || '\M') THEN
      RETURN true;
    END IF;
  END LOOP;
  RETURN false;
END;
$$;

CREATE OR REPLACE FUNCTION public.block_banned_words_messages()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF public.text_contains_banned(NEW.content) THEN
    RAISE EXCEPTION 'Votre message contient des termes non autorisés.' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_block_banned_messages ON public.messages;
CREATE TRIGGER trg_block_banned_messages
BEFORE INSERT OR UPDATE OF content ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.block_banned_words_messages();

CREATE OR REPLACE FUNCTION public.block_banned_words_comments()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF public.text_contains_banned(NEW.content) THEN
    RAISE EXCEPTION 'Votre commentaire contient des termes non autorisés.' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_block_banned_comments ON public.annonce_comments;
CREATE TRIGGER trg_block_banned_comments
BEFORE INSERT OR UPDATE OF content ON public.annonce_comments
FOR EACH ROW EXECUTE FUNCTION public.block_banned_words_comments();

-- 3) is_job_offer sur annonces
ALTER TABLE public.annonces ADD COLUMN IF NOT EXISTS is_job_offer boolean NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS annonces_job_idx ON public.annonces (is_job_offer) WHERE is_job_offer = true;

-- 4) Trigger qui force tel rempli avant publication annonce/short
CREATE OR REPLACE FUNCTION public.require_phone_before_publish()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _tel text;
BEGIN
  SELECT NULLIF(trim(tel),'') INTO _tel FROM public.profiles WHERE id = auth.uid();
  IF _tel IS NULL THEN
    RAISE EXCEPTION 'Vous devez renseigner votre numéro de téléphone dans votre profil avant de publier.' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_require_phone_annonce ON public.annonces;
CREATE TRIGGER trg_require_phone_annonce
BEFORE INSERT ON public.annonces
FOR EACH ROW EXECUTE FUNCTION public.require_phone_before_publish();

DROP TRIGGER IF EXISTS trg_require_phone_short ON public.shorts;
CREATE TRIGGER trg_require_phone_short
BEFORE INSERT ON public.shorts
FOR EACH ROW EXECUTE FUNCTION public.require_phone_before_publish();

-- 5) RPC suppression conversation
CREATE OR REPLACE FUNCTION public.delete_conversation(_other_user uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.messages
  WHERE (sender_id = auth.uid() AND recipient_id = _other_user)
     OR (sender_id = _other_user AND recipient_id = auth.uid());
END;
$$;
GRANT EXECUTE ON FUNCTION public.delete_conversation(uuid) TO authenticated;

-- 6) RPC suppression commentaire safe
CREATE OR REPLACE FUNCTION public.delete_comment_safe(_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.annonce_comments
   WHERE id = _id
     AND (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
END;
$$;
GRANT EXECUTE ON FUNCTION public.delete_comment_safe(uuid) TO authenticated;

-- 7) Champ archived sur messages + RPC pour archiver une conversation
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS archived_by uuid[];

CREATE OR REPLACE FUNCTION public.archive_conversation(_other_user uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.messages
     SET archived_by = COALESCE(archived_by, ARRAY[]::uuid[]) || auth.uid()
   WHERE ((sender_id = auth.uid() AND recipient_id = _other_user)
       OR (sender_id = _other_user AND recipient_id = auth.uid()))
     AND NOT (auth.uid() = ANY(COALESCE(archived_by, ARRAY[]::uuid[])));
END;
$$;
GRANT EXECUTE ON FUNCTION public.archive_conversation(uuid) TO authenticated;
