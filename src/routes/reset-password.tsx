import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { SiteLayout } from "@/components/SiteLayout";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/reset-password")({ component: ResetPasswordPage });

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) return toast.error("Mot de passe : 6 caractères minimum");
    if (password !== confirm) return toast.error("Les mots de passe ne correspondent pas.");
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Mot de passe défini. Tu peux te connecter avec ton email.");
    navigate({ to: "/login" });
  };

  return (
    <SiteLayout activeNav="compte">
      <h1 style={{ marginTop: 16 }}>Définir mon mot de passe</h1>
      <form onSubmit={submit} style={{ display: "grid", gap: 12, maxWidth: 400 }}>
        <input className="search-input" type="password" placeholder="Nouveau mot de passe" value={password} onChange={(e) => setPassword(e.target.value)} minLength={6} required />
        <input className="search-input" type="password" placeholder="Confirmer le mot de passe" value={confirm} onChange={(e) => setConfirm(e.target.value)} minLength={6} required />
        <button className="btn-whatsapp" disabled={loading}>{loading ? "..." : "Enregistrer"}</button>
      </form>
    </SiteLayout>
  );
}