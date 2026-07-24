import { frAuthError } from "@/lib/auth-errors";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { SiteLayout } from "@/components/SiteLayout";
import { supabase } from "@/integrations/supabase/client";
import { formatPrice } from "@/lib/annonces";
import { useAuth } from "@/lib/auth/AuthProvider";
import { SellerRating } from "@/components/SellerRating";
import { FollowButton, useFollowersCount } from "@/components/FollowButton";
import { isOnline } from "@/lib/presence";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { adminDeleteAnnonceById } from "@/lib/admin.functions";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

export const Route = createFileRoute("/vendeur/$id")({ component: VendeurPage });

function VendeurPage() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const isAdmin = useIsAdmin();
  const qc = useQueryClient();

  const { data: profile } = useQuery({
    queryKey: ["profile", id],
    refetchInterval: 60_000,
    queryFn: async () => {
      const { data } = await (supabase as any).from("profiles").select("id,prenom,nom,avatar_url,last_seen_at,account_type,business_name,business_year").eq("id", id).maybeSingle();
      return data;
    },
  });
  const { data: annonces } = useQuery({
    queryKey: ["seller-annonces", id],
    queryFn: async () => {
      const { data } = await supabase.from("annonces").select("id,title,price,city,category,image_url,created_at,likes_count").eq("seller_id", id).order("created_at", { ascending: false });
      return data ?? [];
    },
  });
  const { data: followers } = useFollowersCount(id);

  const isBiz = (profile as any)?.account_type === "entreprise";
  const bizName = (profile as any)?.business_name as string | null;
  const bizYear = (profile as any)?.business_year as number | null;
  const name = isBiz && bizName
    ? bizName
    : profile ? `${profile.prenom ?? ""} ${profile.nom ?? ""}`.trim() || "Vendeur" : "Vendeur";
  const online = isOnline((profile as any)?.last_seen_at);

  const handleAdminDelete = async (annonceId: string, title: string) => {
    if (!confirm(`Supprimer définitivement "${title}" ?`)) return;
    try {
      await adminDeleteAnnonceById({ data: { annonceId } });
      toast.success("Annonce supprimée");
      qc.invalidateQueries({ queryKey: ["seller-annonces", id] });
    } catch (e: any) {
      toast.error(e?.message ?? "Échec de la suppression");
    }
  };

  const totalAds = (annonces ?? []).length;
  const topLikes = Math.max(0, ...((annonces ?? []).map((a: any) => a.likes_count ?? 0)));

  const statTile = (count: number | string, label: string, to?: string, params?: any) => {
    const inner = (
      <>
        <div style={{ fontSize: "1.25rem", fontWeight: 800, color: "#0f172a" }}>{count}</div>
        <div style={{ fontSize: "0.78rem", color: "#7c2d12", marginTop: 2 }}>{label}</div>
      </>
    );
    const style = { textAlign: "center" as const, padding: "8px 4px", borderRadius: 10, background: "#fff7ed", border: "1px solid #fed7aa", display: "block", textDecoration: "none", color: "inherit" };
    return to
      ? <Link to={to as any} params={params} style={style}>{inner}</Link>
      : <div style={style}>{inner}</div>;
  };

  return (
    <SiteLayout>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginTop: 16 }}>
        <div style={{
          width: 72, height: 72, borderRadius: "50%", overflow: "hidden",
          border: "1px solid #e2e8f0", background: "#f1f5f9",
          display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32, color: "#94a3b8",
          position: "relative", flexShrink: 0,
        }}>
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt={name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : "👤"}
          <span style={{ position: "absolute", bottom: 2, right: 2, width: 16, height: 16, borderRadius: "50%", background: online ? "#16a34a" : "#9ca3af", border: "2px solid #fff" }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{ margin: 0, fontSize: "1.1rem", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{name}</span>
            <span style={{ fontSize: "0.7rem", fontWeight: 600, padding: "2px 8px", borderRadius: 999, background: online ? "#dcfce7" : "#e2e8f0", color: online ? "#15803d" : "#475569" }}>
              {online ? "● En ligne" : "○ Hors ligne"}
            </span>
          </h1>
          {isBiz && bizYear && (
            <div style={{ marginTop: 4, fontSize: "0.85rem", color: "#7c2d12", fontWeight: 600 }}>
              🏢 Existe depuis {bizYear} ({Math.max(0, new Date().getFullYear() - bizYear)} an{new Date().getFullYear() - bizYear > 1 ? "s" : ""})
            </div>
          )}
          <div style={{ marginTop: 4 }}>
            <SellerRating sellerId={id} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8, alignItems: "flex-start" }}>
            <FollowButton sellerId={id} />
            {user && user.id !== id && (
              <Link
                to="/chat"
                search={{ to: id }}
                className="btn-whatsapp"
                style={{ background: "#2563eb", padding: "6px 12px", fontSize: "0.8rem", width: "auto", whiteSpace: "nowrap", lineHeight: 1.2 }}
              >
                💬 Message
              </Link>
            )}
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginTop: 14 }}>
        {statTile(followers ?? 0, "Abonnés", "/abonnes/$id", { id })}
        {statTile(topLikes, "Likes", "/top-likes/$id", { id })}
        {statTile(totalAds, "Annonces")}
      </div>

      <div className="product-grid" style={{ marginTop: 16 }}>
        {(annonces ?? []).map((a: any) => (
          <div key={a.id} style={{ position: "relative" }}>
            <Link to="/annonce/$id" params={{ id: a.id }} className="product-card" style={{ textDecoration: "none", color: "inherit", display: "block" }}>
              {a.image_url ? <img src={a.image_url} alt={a.title} /> : <div style={{ height: 160, background: "#f1f5f9", borderRadius: 8 }} />}
              <h3>{a.title}</h3>
              <p className="price">{formatPrice(a.price)}</p>
            </Link>
            {isAdmin && (
              <button
                onClick={() => handleAdminDelete(a.id, a.title)}
                title="Supprimer cette annonce (admin)"
                style={{ position: "absolute", top: 6, right: 6, background: "#dc2626", color: "#fff", border: "none", borderRadius: 8, padding: "6px 8px", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 700, boxShadow: "0 2px 6px rgba(0,0,0,0.25)" }}
              >
                <Trash2 size={14} /> Supprimer
              </button>
            )}
          </div>
        ))}
      </div>
    </SiteLayout>
  );
}
