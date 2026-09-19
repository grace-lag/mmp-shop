import { supabase } from "@/integrations/supabase/client";

export type Banner = {
  id: string;
  media_url: string;
  media_type: "image" | "video";
  caption: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
};

export type BannerSlide = Banner & { url: string };

const BUCKET = "site-banners";
const SIGNED_TTL = 60 * 60 * 24 * 7; // 7 jours

async function toSlides(rows: Banner[]): Promise<BannerSlide[]> {
  const out: BannerSlide[] = [];
  for (const r of rows) {
    if (/^https?:\/\//.test(r.media_url)) {
      out.push({ ...r, url: r.media_url });
      continue;
    }
    const { data } = await supabase.storage.from(BUCKET).createSignedUrl(r.media_url, SIGNED_TTL);
    if (data?.signedUrl) out.push({ ...r, url: data.signedUrl });
  }
  return out;
}

export async function listBanners(opts?: { all?: boolean }): Promise<BannerSlide[]> {
  let q = supabase
    .from("site_banners" as any)
    .select("id,media_url,media_type,caption,sort_order,is_active,created_at")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (!opts?.all) q = q.eq("is_active", true);
  const { data, error } = await q;
  if (error) throw error;
  return toSlides((data ?? []) as unknown as Banner[]);
}

const IMAGE_MIME = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const VIDEO_MIME = ["video/mp4", "video/webm", "video/quicktime"];
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_VIDEO_BYTES = 10 * 1024 * 1024;
const MAX_VIDEO_SECONDS = 60;

function extFromName(name: string, fallback: string) {
  const m = name.toLowerCase().match(/\.([a-z0-9]+)$/);
  return m ? m[1] : fallback;
}

export async function videoDuration(file: File): Promise<number> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const v = document.createElement("video");
    v.preload = "metadata";
    v.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve(Number.isFinite(v.duration) ? v.duration : 0);
    };
    v.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(0);
    };
    v.src = url;
  });
}

export async function uploadBanner(file: File, caption: string, sortOrder: number) {
  const isImage = IMAGE_MIME.includes(file.type);
  const isVideo = VIDEO_MIME.includes(file.type);
  if (!isImage && !isVideo) throw new Error("Format non supporté (JPG, PNG, WEBP, GIF, MP4, WEBM).");
  if (isImage && file.size > MAX_IMAGE_BYTES) throw new Error(`« ${file.name} » : image trop lourde (max 5 Mo).`);
  if (isVideo) {
    if (file.size > MAX_VIDEO_BYTES) throw new Error(`« ${file.name} » : vidéo trop lourde (max 10 Mo).`);
    const d = await videoDuration(file);
    if (d > MAX_VIDEO_SECONDS + 0.5) throw new Error(`« ${file.name} » : vidéo trop longue (max 60 secondes).`);
  }

  const ext = extFromName(file.name, isVideo ? "mp4" : "jpg");
  const path = `${crypto.randomUUID()}.${ext}`;
  const { error: upErr } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { upsert: false, contentType: file.type });
  if (upErr) throw upErr;

  const { error } = await supabase.from("site_banners" as any).insert({
    media_url: path,
    media_type: isVideo ? "video" : "image",
    caption,
    sort_order: sortOrder,
  } as any);
  if (error) throw error;
}

export async function updateBanner(id: string, patch: Partial<Pick<Banner, "caption" | "sort_order" | "is_active">>) {
  const { error } = await supabase
    .from("site_banners" as any)
    .update({ ...patch, updated_at: new Date().toISOString() } as any)
    .eq("id", id);
  if (error) throw error;
}

export async function deleteBanner(banner: Banner) {
  const { error } = await supabase.from("site_banners" as any).delete().eq("id", banner.id);
  if (error) throw error;
  if (!/^https?:\/\//.test(banner.media_url)) {
    await supabase.storage.from(BUCKET).remove([banner.media_url]);
  }
}
