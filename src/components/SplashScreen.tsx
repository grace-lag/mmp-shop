import { useEffect, useState } from "react";
import logoAsset from "@/assets/logo-mamarketplace.jpeg.asset.json";
import { ssGet, ssSet } from "@/lib/safe-storage";

const SHOWN_KEY = "splash_shown_v2";
const logoUrl = logoAsset.url;

export function SplashScreen() {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (!ssGet(SHOWN_KEY)) setVisible(true);
  }, []);

  useEffect(() => {
    if (!visible) return;
    // Keep it short: the splash must never be what a visitor waits on.
    const t1 = setTimeout(() => setFading(true), 550);
    const t2 = setTimeout(() => {
      ssSet(SHOWN_KEY, "1");
      setVisible(false);
    }, 900);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [visible]);

  if (!mounted || !visible) return null;

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        background: "linear-gradient(180deg,#15803d 0%,#ea580c 100%)",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        gap: 22, opacity: fading ? 0 : 1, transition: "opacity 350ms ease-in-out",
        pointerEvents: "none",
      }}
    >
      <img
        src={logoUrl}
        alt="MMP Shop"
        width={130}
        height={130}
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
