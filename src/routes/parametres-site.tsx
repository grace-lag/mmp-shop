import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteLayout } from "@/components/SiteLayout";
import { useAuth } from "@/lib/auth/AuthProvider";

export const Route = createFileRoute("/parametres-site")({ component: ParametresSitePage });

function ParametresSitePage() {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  useEffect(() => { if (!loading && !user) navigate({ to: "/login" }); }, [user, loading, navigate]);
  const [theme, setTheme] = useState(() => (typeof window !== "undefined" ? localStorage.getItem("theme") ?? "auto" : "auto"));
  const [notifs, setNotifs] = useState(() => (typeof window !== "undefined" ? localStorage.getItem("notifs") !== "off" : true));
  const [lang, setLang] = useState(() => (typeof window !== "undefined" ? localStorage.getItem("lang") ?? "fr" : "fr"));

  if (!user) return null;

  const Row = ({ icon, label, children }: any) => (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", background: "#fff", borderRadius: 12, border: "1px solid #fed7aa", marginBottom: 8 }}>
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}><span style={{ fontSize: 20 }}>{icon}</span><strong>{label}</strong></div>
      <div>{children}</div>
    </div>
  );

  return (
    <SiteLayout hideHeader hideFooter>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 16 }}>
        <Link to="/compte" style={{ textDecoration: "none", color: "#0f172a", fontSize: "1.25rem" }}>←</Link>
        <h1 style={{ margin: 0 }}>Paramètres du site</h1>
      </div>

      <div style={{ marginTop: 14 }}>
        <Row icon="🎨" label="Thème">
          <select value={theme} onChange={(e) => { const v = e.target.value; setTheme(v); localStorage.setItem("theme", v); window.dispatchEvent(new CustomEvent("theme-change", { detail: v })); }}>
            <option value="auto">Automatique</option>
            <option value="light">Clair</option>
            <option value="dark">Sombre</option>
          </select>
        </Row>
        <Row icon="🌐" label="Langue">
          <select value={lang} onChange={(e) => { setLang(e.target.value); localStorage.setItem("lang", e.target.value); }}>
            <option value="fr">Français</option>
            <option value="en">English</option>
          </select>
        </Row>
        <Row icon="🔔" label="Notifications push">
          <label style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <input type="checkbox" checked={notifs} onChange={(e) => { setNotifs(e.target.checked); localStorage.setItem("notifs", e.target.checked ? "on" : "off"); }} />
            {notifs ? "Activées" : "Désactivées"}
          </label>
        </Row>
        <Link to="/conditions" style={{ textDecoration: "none", color: "inherit" }}><Row icon="📜" label="Conditions d'utilisation"><span>›</span></Row></Link>
        <Link to="/privacy" style={{ textDecoration: "none", color: "inherit" }}><Row icon="🔒" label="Politique de confidentialité"><span>›</span></Row></Link>
        <Link to="/mentions-legales" style={{ textDecoration: "none", color: "inherit" }}><Row icon="⚖️" label="Mentions légales"><span>›</span></Row></Link>
        <Row icon="ℹ️" label="Version"><span style={{ color: "#64748b" }}>1.0.0</span></Row>

        <button
          onClick={signOut}
          style={{ width: "100%", marginTop: 16, padding: "14px 16px", background: "#dc2626", color: "white", border: 0, borderRadius: 12, fontWeight: 700, cursor: "pointer", fontSize: "1rem" }}
        >
          🚪 Se déconnecter
        </button>
      </div>
    </SiteLayout>
  );
}
