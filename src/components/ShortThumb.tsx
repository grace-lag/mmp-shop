import { useEffect, useRef, useState } from "react";

interface Props {
  videoUrl: string;
  posterUrl?: string | null;
  alt?: string;
  height?: number;
}

/**
 * Displays a thumbnail for a short video.
 * 1) If a posterUrl is provided, uses it directly.
 * 2) Otherwise tries to capture the first frame via canvas (works on desktop / Android).
 * 3) If that fails (iOS Safari + CORS-tainted canvas is common), falls back to a
 *    native <video> element with a `#t=0.1` media fragment so iOS displays the
 *    frame at 0.1s as a preview instead of a black square.
 */
export function ShortThumb({ videoUrl, posterUrl, alt, height = 160 }: Props) {
  const [thumb, setThumb] = useState<string | null>(posterUrl ?? null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (posterUrl) { setThumb(posterUrl); return; }
    let cancelled = false;
    const v = document.createElement("video");
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
        if (!ctx) { setFailed(true); return; }
        ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
        const data = canvas.toDataURL("image/jpeg", 0.7);
        if (!cancelled) setThumb(data);
      } catch {
        if (!cancelled) setFailed(true);
      }
    };

    const onLoaded = () => {
      try { v.currentTime = Math.min(0.1, (v.duration || 1) / 2); } catch { capture(); }
    };
    v.addEventListener("loadeddata", onLoaded);
    v.addEventListener("seeked", capture);
    v.addEventListener("error", () => { if (!cancelled) setFailed(true); });

    // If nothing happened after 2.5s, mark failed so iOS fallback appears
    const t = window.setTimeout(() => { if (!cancelled && !thumb) setFailed(true); }, 2500);

    return () => {
      cancelled = true;
      window.clearTimeout(t);
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

  // iOS-friendly fallback: `#t=0.1` fragment makes iOS Safari display a frame instead of black.
  if (failed || /iPhone|iPad|iPod/i.test(typeof navigator !== "undefined" ? navigator.userAgent : "")) {
    const src = videoUrl.includes("#t=") ? videoUrl : `${videoUrl}#t=0.1`;
    return (
      <video
        src={src}
        muted
        playsInline
        preload="metadata"
        // @ts-expect-error webkit-only
        webkit-playsinline="true"
        style={{ width: "100%", height, objectFit: "cover", borderRadius: 8, background: "#000", display: "block" }}
      />
    );
  }

  return (
    <div style={{ width: "100%", height, background: "#000", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}>
      ▶
    </div>
  );
}
