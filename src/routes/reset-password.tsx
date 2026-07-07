import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { SiteLayout } from "@/components/SiteLayout";
import { PasswordInput } from "@/components/PasswordInput";
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
    if (password.length < 1) return toast.error("Choisis un mot de passe.");
    if (password !== confirm) return toast.error("Les mots de passe ne correspondent pas.");
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) return toast.error(frAuthError(error));
    toast.success("Mot de passe défini. Tu peux te connecter avec ton email.");
    navigate({ to: "/login" });
  };

  return (
    <SiteLayout activeNav="compte">
      <h1 style={{ marginTop: 16 }}>Définir mon mot de passe</h1>
      <form onSubmit={submit} style={{ display: "grid", gap: 12, maxWidth: 400 }}>
        <PasswordInput placeholder="Nouveau mot de passe" value={password} onChange={(e) => setPassword(e.target.value)} required />
        <PasswordInput placeholder="Confirmer le mot de passe" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
        <button className="btn-whatsapp" disabled={loading}>{loading ? "..." : "Enregistrer"}</button>
      </form>
    </SiteLayout>
  );
}