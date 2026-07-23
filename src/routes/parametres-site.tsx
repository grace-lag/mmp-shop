import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Palette, Globe, Bell, FileText, Lock, Scale, Info, LogOut } from "lucide-react";
import { SiteLayout } from "@/components/SiteLayout";
import { useAuth } from "@/lib/auth/AuthProvider";

export const Route = createFileRoute("/parametres-site")({ component: ParametresSitePage });

function ParametresSitePage() {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  useEffect(() => { if (!loading && !user) navigate({ to: "/login" }); }, [user, loading, navigate]);
  const [theme, setTheme] = useState(() => (typeof window !== "undefined" ? localStorage.getItem("theme") ?? "light" : "light"));
  const [notifs, setNotifs] = useState(() => (typeof window !== "undefined" ? localStorage.getItem("notifs") !== "off" : true));
  const [lang, setLang] = useState(() => (typeof window !== "undefined" ? localStorage.getItem("lang") ?? "fr" : "fr"));

  if (!user) return null;

  const Row = ({ Icon, label, children }: any) => (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", background: "#fff", borderRadius: 12, border: "1px solid #fed7aa", marginBottom: 8 }}>
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <Icon size={20} strokeWidth={1.8} color="#ea580c" />
        <strong>{label}</strong>
      </div>
      <div>{children}</div>
    </div>
  );

  return (
    <SiteLayout hideHeader hideFooter>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 16 }}>
        <Link to="/compte" style={{ textDecoration: "none", color: "#0f172a", display: "inline-flex", alignItems: "center" }}><ArrowLeft size={22} /></Link>
        <h1 style={{ margin: 0 }}>Paramètres du site</h1>
      </div>

      <div style={{ marginTop: 14 }}>
        <Row Icon={Palette} label="Thème">
          <select value={theme} onChange={(e) => { const v = e.target.value; setTheme(v); localStorage.setItem("theme", v); window.dispatchEvent(new CustomEvent("theme-change", { detail: v })); }}>
            <option value="auto">Automatique</option>
            <option value="light">Clair</option>
            <option value="dark">Sombre</option>
          </select>
        </Row>
        <Row Icon={Globe} label="Langue">
          <select value={lang} onChange={(e) => { const v = e.target.value; setLang(v); localStorage.setItem("lang", v); window.dispatchEvent(new CustomEvent("lang-change", { detail: v })); }}>
            <option value="fr">Français</option>
            <option value="en">English</option>
          </select>
        </Row>
        <Row Icon={Bell} label="Notifications push">
          <label style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <input type="checkbox" checked={notifs} onChange={(e) => { setNotifs(e.target.checked); localStorage.setItem("notifs", e.target.checked ? "on" : "off"); }} />
            {notifs ? "Activées" : "Désactivées"}
          </label>
        </Row>
        <Link to="/conditions" style={{ textDecoration: "none", color: "inherit" }}><Row Icon={FileText} label="Conditions d'utilisation"><span>›</span></Row></Link>
        <Link to="/privacy" style={{ textDecoration: "none", color: "inherit" }}><Row Icon={Lock} label="Politique de confidentialité"><span>›</span></Row></Link>
        <Link to="/mentions-legales" style={{ textDecoration: "none", color: "inherit" }}><Row Icon={Scale} label="Mentions légales"><span>›</span></Row></Link>
        <Row Icon={Info} label="Version"><span style={{ color: "#64748b" }}>1.0.0</span></Row>

        <button
          onClick={signOut}
          style={{ width: "100%", marginTop: 16, padding: "14px 16px", background: "#dc2626", color: "white", border: 0, borderRadius: 12, fontWeight: 700, cursor: "pointer", fontSize: "1rem", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8 }}
        >
          <LogOut size={18} /> Se déconnecter
        </button>
      </div>
    </SiteLayout>
  );
}
