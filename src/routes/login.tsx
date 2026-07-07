import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteLayout } from "@/components/SiteLayout";
import { PasswordInput } from "@/components/PasswordInput";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useAuth } from "@/lib/auth/AuthProvider";
import { signInWithPhone } from "@/lib/auth.functions";
import { frAuthError } from "@/lib/auth-errors";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({ component: LoginPage });

function LoginPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"email" | "phone">("email");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  useEffect(() => { if (user) navigate({ to: "/compte" }); }, [user, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "phone") {
        const { access_token, refresh_token } = await signInWithPhone({
          data: { phone: identifier, password },
        });
        const { error } = await supabase.auth.setSession({ access_token, refresh_token });
        if (error) throw new Error("Identifiants incorrects");
      } else {
        const email = identifier.trim().toLowerCase();
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          if (/invalid login credentials/i.test(error.message)) {
            throw new Error("Email ou mot de passe incorrect. Si ce compte a été créé avec Google, clique sur “Définir / réinitialiser mon mot de passe”.");
          }
          throw error;
        }
      }
      navigate({ to: "/compte" });
    } catch (err: any) {
      toast.error(frAuthError(err) || "Connexion échouée");
    } finally {
      setLoading(false);
    }
  };

  const google = async () => {
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/complete-profile" });
    if (r.error) toast.error("Connexion Google échouée");
  };

  const resetPassword = async () => {
    if (mode !== "email" || !identifier.trim()) {
      return toast.error("Entre d'abord ton adresse email.");
    }
    setResetLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(identifier.trim().toLowerCase(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setResetLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Lien envoyé. Ouvre l'email pour définir ton mot de passe.");
  };

  return (
    <SiteLayout activeNav="compte">
      <h1 style={{ marginTop: 16 }}>Connexion</h1>

      <div style={{ display: "flex", gap: 8, maxWidth: 400, marginBottom: 12 }}>
        <button
          type="button"
          onClick={() => setMode("email")}
          className="btn-whatsapp"
          style={{ flex: 1, background: mode === "email" ? "#e67e22" : "#e5e7eb", color: mode === "email" ? "white" : "#374151" }}
        >
          Email
        </button>
        <button
          type="button"
          onClick={() => setMode("phone")}
          className="btn-whatsapp"
          style={{ flex: 1, background: mode === "phone" ? "#e67e22" : "#e5e7eb", color: mode === "phone" ? "white" : "#374151" }}
        >
          Téléphone
        </button>
      </div>

      <form onSubmit={submit} style={{ display: "grid", gap: 12, maxWidth: 400 }}>
        {mode === "email" ? (
          <input className="search-input" type="email" placeholder="Email" value={identifier} onChange={(e) => setIdentifier(e.target.value)} required />
        ) : (
          <input className="search-input" type="tel" placeholder="Numéro de téléphone" value={identifier} onChange={(e) => setIdentifier(e.target.value)} required />
        )}
        <PasswordInput placeholder="Mot de passe" value={password} onChange={(e) => setPassword(e.target.value)} required />
        <button className="btn-whatsapp" disabled={loading}>{loading ? "..." : "Se connecter"}</button>
      </form>
      <button
        type="button"
        onClick={resetPassword}
        disabled={resetLoading}
        style={{ marginTop: 10, padding: 0, border: 0, background: "transparent", color: "#e67e22", cursor: "pointer", fontWeight: 700 }}
      >
        {resetLoading ? "Envoi..." : "Définir / réinitialiser mon mot de passe"}
      </button>
      <div style={{ marginTop: 16, maxWidth: 400 }}>
        <button onClick={google} className="btn-whatsapp" style={{ background: "white", color: "#333", border: "1px solid #ddd", width: "100%" }}>
          Continuer avec Google
        </button>
      </div>
      <p style={{ marginTop: 16 }}>Pas de compte ? <Link to="/signup">Créer un compte</Link></p>
    </SiteLayout>
  );
}
