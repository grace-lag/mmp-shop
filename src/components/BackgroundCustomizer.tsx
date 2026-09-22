import { useEffect, useRef, useState } from "react";
import { Image as ImageIcon, Palette, RotateCcw, X, Check } from "lucide-react";
import { toast } from "sonner";
import { lsGet, lsSet } from "@/lib/safe-storage";
import {
  BG_COLOR_KEY,
  BG_EVENT,
  BG_IMAGE_KEY,
  BG_MODE_KEY,
  applyBgPref,
  readBgPref,
  type BgPref,
} from "@/components/BackgroundManager";

const PRESETS = ["#f7e6d0", "#ffffff", "#f1f5f9", "#e8f5e9", "#fff3e0", "#e3f2fd", "#fce4ec", "#0b1220"];
const ACCEPTED = ["image/jpeg", "image/png", "image/webp"];

/** Downscale + compress an imported picture so the site stays light. */
async function compress(file: File): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result));
    fr.onerror = () => reject(new Error("Lecture du fichier impossible."));
    fr.readAsDataURL(file);
  });
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = () => reject(new Error("Image illisible."));
    i.src = dataUrl;
  });
  const max = 1280;
  const scale = Math.min(1, max / Math.max(img.width, img.height));
  const w = Math.max(1, Math.round(img.width * scale));
  const h = Math.max(1, Math.round(img.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Compression impossible sur cet appareil.");
  ctx.drawImage(img, 0, 0, w, h);
  let quality = 0.72;
  let out = canvas.toDataURL("image/jpeg", quality);
  while (out.length > 1_200_000 && quality > 0.35) {
    quality -= 0.12;
    out = canvas.toDataURL("image/jpeg", quality);
  }
  if (out.length > 1_600_000) throw new Error("Image trop lourde, choisissez-en une plus petite.");
  return out;
}

export function BackgroundCustomizer({ onClose }: { onClose: () => void }) {
  const saved = useRef<BgPref>(readBgPref());
  const [mode, setMode] = useState<BgPref["mode"]>(saved.current.mode);
  const [color, setColor] = useState(saved.current.color ?? "#f7e6d0");
  const [image, setImage] = useState<string | undefined>(saved.current.image);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Real-time preview: the whole site updates while the panel is open.
  useEffect(() => {
    applyBgPref({ mode, color, image });
  }, [mode, color, image]);

  const cancel = () => {
    applyBgPref(saved.current);
    onClose();
  };

  const apply = () => {
    lsSet(BG_MODE_KEY, mode);
    if (color) lsSet(BG_COLOR_KEY, color);
    lsSet(BG_IMAGE_KEY, mode === "image" && image ? image : "");
    const pref: BgPref = { mode, color, image };
    applyBgPref(pref);
    window.dispatchEvent(new CustomEvent(BG_EVENT, { detail: pref }));
    if (lsGet(BG_MODE_KEY) !== mode) {
      toast.error("Votre navigateur bloque l'enregistrement : le choix ne sera pas conservé.");
    } else {
      toast.success("Arrière-plan enregistré.");
    }
    saved.current = pref;
    onClose();
  };

  const reset = () => {
    setMode("default");
    setColor("#f7e6d0");
    setImage(undefined);
    lsSet(BG_MODE_KEY, "default");
    lsSet(BG_IMAGE_KEY, "");
    lsSet(BG_COLOR_KEY, "#f7e6d0");
    applyBgPref({ mode: "default" });
    window.dispatchEvent(new CustomEvent(BG_EVENT, { detail: { mode: "default" } as BgPref }));
    saved.current = { mode: "default" };
    toast.success("Arrière-plan par défaut rétabli.");
  };

  const pickFile = async (file?: File | null) => {
    if (!file) return;
    if (!ACCEPTED.includes(file.type)) {
      toast.error("Formats acceptés : JPEG, PNG ou WebP.");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      toast.error("Image trop lourde (max 8 Mo).");
      return;
    }
    setBusy(true);
    try {
      const out = await compress(file);
      setImage(out);
      setMode("image");
    } catch (e: any) {
      toast.error(e?.message ?? "Import impossible.");
    } finally {
      setBusy(false);
    }
  };

  const Option = ({ value, label, Icon }: { value: BgPref["mode"]; label: string; Icon: any }) => (
    <button
      onClick={() => setMode(value)}
      style={{
        flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
        padding: "10px 6px", borderRadius: 12, cursor: "pointer", fontSize: "0.78rem", fontWeight: 600,
        border: mode === value ? "2px solid #ea580c" : "1px solid #e5e7eb",
        background: mode === value ? "rgba(234,88,12,0.08)" : "transparent",
        color: "inherit",
      }}
    >
      <Icon size={18} strokeWidth={1.8} color="#ea580c" />
      {label}
    </button>
  );

  return (
    <div
      onClick={cancel}
      style={{ position: "fixed", inset: 0, zIndex: 3000, background: "rgba(15,23,42,0.45)", display: "flex", alignItems: "flex-end", justifyContent: "center" }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="card"
        style={{ width: "100%", maxWidth: 480, background: "#fff", borderRadius: "16px 16px 0 0", padding: 16, maxHeight: "88vh", overflowY: "auto" }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <strong>Personnaliser l'arrière-plan</strong>
          <button onClick={cancel} style={{ background: "transparent", border: 0, cursor: "pointer", color: "inherit" }}><X size={20} /></button>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <Option value="default" label="Par défaut" Icon={RotateCcw} />
          <Option value="color" label="Couleur" Icon={Palette} />
          <Option value="image" label="Image" Icon={ImageIcon} />
        </div>

        {mode === "color" && (
          <div style={{ marginTop: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <input type="color" value={color} onChange={(e) => setColor(e.target.value)} style={{ width: 52, height: 36, border: 0, background: "transparent", cursor: "pointer" }} />
              <span style={{ fontSize: "0.85rem", color: "#64748b" }}>{color}</span>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
              {PRESETS.map((c) => (
                <button key={c} onClick={() => setColor(c)} aria-label={c}
                  style={{ width: 30, height: 30, borderRadius: 999, background: c, cursor: "pointer", border: color === c ? "2px solid #ea580c" : "1px solid #cbd5e1" }} />
              ))}
            </div>
          </div>
        )}

        {mode === "image" && (
          <div style={{ marginTop: 14 }}>
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: "none" }}
              onChange={(e) => { void pickFile(e.target.files?.[0]); e.currentTarget.value = ""; }} />
            <button onClick={() => fileRef.current?.click()} disabled={busy}
              style={{ padding: "10px 14px", borderRadius: 10, border: "1px solid #fed7aa", background: "#fff7ed", color: "#9a3412", fontWeight: 700, cursor: "pointer" }}>
              {busy ? "Traitement…" : image ? "Changer l'image" : "Choisir une image"}
            </button>
            <p style={{ fontSize: "0.75rem", color: "#64748b", marginTop: 8 }}>JPEG, PNG ou WebP — l'image est compressée automatiquement pour garder le site rapide.</p>
            {image && (
              <div style={{ marginTop: 10, height: 110, borderRadius: 12, backgroundImage: `url("${image}")`, backgroundSize: "cover", backgroundPosition: "center" }} />
            )}
          </div>
        )}

        <div style={{ display: "flex", gap: 8, marginTop: 18 }}>
          <button onClick={reset} style={{ flex: 1, padding: "12px 10px", borderRadius: 12, border: "1px solid #e5e7eb", background: "transparent", color: "inherit", fontWeight: 700, cursor: "pointer" }}>
            Réinitialiser
          </button>
          <button onClick={apply} style={{ flex: 1, padding: "12px 10px", borderRadius: 12, border: 0, background: "#ea580c", color: "#fff", fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
            <Check size={16} /> Appliquer
          </button>
        </div>
      </div>
    </div>
  );
}
