import { supabase } from "@/integrations/supabase/client";

export type PremiumSettings = {
  margin_percent: number;
  freight_per_kg: number;
  customs_percent: number;
  service_fee: number;
  deposit_percent: number;
  momo_number: string;
  office_address: string;
  eta_days_min: number;
  eta_days_max: number;
};

export type PremiumProduct = {
  id: string;
  title: string;
  description: string;
  images: string[];
  image_url: string;
  origin_country: string;
  shop_name: string;
  source_url: string;
  base_price: number;
  weight_kg: number;
  category: string;
  is_active: boolean;
  created_at: string;
};

export type PremiumOrder = {
  id: string;
  reference: string;
  kind: "catalog" | "sourcing";
  product_id: string | null;
  product_name: string;
  source_url: string;
  quantity: number;
  weight_kg: number;
  base_price: number;
  margin_amount: number;
  freight_amount: number;
  customs_amount: number;
  service_fee: number;
  total_amount: number;
  amount_due: number;
  payment_choice: "full" | "deposit";
  payment_method: "momo" | "cash";
  status: string;
  proof_url: string | null;
  full_name: string;
  phone: string;
  city: string;
  address: string;
  notes: string;
  eta_days_min: number;
  eta_days_max: number;
  admin_note: string;
  created_at: string;
  user_id: string;
};

export const PREMIUM_STATUS: { key: string; label: string }[] = [
  { key: "devis", label: "Devis en attente de paiement" },
  { key: "paiement_verification", label: "Paiement en vérification" },
  { key: "paye", label: "Paiement confirmé" },
  { key: "achat_effectue", label: "Achat effectué chez le fournisseur" },
  { key: "en_transit", label: "En transit vers le Congo" },
  { key: "douane", label: "En cours de dédouanement" },
  { key: "pret_retrait", label: "Prêt au retrait / livraison" },
  { key: "livre", label: "Livré" },
  { key: "annule", label: "Annulé" },
];

export function statusLabel(key: string) {
  return PREMIUM_STATUS.find((s) => s.key === key)?.label ?? key;
}

export function fcfa(n: number) {
  return new Intl.NumberFormat("fr-FR").format(Math.round(n)) + " FCFA";
}

export type Quote = {
  productPrice: number;
  margin: number;
  freight: number;
  customs: number;
  serviceFee: number;
  total: number;
};

export function computeQuote(
  s: PremiumSettings,
  opts: { basePrice: number; quantity: number; weightKg: number },
): Quote {
  const base = Math.max(0, opts.basePrice) * Math.max(1, opts.quantity);
  const margin = (base * s.margin_percent) / 100;
  const freight = Math.max(0, opts.weightKg) * Math.max(1, opts.quantity) * s.freight_per_kg;
  const customs = ((base + margin) * s.customs_percent) / 100;
  const serviceFee = s.service_fee;
  return {
    productPrice: base + margin,
    margin,
    freight,
    customs,
    serviceFee,
    total: base + margin + freight + customs + serviceFee,
  };
}

export async function getPremiumSettings(): Promise<PremiumSettings> {
  const { data, error } = await supabase.from("premium_settings").select("*").maybeSingle();
  if (error) throw error;
  return data as unknown as PremiumSettings;
}

export async function updatePremiumSettings(patch: Partial<PremiumSettings>) {
  const { error } = await supabase
    .from("premium_settings")
    .update({ ...patch, updated_at: new Date().toISOString() } as any)
    .eq("id", true);
  if (error) throw error;
}

export async function listPremiumProducts(opts?: { includeInactive?: boolean }) {
  let q = supabase.from("premium_products").select("*").order("created_at", { ascending: false });
  if (!opts?.includeInactive) q = q.eq("is_active", true);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as unknown as PremiumProduct[];
}

export async function getPremiumProduct(id: string) {
  const { data, error } = await supabase.from("premium_products").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return (data ?? null) as unknown as PremiumProduct | null;
}

export async function createPremiumProduct(input: Partial<PremiumProduct>) {
  const { data: u } = await supabase.auth.getUser();
  const { error } = await supabase
    .from("premium_products")
    .insert({ ...(input as any), created_by: u.user?.id ?? null });
  if (error) throw error;
}

export async function updatePremiumProduct(id: string, patch: Partial<PremiumProduct>) {
  const { error } = await supabase
    .from("premium_products")
    .update({ ...(patch as any), updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function deletePremiumProduct(id: string) {
  const { error } = await supabase.from("premium_products").delete().eq("id", id);
  if (error) throw error;
}

export async function createPremiumOrder(input: Partial<PremiumOrder>) {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error("Connecte-toi pour commander");
  const { data, error } = await supabase
    .from("premium_orders")
    .insert({ ...(input as any), user_id: u.user.id })
    .select("*")
    .single();
  if (error) throw error;
  return data as unknown as PremiumOrder;
}

export async function listMyPremiumOrders() {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return [];
  const { data, error } = await supabase
    .from("premium_orders")
    .select("*")
    .eq("user_id", u.user.id)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as PremiumOrder[];
}

export async function listAllPremiumOrders() {
  const { data, error } = await supabase
    .from("premium_orders")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as PremiumOrder[];
}

export async function updatePremiumOrder(id: string, patch: Partial<PremiumOrder>) {
  const { error } = await supabase
    .from("premium_orders")
    .update({ ...(patch as any), updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

const ALLOWED_PROOF_MIME = ["image/jpeg", "image/png", "image/webp", "application/pdf"];

export async function uploadPaymentProof(file: File, userId: string) {
  if (!ALLOWED_PROOF_MIME.includes(file.type)) {
    throw new Error("Format non supporté. Utilise une image (JPG, PNG, WEBP) ou un PDF.");
  }
  if (file.size > 5 * 1024 * 1024) throw new Error("Fichier trop volumineux (max 5 Mo).");
  const ext = file.type === "application/pdf" ? "pdf" : file.type.split("/")[1];
  const path = `${userId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage
    .from("payment-proofs")
    .upload(path, file, { upsert: false, contentType: file.type });
  if (error) throw error;
  return path;
}

export async function signedProofUrl(path: string) {
  const { data } = await supabase.storage.from("payment-proofs").createSignedUrl(path, 3600);
  return data?.signedUrl ?? "";
}
