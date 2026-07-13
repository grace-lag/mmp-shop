
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS account_type text NOT NULL DEFAULT 'personne',
  ADD COLUMN IF NOT EXISTS business_name text,
  ADD COLUMN IF NOT EXISTS business_year integer;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_account_type_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_account_type_check CHECK (account_type IN ('personne','entreprise'));

UPDATE public.profiles SET account_type = 'personne' WHERE account_type IS NULL OR account_type NOT IN ('personne','entreprise');
