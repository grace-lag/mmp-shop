import { isImage, isVideo } from "@/lib/uploads";
import { VoiceMessage } from "@/components/VoiceMessage";

function isAudio(type?: string | null) {
  return !!type && type.startsWith("audio/");
}

export function Attachment({ url, type, name, onImageClick, mine, dark }: { url: string; type?: string | null; name?: string | null; onImageClick?: (url: string) => void; mine?: boolean; dark?: boolean }) {
  if (!url) return null;
  if (isImage(type)) {
    return <img src={url} alt={name ?? "image"} onClick={onImageClick ? () => onImageClick(url) : undefined} style={{ maxWidth: 240, maxHeight: 240, borderRadius: 10, display: "block", marginTop: 6, cursor: onImageClick ? "zoom-in" : "default" }} />;
  }
  if (isVideo(type)) {
    return <video src={url} controls playsInline style={{ maxWidth: 280, maxHeight: 280, borderRadius: 10, display: "block", marginTop: 6 }} />;
  }
  if (isAudio(type)) {
    return <VoiceMessage url={url} mine={!!mine} dark={dark} />;
  }
  return (
    <a href={url} target="_blank" rel="noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 6, marginTop: 6, padding: "8px 12px", background: "#f1f5f9", color: "#0f172a", borderRadius: 8, textDecoration: "none", fontSize: 14 }}>
      📎 {name ?? "Fichier joint"}
    </a>
  );
}
