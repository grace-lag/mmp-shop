import { supabase } from "@/integrations/supabase/client";

export type AttachmentInfo = { url: string; type: string; name: string };

const MAX_BYTES = 25 * 1024 * 1024; // 25 MB

/** Upload tout type de fichier dans le bucket "annonces-images" (public). */
export async function uploadChatFile(file: File, userId: string, folder: "chat" | "comments" = "chat"): Promise<AttachmentInfo> {
  if (file.size > MAX_BYTES) throw new Error("Fichier trop volumineux (max 25 Mo).");
  const ext = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "bin";
  const path = `${userId}/${folder}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage
    .from("annonces-images")
    .upload(path, file, { upsert: false, contentType: file.type || "application/octet-stream" });
  if (error) throw error;
  const { data } = supabase.storage.from("annonces-images").getPublicUrl(path);
  return { url: data.publicUrl, type: file.type || "application/octet-stream", name: file.name };
}

export function isImage(type?: string | null) {
  return !!type && type.startsWith("image/");
}
export function isVideo(type?: string | null) {
  return !!type && type.startsWith("video/");
}
