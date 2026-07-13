import { useEffect, useState } from "react";
import logoAsset from "@/assets/logo-mamarketplace.jpeg.asset.json";

const SHOWN_KEY = "splash_shown_v2";
const logoUrl = logoAsset.url;

export function SplashScreen() {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (!sessionStorage.getItem(SHOWN_KEY)) setVisible(true);
  }, []);

  useEffect(() => {
    if (!visible) return;
    const t1 = setTimeout(() => setFading(true), 1400);
    const t2 = setTimeout(() => {
      sessionStorage.setItem(SHOWN_KEY, "1");
      setVisible(false);
    }, 1900);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [visible]);

  if (!mounted || !visible) return null;

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        background: "linear-gradient(180deg,#15803d 0%,#ea580c 100%)",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        gap: 22, opacity: fading ? 0 : 1, transition: "opacity 500ms ease-in-out",
      }}
    >
      <img
        src={logoUrl}
        alt="MMP Shop"
        style={{ width: 130, height: 130, borderRadius: 26, objectFit: "cover", boxShadow: "0 10px 30px rgba(0,0,0,0.35)" }}
      />
      <div style={{ color: "#fff", fontWeight: 800, fontSize: "1.8rem", letterSpacing: 1, textShadow: "0 2px 6px rgba(0,0,0,0.4)" }}>
        MMP Shop
      </div>
      <div style={{ color: "rgba(255,255,255,0.9)", fontSize: "0.85rem", fontStyle: "italic" }}>
        MaMarketplace E-Shop
      </div>
    </div>
  );
}
