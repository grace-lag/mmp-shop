import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { SiteLayout } from "@/components/SiteLayout";
import { useAuth } from "@/lib/auth/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { SellerRating } from "@/components/SellerRating";
import { useFollowersCount } from "@/components/FollowButton";

export const Route = createFileRoute("/compte")({ component: ComptePage });

function ComptePage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<{ nom?: string; prenom?: string; avatar_url?: string; created_at?: string } | null>(null);

  useEffect(() => { if (!loading && !user) navigate({ to: "/login" }); }, [user, loading, navigate]);

  useEffect(() => {
    if (!user) return;
    (supabase as any).from("profiles").select("nom,prenom,tel,date_naissance,avatar_url,created_at").eq("id", user.id).maybeSingle()
      .then(({ data }: any) => {
        setProfile(data ?? null);
        if (!data?.nom || !data?.prenom || !data?.tel || !data?.date_naissance || !data?.avatar_url) {
          navigate({ to: "/complete-profile" });
        }
      });
  }, [user, navigate]);

  const { data: myAnnonces } = useQuery({
    queryKey: ["my-annonces-summary", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("annonces").select("id,likes_count").eq("seller_id", user!.id);
      return data ?? [];
    },
  });
  const { data: followers } = useFollowersCount(user?.id ?? "");

  const { data: unreadCount = 0 } = useQuery({
    queryKey: ["compte-unread", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await (supabase as any).from("messages").select("id").eq("receiver_id", user!.id).is("read_at", null);
      return data?.length ?? 0;
    },
  });

  const { data: newNotifs = 0 } = useQuery({
    queryKey: ["compte-notifs", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data: follows } = await supabase.from("seller_followers").select("seller_id").eq("follower_id", user!.id);
      const ids = (follows ?? []).map((f: any) => f.seller_id);
      if (ids.length === 0) return 0;
      const since = new Date(Date.now() - 7 * 86400000).toISOString();
      const { count } = await supabase.from("annonces").select("id", { count: "exact", head: true }).in("seller_id", ids).gt("created_at", since);
      return count ?? 0;
    },
  });

  if (!user) return null;
  const fullName = [profile?.prenom, profile?.nom].filter(Boolean).join(" ").trim();
  const topLikes = Math.max(0, ...((myAnnonces ?? []).map((a: any) => a.likes_count ?? 0)));
  const totalAds = (myAnnonces ?? []).length;

  const tile = (icon: string, label: string, sub?: string, badge?: number) => (
    <div style={{ position: "relative", background: "#fff", borderRadius: 14, padding: "18px 16px", border: "1px solid #fed7aa", display: "flex", flexDirection: "column", gap: 6, minHeight: 72, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 22 }}>{icon}</span>
        <strong style={{ fontSize: "1rem" }}>{label}</strong>
      </div>
      {sub && <span style={{ color: "#64748b", fontSize: "0.8rem" }}>{sub}</span>}
      {badge != null && badge > 0 && (
        <span style={{ position: "absolute", top: 10, right: 12, background: "#ea580c", color: "white", borderRadius: 999, padding: "2px 8px", fontSize: "0.72rem", fontWeight: 700 }}>{badge > 99 ? "99+" : badge}</span>
      )}
    </div>
  );

  const statBtn = (count: number | string, label: string, to: string, params?: any) => (
    <Link to={to as any} params={params} style={{ textAlign: "center", textDecoration: "none", color: "inherit", padding: "8px 4px", borderRadius: 10, background: "#fff7ed", border: "1px solid #fed7aa", display: "block" }}>
      <div style={{ fontSize: "1.25rem", fontWeight: 800, color: "#0f172a" }}>{count}</div>
      <div style={{ fontSize: "0.78rem", color: "#7c2d12", marginTop: 2 }}>{label}</div>
    </Link>
  );

  return (
    <SiteLayout activeNav="compte" hideHeader hideFooter>
      {/* En-tête profil */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 14, paddingTop: 18 }}>
        <div style={{ width: 70, height: 70, borderRadius: "50%", overflow: "hidden", background: "#f1f5f9", border: "2px solid #fff", flexShrink: 0 }}>
          {profile?.avatar_url
            ? <img src={profile.avatar_url} alt={fullName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 30 }}>👤</div>}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2 style={{ margin: 0, fontSize: "1.1rem" }}>{fullName || "Mon compte"}</h2>
          <div style={{ marginTop: 4 }}>
            <SellerRating sellerId={user.id} interactive={false} showCount={false} />
          </div>
        </div>
      </div>

      {/* Stats cliquables */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginTop: 14 }}>
        {statBtn(followers ?? 0, "Abonnés", "/abonnes/$id", { id: user.id })}
        {statBtn(topLikes, "Likes", "/top-likes/$id", { id: user.id })}
        <div style={{ textAlign: "center", padding: "8px 4px", borderRadius: 10, background: "#fff7ed", border: "1px solid #fed7aa" }}>
          <div style={{ fontSize: "1.25rem", fontWeight: 800 }}>{totalAds}</div>
          <div style={{ fontSize: "0.78rem", color: "#7c2d12", marginTop: 2 }}>Annonces</div>
        </div>
      </div>

      {/* Grille 2 colonnes 3 lignes */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 16 }}>
        <Link to="/dashboard" style={{ textDecoration: "none", color: "inherit" }}>{tile("📊", "Tableau de bord", "Mes annonces")}</Link>
        <Link to="/apercu" style={{ textDecoration: "none", color: "inherit" }}>{tile("👁️", "Aperçu", "Boutique en bref")}</Link>
        <Link to="/historique" style={{ textDecoration: "none", color: "inherit" }}>{tile("📋", "Historique", "Visites & messages", unreadCount)}</Link>
        <Link to="/notifications" style={{ textDecoration: "none", color: "inherit" }}>{tile("🔔", "Notifications", "Boutiques suivies", newNotifs)}</Link>
        <Link to="/parametres-site" style={{ textDecoration: "none", color: "inherit" }}>{tile("⚙️", "Paramètres", "Réglages du site")}</Link>
        <Link to="/parametres" style={{ textDecoration: "none", color: "inherit" }}>{tile("👤", "Compte", "Modifier mon profil")}</Link>
      </div>

      {/* Lien recherche */}
      <div style={{ marginTop: 18 }}>
        <Link to="/recherche-utilisateur" className="btn-whatsapp" style={{ display: "block", textAlign: "center", background: "#ea580c" }}>🔎 Rechercher une personne</Link>
      </div>

      {/* Durée de présence */}
      <div style={{ marginTop: 18, textAlign: "center", color: "#475569", fontSize: "0.9rem" }}>
        🗓️ {formatTenure(profile?.created_at)} sur MaMarketplace E-shop
      </div>
    </SiteLayout>
  );
}

function formatTenure(iso?: string) {
  if (!iso) return "Nouveau";
  const ms = Date.now() - new Date(iso).getTime();
  const days = Math.floor(ms / 86400000);
  if (days < 1) return "Inscrit aujourd'hui";
  if (days < 30) return `Depuis ${days} jour${days > 1 ? "s" : ""}`;
  const months = Math.floor(days / 30);
  if (months < 12) return `Depuis ${months} mois`;
  const years = Math.floor(months / 12);
  const remM = months % 12;
  return remM > 0 ? `Depuis ${years} an${years > 1 ? "s" : ""} et ${remM} mois` : `Depuis ${years} an${years > 1 ? "s" : ""}`;
}
