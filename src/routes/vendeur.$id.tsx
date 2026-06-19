import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { SiteLayout } from "@/components/SiteLayout";
import { supabase } from "@/integrations/supabase/client";
import { formatPrice } from "@/lib/annonces";
import { useAuth } from "@/lib/auth/AuthProvider";

export const Route = createFileRoute("/vendeur/$id")({ component: VendeurPage });

function VendeurPage() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const { data: profile } = useQuery({
    queryKey: ["profile", id],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("id,prenom,nom,avatar_url").eq("id", id).maybeSingle();
      return data;
    },
  });
  const { data: annonces } = useQuery({
    queryKey: ["seller-annonces", id],
    queryFn: async () => {
      const { data } = await supabase.from("annonces").select("id,title,price,city,category,image_url,created_at").eq("seller_id", id).order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const name = profile ? `${profile.prenom ?? ""} ${profile.nom ?? ""}`.trim() || "Vendeur" : "Vendeur";

  return (
    <SiteLayout>
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 16, flexWrap: "wrap" }}>
        <div style={{
          width: 72, height: 72, borderRadius: "50%", overflow: "hidden",
          border: "1px solid #e2e8f0", background: "#f1f5f9",
          display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32, color: "#94a3b8",
        }}>
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt={name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : "👤"}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{ margin: 0 }}>{name}</h1>
          <p style={{ margin: "4px 0 0", color: "#64748b" }}>{annonces?.length ?? 0} annonce(s)</p>
        </div>
        {user && user.id !== id && (
          <Link to="/chat" search={{ to: id }} className="btn-whatsapp" style={{ background: "#2563eb" }}>
            💬 Message privé
          </Link>
        )}
      </div>
      <div className="product-grid" style={{ marginTop: 16 }}>
        {(annonces ?? []).map((a: any) => (
          <Link key={a.id} to="/annonce/$id" params={{ id: a.id }} className="product-card" style={{ textDecoration: "none", color: "inherit" }}>
            {a.image_url ? <img src={a.image_url} alt={a.title} /> : <div style={{ height: 160, background: "#f1f5f9", borderRadius: 8 }} />}
            <h3>{a.title}</h3>
            <p className="price">{formatPrice(a.price)}</p>
          </Link>
        ))}
      </div>
    </SiteLayout>
  );
}

