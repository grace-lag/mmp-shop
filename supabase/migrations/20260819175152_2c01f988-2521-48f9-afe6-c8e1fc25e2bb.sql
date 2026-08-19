CREATE TABLE public.premium_settings (
  id boolean PRIMARY KEY DEFAULT true,
  margin_percent numeric NOT NULL DEFAULT 20,
  freight_per_kg numeric NOT NULL DEFAULT 12000,
  customs_percent numeric NOT NULL DEFAULT 15,
  service_fee numeric NOT NULL DEFAULT 5000,
  deposit_percent numeric NOT NULL DEFAULT 50,
  momo_number text NOT NULL DEFAULT '+242 06 422 3575',
  office_address text NOT NULL DEFAULT 'Brazzaville, Congo',
  eta_days_min integer NOT NULL DEFAULT 10,
  eta_days_max integer NOT NULL DEFAULT 21,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT premium_settings_singleton CHECK (id)
);
GRANT SELECT ON public.premium_settings TO anon;
GRANT SELECT, INSERT, UPDATE ON public.premium_settings TO authenticated;
GRANT ALL ON public.premium_settings TO service_role;
ALTER TABLE public.premium_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY premium_settings_read ON public.premium_settings FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY premium_settings_admin_ins ON public.premium_settings FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY premium_settings_admin_upd ON public.premium_settings FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
INSERT INTO public.premium_settings (id) VALUES (true);

CREATE TABLE public.premium_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  images text[] NOT NULL DEFAULT '{}',
  image_url text NOT NULL DEFAULT '',
  origin_country text NOT NULL DEFAULT 'France',
  shop_name text NOT NULL DEFAULT '',
  source_url text NOT NULL DEFAULT '',
  base_price numeric NOT NULL DEFAULT 0,
  weight_kg numeric NOT NULL DEFAULT 1,
  category text NOT NULL DEFAULT '',
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.premium_products TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.premium_products TO authenticated;
GRANT ALL ON public.premium_products TO service_role;
ALTER TABLE public.premium_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY premium_products_public_read ON public.premium_products FOR SELECT TO anon, authenticated USING (is_active OR public.has_role(auth.uid(),'admin'));
CREATE POLICY premium_products_admin_ins ON public.premium_products FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY premium_products_admin_upd ON public.premium_products FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY premium_products_admin_del ON public.premium_products FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.premium_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference text NOT NULL UNIQUE DEFAULT ('MMP-' || upper(substr(md5(gen_random_uuid()::text),1,6))),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'catalog',
  product_id uuid REFERENCES public.premium_products(id) ON DELETE SET NULL,
  product_name text NOT NULL DEFAULT '',
  source_url text NOT NULL DEFAULT '',
  quantity integer NOT NULL DEFAULT 1,
  weight_kg numeric NOT NULL DEFAULT 1,
  base_price numeric NOT NULL DEFAULT 0,
  margin_amount numeric NOT NULL DEFAULT 0,
  freight_amount numeric NOT NULL DEFAULT 0,
  customs_amount numeric NOT NULL DEFAULT 0,
  service_fee numeric NOT NULL DEFAULT 0,
  total_amount numeric NOT NULL DEFAULT 0,
  amount_due numeric NOT NULL DEFAULT 0,
  payment_choice text NOT NULL DEFAULT 'full',
  payment_method text NOT NULL DEFAULT 'momo',
  status text NOT NULL DEFAULT 'devis',
  proof_url text,
  full_name text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  city text NOT NULL DEFAULT '',
  address text NOT NULL DEFAULT '',
  notes text NOT NULL DEFAULT '',
  eta_days_min integer NOT NULL DEFAULT 10,
  eta_days_max integer NOT NULL DEFAULT 21,
  admin_note text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.premium_orders TO authenticated;
GRANT ALL ON public.premium_orders TO service_role;
ALTER TABLE public.premium_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY premium_orders_select ON public.premium_orders FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY premium_orders_insert_own ON public.premium_orders FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY premium_orders_update ON public.premium_orders FOR UPDATE TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin')) WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

CREATE INDEX premium_orders_user_idx ON public.premium_orders(user_id, created_at DESC);
CREATE INDEX premium_products_active_idx ON public.premium_products(is_active, created_at DESC);

CREATE POLICY "payment_proofs_insert_own" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'payment-proofs' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "payment_proofs_read_own_or_admin" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'payment-proofs' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.has_role(auth.uid(),'admin')));