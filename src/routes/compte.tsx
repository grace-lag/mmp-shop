import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { SiteLayout } from "@/components/SiteLayout";
import { useAuth } from "@/lib/auth/AuthProvider";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/compte")({ component: ComptePage });

function ComptePage() {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  useEffect(() => { if (!loading && !user) navigate({ to: "/login" }); }, [user, loading, navigate]);
  useEffect(() => {
    if (!user) return;
    (supabase as any)
      .from("profiles")
      .select("nom,prenom,tel,whatsapp,date_naissance,avatar_url")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }: any) => {
        if (!data?.nom || !data?.prenom || !data?.tel || !data?.whatsapp || !data?.date_naissance || !data?.avatar_url) {
          navigate({ to: "/complete-profile" });
        }
      });
  }, [user, navigate]);
  if (!user) return null;
  return (
    <SiteLayout activeNav="compte">
      <h1 style={{ marginTop: 16 }}>Mon compte</h1>
      <p>Bonjour {user.email}</p>
      <div style={{ display: "grid", gap: 8, maxWidth: 400, marginTop: 16 }}>
        <Link to="/parametres" className="option-card">⚙️ <div><h3>Paramètres</h3><p>Modifier mon profil</p></div></Link>
        <Link to="/dashboard" className="option-card">📊 <div><h3>Tableau de bord</h3><p>Mes annonces</p></div></Link>
        <Link to="/historique" className="option-card">📋 <div><h3>Historique</h3><p>Mes favoris et commandes</p></div></Link>
        <Link to="/chat" className="option-card">💬 <div><h3>Messages</h3><p>Discussions</p></div></Link>
        <button onClick={signOut} className="option-card" style={{ cursor: "pointer", border: 0, textAlign: "left" }}>🚪 <div><h3>Déconnexion</h3><p>Quitter ma session</p></div></button>
      </div>
    </SiteLayout>
  );
}
