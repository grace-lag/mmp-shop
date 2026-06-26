import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { SiteLayout } from "@/components/SiteLayout";
import { useAuth } from "@/lib/auth/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { formatPrice } from "@/lib/annonces";

export const Route = createFileRoute("/notifications")({ component: NotificationsPage });

function NotificationsPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  useEffect(() => { if (!loading && !user) navigate({ to: "/login" }); }, [user, loading, navigate]);

  const { data: items } = useQuery({
    queryKey: ["notifications-feed", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data: follows } = await supabase.from("seller_followers").select("seller_id").eq("follower_id", user!.id);
      const ids = (follows ?? []).map((f: any) => f.seller_id);
      if (ids.length === 0) return [];
      const { data: ads } = await supabase
        .from("annonces")
        .select("id,title,price,image_url,created_at,seller_id,seller_name")
        .in("seller_id", ids)
        .order("created_at", { ascending: false })
        .limit(50);
      return ads ?? [];
    },
  });

  if (!user) return null;

  return (
    <SiteLayout hideHeader hideFooter>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 16 }}>
        <Link to="/compte" style={{ textDecoration: "none", color: "#0f172a", fontSize: "1.25rem" }}>←</Link>
        <h1 style={{ margin: 0 }}>Notifications</h1>
      </div>
      <p style={{ color: "#64748b" }}>Nouvelles annonces des boutiques que tu suis.</p>

      {(items ?? []).length === 0 && (
        <div style={{ padding: 24, textAlign: "center", color: "#64748b", background: "#fff", borderRadius: 12, marginTop: 12 }}>
          Aucune nouvelle annonce. Abonne-toi à des boutiques pour voir leurs publications ici.
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 12 }}>
        {(items ?? []).map((a: any) => (
          <Link key={a.id} to="/annonce/$id" params={{ id: a.id }} style={{ display: "flex", gap: 12, alignItems: "center", padding: 10, background: "#fff", borderRadius: 12, border: "1px solid #fed7aa", textDecoration: "none", color: "inherit" }}>
            {a.image_url ? <img src={a.image_url} alt={a.title} style={{ width: 64, height: 64, borderRadius: 8, objectFit: "cover" }} />
              : <div style={{ width: 64, height: 64, borderRadius: 8, background: "#f1f5f9" }} />}
            <div style={{ flex: 1, minWidth: 0 }}>
              <strong style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.title}</strong>
              <div style={{ color: "#16a34a", fontWeight: 700 }}>{formatPrice(a.price)}</div>
              <div style={{ fontSize: "0.78rem", color: "#64748b" }}>Par {a.seller_name} · {new Date(a.created_at).toLocaleDateString()}</div>
            </div>
          </Link>
        ))}
      </div>
    </SiteLayout>
  );
}
