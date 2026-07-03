import { useEffect, useRef, useState } from "react";

interface Props {
  videoUrl: string;
  posterUrl?: string | null;
  alt?: string;
  height?: number;
}

/**
 * Displays a poster image for a short video. On iOS Safari, <video> elements
 * often render black until played; we grab the first frame via canvas and
 * render it as an <img> to guarantee a visible thumbnail.
 */
export function ShortThumb({ videoUrl, posterUrl, alt, height = 160 }: Props) {
  const [thumb, setThumb] = useState<string | null>(posterUrl ?? null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (posterUrl) { setThumb(posterUrl); return; }
    let cancelled = false;
    const v = document.createElement("video");
    videoRef.current = v;
    v.crossOrigin = "anonymous";
    v.preload = "metadata";
    v.muted = true;
    (v as any).playsInline = true;
    v.src = videoUrl;

    const capture = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = v.videoWidth || 320;
        canvas.height = v.videoHeight || 480;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
        const data = canvas.toDataURL("image/jpeg", 0.7);
        if (!cancelled) setThumb(data);
      } catch {
        /* CORS-tainted canvas, ignore */
      }
    };

    const onLoaded = () => {
      try { v.currentTime = Math.min(0.1, (v.duration || 1) / 2); } catch { capture(); }
    };
    v.addEventListener("loadeddata", onLoaded);
    v.addEventListener("seeked", capture);
    v.addEventListener("error", () => { /* ignore */ });

    return () => {
      cancelled = true;
      v.removeEventListener("loadeddata", onLoaded);
      v.removeEventListener("seeked", capture);
      v.src = "";
    };
  }, [videoUrl, posterUrl]);

  if (thumb) {
    return (
      <img
        src={thumb}
        alt={alt ?? "short"}
        style={{ width: "100%", height, objectFit: "cover", borderRadius: 8, background: "#000" }}
      />
    );
  }
  return (
    <div style={{ width: "100%", height, background: "#000", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}>
      ▶
    </div>
  );
}
