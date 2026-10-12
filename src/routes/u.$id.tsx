import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { SiteLayout } from "@/components/SiteLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth/AuthProvider";
import { SellerRating } from "@/components/SellerRating";
import { FollowButton, useFollowersCount } from "@/components/FollowButton";
import { formatPrice } from "@/lib/annonces";

export const Route = createFileRoute("/u/$id")({ component: UserProfilePage });

function lastSeenLabel(iso: string | null | undefined) {
  if (!iso) return "Hors ligne";
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 2 * 60 * 1000) return "🟢 En ligne";
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `En ligne il y a ${mins} min`;
  const h = Math.floor(mins / 60);
  if (h < 24) return `En ligne il y a ${h} h`;
  const d = Math.floor(h / 24);
  return `Vu il y a ${d} j`;
}

function UserProfilePage() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const { data: profile } = useQuery({
    queryKey: ["profile-public", id],
    queryFn: async () => {
      const { data } = await supabase.from("public_profiles").select("id,prenom,nom,avatar_url,last_seen_at,created_at").eq("id", id).maybeSingle();
      return data as any;
    },
  });
  const { data: annonces } = useQuery({
    queryKey: ["user-annonces", id],
    queryFn: async () => {
      const { data } = await supabase.from("annonces").select("id,title,price,image_url").eq("seller_id", id).order("created_at", { ascending: false }).limit(20);
      return data ?? [];
    },
  });
  const { data: topLikes } = useQuery({
    queryKey: ["user-top-likes", id],
    queryFn: async () => {
      const { data } = await supabase.from("annonces").select("likes_count").eq("seller_id", id).order("likes_count", { ascending: false }).limit(1);
      return data?.[0]?.likes_count ?? 0;
    },
  });
  const { data: followers } = useFollowersCount(id);

  const name = profile ? `${profile.prenom ?? ""} ${profile.nom ?? ""}`.trim() || "Utilisateur" : "...";
  const days = profile?.created_at ? Math.floor((Date.now() - new Date(profile.created_at).getTime()) / 86400000) : 0;

  return (
    <SiteLayout hideHeader hideFooter>
      {/* Header profil */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginTop: 16 }}>
        <div style={{ width: 76, height: 76, borderRadius: "50%", overflow: "hidden", background: "#f1f5f9", flexShrink: 0 }}>
          {profile?.avatar_url ? <img src={profile.avatar_url} alt={name} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32 }}>👤</div>}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2 style={{ margin: 0 }}>{name}</h2>
          <div style={{ marginTop: 4 }}>
            <SellerRating sellerId={id} interactive={false} showCount={false} />
          </div>
        </div>
      </div>

      {/* Stats cliquables */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginTop: 14 }}>
        <Link to="/abonnes/$id" params={{ id }} style={{ textAlign: "center", textDecoration: "none", color: "inherit", padding: "8px 4px", borderRadius: 10, background: "#fff7ed", border: "1px solid #fed7aa" }}>
          <div style={{ fontSize: "1.2rem", fontWeight: 800 }}>{followers ?? 0}</div>
          <div style={{ fontSize: "0.78rem", color: "#7c2d12" }}>Abonnés</div>
        </Link>
        <Link to="/top-likes/$id" params={{ id }} style={{ textAlign: "center", textDecoration: "none", color: "inherit", padding: "8px 4px", borderRadius: 10, background: "#fff7ed", border: "1px solid #fed7aa" }}>
          <div style={{ fontSize: "1.2rem", fontWeight: 800 }}>{topLikes ?? 0}</div>
          <div style={{ fontSize: "0.78rem", color: "#7c2d12" }}>Likes</div>
        </Link>
        <div style={{ textAlign: "center", padding: "8px 4px", borderRadius: 10, background: "#fff7ed", border: "1px solid #fed7aa" }}>
          <div style={{ fontSize: "1.2rem", fontWeight: 800 }}>{annonces?.length ?? 0}</div>
          <div style={{ fontSize: "0.78rem", color: "#7c2d12" }}>Annonces</div>
        </div>
      </div>

      <div style={{ color: "#64748b", fontSize: "0.85rem", marginTop: 10 }}>
        🗓️ {tenureLabel(days)} sur MaMarketplace E-shop<br />
        {lastSeenLabel(profile?.last_seen_at)}
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
        <FollowButton sellerId={id} />
        {user && user.id !== id && (
          <Link to="/chat" search={{ to: id }} className="btn-whatsapp" style={{ background: "#2563eb" }}>💬 Message</Link>
        )}
        <Link to="/evaluations/$id" params={{ id }} className="btn-whatsapp" style={{ background: "#f59e0b" }}>⭐ Évaluations</Link>
      </div>

      {/* Noter la boutique */}
      {user && user.id !== id && (
        <div style={{ marginTop: 18, background: "#fff", borderRadius: 12, padding: 14, border: "1px solid #fed7aa" }}>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>Noter cette boutique</div>
          <SellerRating sellerId={id} interactive />
        </div>
      )}

      <h3 style={{ marginTop: 20 }}>Annonces du vendeur</h3>
      <div className="product-grid" style={{ marginTop: 8 }}>
        {(annonces ?? []).map((a: any) => (
          <Link key={a.id} to="/annonce/$id" params={{ id: a.id }} className="product-card" style={{ textDecoration: "none", color: "inherit" }}>
            {a.image_url ? <img src={a.image_url} alt={a.title} /> : <div style={{ height: 160, background: "#f1f5f9", borderRadius: 8 }} />}
            <h3>{a.title}</h3>
            <p className="price">{formatPrice(a.price, (a as any).currency)}</p>
          </Link>
        ))}
        {annonces && annonces.length === 0 && <p style={{ color: "#64748b" }}>Aucune annonce publiée.</p>}
      </div>
    </SiteLayout>
  );
}

function tenureLabel(days: number) {
  if (days < 1) return "Inscrit aujourd'hui";
  if (days < 30) return `Depuis ${days} jour${days > 1 ? "s" : ""}`;
  const months = Math.floor(days / 30);
  if (months < 12) return `Depuis ${months} mois`;
  const years = Math.floor(months / 12);
  const remM = months % 12;
  return remM > 0 ? `Depuis ${years} an${years > 1 ? "s" : ""} et ${remM} mois` : `Depuis ${years} an${years > 1 ? "s" : ""}`;
}
