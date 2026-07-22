import { supabase } from "@/integrations/supabase/client";

export type Annonce = {
  id: string;
  title: string;
  description: string;
  price: number;
  city: string;
  category: string;
  subcategory: string;
  seller_id: string | null;
  seller_name: string;
  phone: string;
  whatsapp: string;
  image_url: string;
  images: string[];
  views: number;
  likes_count: number;
  created_at: string;
};

export const CATEGORIES = [
  "Électronique",
  "Habillement",
  "Véhicules",
  "Meubles",
  "Maison",
  "Équipements de construction",
  "Emplois",
  "Restaurant",
  "Alimentation",
  "Services",
  "Autres",
];

export const CATEGORY_ICONS: Record<string, string> = {
  "Électronique": "📱",
  "Habillement": "👗",
  "Véhicules": "🚗",
  "Meubles": "🛋️",
  "Maison": "🏠",
  "Équipements de construction": "🏗️",
  "Emplois": "💼",
  "Restaurant": "🍽️",
  "Alimentation": "🍎",
  "Services": "🛠️",
  "Autres": "📦",
};

export const SUBCATEGORIES: Record<string, string[]> = {
  "Habillement": ["Accessoires", "Vêtements", "Chaussures"],
};

export const CITIES = ["Brazzaville", "Pointe-Noire", "Dolisie", "Nkayi", "Tout Congo"];

export function formatPrice(p: number) {
  return new Intl.NumberFormat("fr-FR").format(p) + " FCFA";
}

const PUBLIC_COLS = "id,title,description,price,city,category,subcategory,seller_id,seller_name,image_url,images,views,likes_count,created_at";

export async function listAnnonces(opts?: { search?: string; city?: string; category?: string; subcategory?: string; limit?: number; excludeUserId?: string | null; includeExpired?: boolean; includeJobs?: boolean }) {
  let q = supabase.from("annonces").select(PUBLIC_COLS + ",expires_at,seller_id").order("created_at", { ascending: false });
  if (opts?.search) q = q.ilike("title", `%${opts.search}%`);
  if (opts?.city && opts.city !== "Tout Congo") q = q.eq("city", opts.city);
  if (opts?.category) q = q.eq("category", opts.category);
  else if (!opts?.includeJobs) q = q.neq("category", "Emplois");
  if (opts?.subcategory) q = q.eq("subcategory", opts.subcategory);
  if (opts?.excludeUserId) q = q.neq("seller_id", opts.excludeUserId);
  if (!opts?.includeExpired) q = q.gt("expires_at", new Date().toISOString());
  if (opts?.limit) q = q.limit(opts.limit);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as unknown as Annonce[];
}

export async function renewAnnonce(id: string) {
  const { error } = await supabase.rpc("renew_annonce", { _id: id });
  if (error) throw error;
}

export async function listMyAnnonces(userId: string, opts?: { expired?: boolean }) {
  let q = supabase
    .from("annonces")
    .select(PUBLIC_COLS + ",expires_at,seller_id")
    .eq("seller_id", userId)
    .order("created_at", { ascending: false });
  if (opts?.expired === true) q = q.lte("expires_at", new Date().toISOString());
  if (opts?.expired === false) q = q.gt("expires_at", new Date().toISOString());
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as unknown as (Annonce & { expires_at: string })[];
}

export async function getAnnonce(id: string) {
  // Always fetch the public/safe column set — column-level SELECT grants can reject
  // `select("*")` for authenticated non-owners on restricted columns (phone/whatsapp),
  // which used to make the detail page show "Annonce introuvable".
  const { data, error } = await supabase
    .from("annonces")
    .select(PUBLIC_COLS + ",expires_at")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  // Try to enrich with contact fields — allowed by RLS for the owner (and public
  // annonces that still expose them). Silently ignore if the DB rejects it.
  const { data: contact } = await supabase
    .from("annonces")
    .select("phone,whatsapp")
    .eq("id", id)
    .maybeSingle();
  return { ...(data as any), phone: contact?.phone ?? "", whatsapp: contact?.whatsapp ?? "" } as Annonce;
}

function getSessionId(): string {
  if (typeof window === "undefined") return "";
  let s = localStorage.getItem("anon_session_id");
  if (!s) {
    s = crypto.randomUUID();
    localStorage.setItem("anon_session_id", s);
  }
  return s;
}

export async function incrementViews(id: string) {
  await supabase.rpc("increment_annonce_views", { _id: id, _session_id: getSessionId() });
}

export type Comment = {
  id: string;
  annonce_id: string;
  user_id: string;
  content: string;
  created_at: string;
  author?: { prenom: string | null; nom: string | null; avatar_url: string | null } | null;
};

export async function listComments(annonceId: string): Promise<any[]> {
  const { data, error } = await supabase
    .from("annonce_comments")
    .select("id,annonce_id,user_id,content,attachment_url,attachment_type,attachment_name,created_at")
    .eq("annonce_id", annonceId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  const rows = (data ?? []) as any[];
  const ids = Array.from(new Set(rows.map((r) => r.user_id)));
  if (ids.length === 0) return rows;
  const { data: profs } = await supabase
    .from("profiles")
    .select("id,prenom,nom,avatar_url")
    .in("id", ids);
  const map = new Map((profs ?? []).map((p: any) => [p.id, p]));
  return rows.map((r) => ({ ...r, author: map.get(r.user_id) ?? null }));
}

export async function addComment(
  annonceId: string,
  payload: string | { content: string | null; attachment_url?: string; attachment_type?: string; attachment_name?: string }
) {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error("Connecte-toi pour commenter");
  const row = typeof payload === "string"
    ? { annonce_id: annonceId, user_id: u.user.id, content: payload }
    : { annonce_id: annonceId, user_id: u.user.id, ...payload };
  const { error } = await supabase.from("annonce_comments").insert(row);
  if (error) throw error;
}

export async function deleteComment(commentId: string) {
  const { error } = await (supabase as any).rpc("delete_comment_safe", { _id: commentId });
  if (error) throw error;
}

export async function toggleLikeAnnonce(annonceId: string): Promise<boolean> {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error("Connecte-toi pour aimer");
  const { data: existing } = await supabase
    .from("annonce_likes")
    .select("id")
    .eq("annonce_id", annonceId)
    .eq("user_id", u.user.id)
    .maybeSingle();
  if (existing) {
    await supabase.from("annonce_likes").delete().eq("id", existing.id);
    return false;
  }
  await supabase.from("annonce_likes").insert({ annonce_id: annonceId, user_id: u.user.id });
  return true;
}

const ALLOWED_IMAGE_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};
const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB

function assertImageFile(file: File) {
  const ext = ALLOWED_IMAGE_MIME[file.type];
  if (!ext) {
    throw new Error("Format non supporté. Utilise JPG, PNG, WEBP ou GIF.");
  }
  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error("Image trop volumineuse (max 5 Mo).");
  }
  return ext;
}

export async function uploadAnnonceImage(file: File, userId: string): Promise<string> {
  const ext = assertImageFile(file);
  const path = `${userId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage
    .from("annonces-images")
    .upload(path, file, { upsert: false, contentType: file.type });
  if (error) throw error;
  const { data } = supabase.storage.from("annonces-images").getPublicUrl(path);
  return data.publicUrl;
}

export async function createAnnonce(input: Omit<Annonce, "id" | "created_at" | "seller_id" | "views" | "likes_count">) {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error("Non connecté");
  const { data, error } = await supabase
    .from("annonces")
    .insert({ ...input, seller_id: u.user.id })
    .select()
    .single();
  if (error) throw error;
  return data as Annonce;
}

export async function updateAnnonce(id: string, patch: Partial<Annonce> & { images?: string[] }) {
  const { error } = await supabase.from("annonces").update(patch as any).eq("id", id);
  if (error) throw error;
}

export async function deleteAnnonce(id: string) {
  const { error } = await supabase.from("annonces").delete().eq("id", id);
  if (error) throw error;
}

export async function uploadAvatar(file: File, userId: string): Promise<string> {
  const ext = assertImageFile(file);
  const path = `${userId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage
    .from("avatars")
    .upload(path, file, { upsert: false, contentType: file.type });
  if (error) throw error;
  const { data } = supabase.storage.from("avatars").getPublicUrl(path);
  return `${data.publicUrl}?t=${Date.now()}`;
}
