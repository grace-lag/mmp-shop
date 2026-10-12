import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { SiteLayout } from "@/components/SiteLayout";
import { supabase } from "@/integrations/supabase/client";
import { formatPrice } from "@/lib/annonces";

export const Route = createFileRoute("/top-likes/$id")({ component: TopLikesPage });

function TopLikesPage() {
  const { id } = Route.useParams();
  const { data } = useQuery({
    queryKey: ["top-likes", id],
    queryFn: async () => {
      const { data: ads } = await supabase
        .from("annonces")
        .select("id,title,price,image_url,created_at,likes_count")
        .eq("seller_id", id)
        .order("likes_count", { ascending: false })
        .limit(1);
      const top = (ads ?? [])[0];
      if (!top) return { top: null, likers: [] };
      const { data: likes } = await supabase.from("annonce_likes").select("user_id,created_at").eq("annonce_id", top.id).order("created_at", { ascending: false });
      const uids = (likes ?? []).map((l: any) => l.user_id);
      let likers: any[] = [];
      if (uids.length) {
        const { data: profs } = await supabase.from("public_profiles").select("id,prenom,nom,avatar_url").in("id", uids);
        likers = profs ?? [];
      }
      return { top, likers };
    },
  });

  const top = data?.top as any;

  return (
    <SiteLayout hideHeader hideFooter>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 16 }}>
        <Link to="/compte" style={{ textDecoration: "none", color: "#0f172a", fontSize: "1.25rem" }}>←</Link>
        <h1 style={{ margin: 0 }}>Annonce la plus aimée</h1>
      </div>

      {!top && <p style={{ color: "#64748b", marginTop: 12 }}>Aucune annonce publiée.</p>}

      {top && (
        <Link to="/annonce/$id" params={{ id: top.id }} style={{ textDecoration: "none", color: "inherit", display: "block", marginTop: 12, background: "#fff", borderRadius: 14, overflow: "hidden", border: "1px solid #fed7aa" }}>
          {top.image_url && <img src={top.image_url} alt={top.title} style={{ width: "100%", height: 220, objectFit: "cover" }} />}
          <div style={{ padding: 12 }}>
            <h3 style={{ margin: 0 }}>{top.title}</h3>
            <div style={{ color: "#16a34a", fontWeight: 700, marginTop: 4 }}>{formatPrice(top.price, (top as any).currency)}</div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, color: "#64748b", fontSize: "0.85rem" }}>
              <span>📅 {new Date(top.created_at).toLocaleDateString()}</span>
              <span>❤️ {top.likes_count} j'aime</span>
            </div>
          </div>
        </Link>
      )}

      <h2 style={{ marginTop: 20 }}>Personnes qui ont aimé ({data?.likers.length ?? 0})</h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
        {(data?.likers ?? []).map((p: any) => {
          const name = [p.prenom, p.nom].filter(Boolean).join(" ").trim() || "Utilisateur";
          return (
            <Link key={p.id} to="/u/$id" params={{ id: p.id }} style={{ display: "flex", alignItems: "center", gap: 12, padding: 10, background: "#fff", borderRadius: 12, border: "1px solid #fed7aa", textDecoration: "none", color: "inherit" }}>
              <div style={{ width: 44, height: 44, borderRadius: "50%", overflow: "hidden", background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>
                {p.avatar_url ? <img src={p.avatar_url} alt={name} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : "👤"}
              </div>
              <strong>{name}</strong>
            </Link>
          );
        })}
      </div>
    </SiteLayout>
  );
}
