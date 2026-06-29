import { useEffect, useState } from "react";
import logo from "@/assets/logo-marketplace.jpeg";

const SHOWN_KEY = "splash_shown_v1";

export function SplashScreen() {
  const [visible, setVisible] = useState(() => {
    if (typeof window === "undefined") return false;
    return !sessionStorage.getItem(SHOWN_KEY);
  });
  const [fading, setFading] = useState(false);

  useEffect(() => {
    if (!visible) return;
    const t1 = setTimeout(() => setFading(true), 1400);
    const t2 = setTimeout(() => {
      sessionStorage.setItem(SHOWN_KEY, "1");
      setVisible(false);
    }, 1900);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [visible]);

  if (!visible) return null;

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
        src={logo}
        alt="MaMarketplace E-Shop"
        style={{ width: 130, height: 130, borderRadius: 26, objectFit: "cover", boxShadow: "0 10px 30px rgba(0,0,0,0.35)" }}
      />
      <div style={{ color: "#fff", fontWeight: 800, fontSize: "1.5rem", letterSpacing: 0.5, textShadow: "0 2px 6px rgba(0,0,0,0.4)" }}>
        MaMarketplace E-Shop
      </div>
    </div>
  );
}
