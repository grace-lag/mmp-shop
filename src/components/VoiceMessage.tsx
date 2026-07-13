import { useEffect, useRef, useState } from "react";
import { Play, Pause } from "lucide-react";

/**
 * WhatsApp-style audio player: one line, longer progress bar,
 * elapsed time while playing (falls back to total when idle),
 * no download button.
 */
export function VoiceMessage({ url, mine, dark }: { url: string; mine: boolean; dark?: boolean }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const onTime = () => setCurrent(a.currentTime);
    const onMeta = () => {
      const d = isFinite(a.duration) ? a.duration : 0;
      setDuration(d);
      setLoaded(true);
    };
    const onEnd = () => { setPlaying(false); setCurrent(0); };
    a.addEventListener("timeupdate", onTime);
    a.addEventListener("loadedmetadata", onMeta);
    a.addEventListener("durationchange", onMeta);
    a.addEventListener("ended", onEnd);
    return () => {
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("loadedmetadata", onMeta);
      a.removeEventListener("durationchange", onMeta);
      a.removeEventListener("ended", onEnd);
    };
  }, []);

  const toggle = () => {
    const a = audioRef.current;
    if (!a) return;
    if (playing) { a.pause(); setPlaying(false); }
    else { a.play().then(() => setPlaying(true)).catch(() => {}); }
  };

  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    const a = audioRef.current;
    if (!a || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    a.currentTime = pct * duration;
    setCurrent(a.currentTime);
  };

  const fmt = (s: number) => {
    if (!isFinite(s) || s < 0) s = 0;
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${String(sec).padStart(2, "0")}`;
  };

  const pct = duration > 0 ? (current / duration) * 100 : 0;
  const displayTime = playing || current > 0 ? current : duration;

  const fg = mine ? "#fff" : (dark ? "#e5e7eb" : "#0f172a");
  const bar = mine ? "rgba(255,255,255,0.35)" : (dark ? "#4b5563" : "#e2e8f0");
  const fill = mine ? "#fff" : (dark ? "#e5e7eb" : "#0f172a");
  const btnBg = mine ? "rgba(255,255,255,0.2)" : (dark ? "#4b5563" : "#f1f5f9");

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 4, minWidth: 240, maxWidth: 320 }}>
      <audio ref={audioRef} src={url} preload="metadata" style={{ display: "none" }} />
      <button
        type="button"
        onClick={toggle}
        aria-label={playing ? "Pause" : "Lire"}
        style={{
          width: 36, height: 36, borderRadius: "50%", background: btnBg,
          border: "none", cursor: "pointer", color: fg, flexShrink: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}
      >
        {playing ? <Pause size={16} /> : <Play size={16} />}
      </button>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4 }}>
        <div
          onClick={seek}
          style={{
            height: 4, borderRadius: 2, background: bar, cursor: loaded && duration > 0 ? "pointer" : "default",
            position: "relative", overflow: "hidden",
          }}
        >
          <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${pct}%`, background: fill, transition: "width 0.1s linear" }} />
        </div>
        <div style={{ fontSize: 11, color: fg, opacity: 0.9, fontVariantNumeric: "tabular-nums" }}>
          🎙️ {fmt(displayTime)}
        </div>
      </div>
    </div>
  );
}
