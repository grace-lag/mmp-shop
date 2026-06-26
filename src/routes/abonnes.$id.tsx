import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { SiteLayout } from "@/components/SiteLayout";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/abonnes/$id")({ component: AbonnesPage });

function AbonnesPage() {
  const { id } = Route.useParams();
  const { data: followers } = useQuery({
    queryKey: ["followers-list", id],
    queryFn: async () => {
      const { data: rows } = await supabase.from("seller_followers").select("follower_id,created_at").eq("seller_id", id).order("created_at", { ascending: false });
      const ids = (rows ?? []).map((r: any) => r.follower_id);
      if (ids.length === 0) return [];
      const { data: profs } = await supabase.from("profiles").select("id,prenom,nom,avatar_url").in("id", ids);
      return profs ?? [];
    },
  });

  return (
    <SiteLayout hideHeader hideFooter>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 16 }}>
        <Link to="/compte" style={{ textDecoration: "none", color: "#0f172a", fontSize: "1.25rem" }}>←</Link>
        <h1 style={{ margin: 0 }}>Abonnés ({followers?.length ?? 0})</h1>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
        {(followers ?? []).map((p: any) => {
          const name = [p.prenom, p.nom].filter(Boolean).join(" ").trim() || "Utilisateur";
          return (
            <Link key={p.id} to="/u/$id" params={{ id: p.id }} style={{ display: "flex", alignItems: "center", gap: 12, padding: 10, background: "#fff", borderRadius: 12, border: "1px solid #fed7aa", textDecoration: "none", color: "inherit" }}>
              <div style={{ width: 48, height: 48, borderRadius: "50%", overflow: "hidden", background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>
                {p.avatar_url ? <img src={p.avatar_url} alt={name} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : "👤"}
              </div>
              <strong>{name}</strong>
            </Link>
          );
        })}
        {followers && followers.length === 0 && <p style={{ color: "#64748b", textAlign: "center" }}>Aucun abonné pour l'instant.</p>}
      </div>
    </SiteLayout>
  );
}
