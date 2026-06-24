import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { SiteLayout } from "@/components/SiteLayout";
import { useAuth } from "@/lib/auth/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { SellerRating } from "@/components/SellerRating";
import { useFollowersCount } from "@/components/FollowButton";
import { toast } from "sonner";

export const Route = createFileRoute("/compte")({ component: ComptePage });

function ComptePage() {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<{ nom?: string; prenom?: string; avatar_url?: string } | null>(null);

  useEffect(() => { if (!loading && !user) navigate({ to: "/login" }); }, [user, loading, navigate]);

  useEffect(() => {
    if (!user) return;
    (supabase as any)
      .from("profiles")
      .select("nom,prenom,tel,date_naissance,avatar_url")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }: any) => {
        setProfile(data ?? null);
        if (!data?.nom || !data?.prenom || !data?.tel || !data?.date_naissance || !data?.avatar_url) {
          navigate({ to: "/complete-profile" });
        }
      });
  }, [user, navigate]);

  // Mes annonces & total likes
  const { data: myAnnonces } = useQuery({
    queryKey: ["my-annonces-summary", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("annonces").select("id,likes_count,views").eq("seller_id", user!.id);
      return data ?? [];
    },
  });
  const { data: followers } = useFollowersCount(user?.id ?? "");

  if (!user) return null;
  const fullName = [profile?.prenom, profile?.nom].filter(Boolean).join(" ").trim();
  const totalLikes = (myAnnonces ?? []).reduce((s, a: any) => s + (a.likes_count ?? 0), 0);
  const totalViews = (myAnnonces ?? []).reduce((s, a: any) => s + (a.views ?? 0), 0);

  return (
    <SiteLayout activeNav="compte">
      {/* Profil header */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 16, padding: "16px", background: "linear-gradient(135deg,#fff7ed,#ffedd5)", borderRadius: 16, border: "1px solid #fed7aa" }}>
        <div style={{ width: 72, height: 72, borderRadius: "50%", overflow: "hidden", background: "#f1f5f9", border: "2px solid #fff", flexShrink: 0 }}>
          {profile?.avatar_url
            ? <img src={profile.avatar_url} alt={fullName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 30 }}>👤</div>}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2 style={{ margin: 0, fontSize: "1.15rem" }}>{fullName || "..."}</h2>
          <div style={{ marginTop: 4 }}>
            <SellerRating sellerId={user.id} interactive={false} />
          </div>
          <div style={{ display: "flex", gap: 12, marginTop: 6, fontSize: "0.85em", color: "#475569", flexWrap: "wrap" }}>
            <span>👥 {followers ?? 0} abonnés</span>
            <span>❤️ {totalLikes} j'aime</span>
            <span>👁️ {totalViews} vues</span>
          </div>
        </div>
        <button
          onClick={() => toast.info("Abonnement Premium bientôt disponible !")}
          className="btn-whatsapp"
          style={{ background: "#e67e22", padding: "8px 14px", fontSize: "0.85rem", whiteSpace: "nowrap" }}
        >
          ⭐ S'abonner
        </button>
      </div>

      {/* Grille 2x2 raccourcis */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 16 }}>
        <Link to="/dashboard" className="option-card" style={{ flexDirection: "column", alignItems: "flex-start", gap: 4 }}>
          <div style={{ fontSize: 28 }}>📊</div>
          <div><h3 style={{ margin: 0 }}>Tableau de bord</h3><p style={{ margin: 0, fontSize: "0.85em" }}>Mes annonces</p></div>
        </Link>
        <Link to="/chat" className="option-card" style={{ flexDirection: "column", alignItems: "flex-start", gap: 4 }}>
          <div style={{ fontSize: 28 }}>💬</div>
          <div><h3 style={{ margin: 0 }}>Messagerie</h3><p style={{ margin: 0, fontSize: "0.85em" }}>Discussions</p></div>
        </Link>
        <Link to="/historique" className="option-card" style={{ flexDirection: "column", alignItems: "flex-start", gap: 4 }}>
          <div style={{ fontSize: 28 }}>📋</div>
          <div><h3 style={{ margin: 0 }}>Historique</h3><p style={{ margin: 0, fontSize: "0.85em" }}>Favoris & commandes</p></div>
        </Link>
        <Link to="/vendeur/$id" params={{ id: user.id }} className="option-card" style={{ flexDirection: "column", alignItems: "flex-start", gap: 4 }}>
          <div style={{ fontSize: 28 }}>👁️</div>
          <div><h3 style={{ margin: 0 }}>Aperçu</h3><p style={{ margin: 0, fontSize: "0.85em" }}>Voir ma boutique</p></div>
        </Link>
      </div>

      {/* Sections détaillées */}
      <div style={{ display: "grid", gap: 8, marginTop: 16 }}>
        <Link to="/dashboard" className="option-card">📦 <div><h3>Ventes & Mes annonces</h3><p>Gérer mes publications</p></div></Link>
        <Link to="/dashboard" className="option-card">📈 <div><h3>Statistiques</h3><p>Vues, likes, performances</p></div></Link>
        <Link to="/parametres" className="option-card">👤 <div><h3>Mon compte</h3><p>Informations personnelles</p></div></Link>
        <Link to="/parametres" className="option-card">⚙️ <div><h3>Paramètres</h3><p>Email, mot de passe, photo</p></div></Link>
        <button onClick={signOut} className="option-card" style={{ cursor: "pointer", border: 0, textAlign: "left" }}>
          🚪 <div><h3>Déconnexion</h3><p>Quitter ma session</p></div>
        </button>
      </div>
    </SiteLayout>
  );
}
