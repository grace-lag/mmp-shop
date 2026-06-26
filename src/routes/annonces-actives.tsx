import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { SiteLayout } from "@/components/SiteLayout";
import { useAuth } from "@/lib/auth/AuthProvider";
import { listMyAnnonces, formatPrice } from "@/lib/annonces";

export const Route = createFileRoute("/annonces-actives")({ component: Page });

function Page() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  useEffect(() => { if (!loading && !user) navigate({ to: "/login" }); }, [user, loading, navigate]);
  const { data } = useQuery({
    queryKey: ["my-active-annonces", user?.id],
    enabled: !!user,
    queryFn: () => listMyAnnonces(user!.id, { expired: false }),
  });
  if (!user) return null;

  return (
    <SiteLayout hideHeader hideFooter>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 16 }}>
        <Link to="/apercu" style={{ textDecoration: "none", color: "#0f172a", fontSize: "1.25rem" }}>←</Link>
        <h1 style={{ margin: 0 }}>Annonces actives ({data?.length ?? 0})</h1>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 12 }}>
        {(data ?? []).map((a) => {
          const days = Math.max(0, Math.ceil((new Date(a.expires_at).getTime() - Date.now()) / 86400000));
          return (
            <Link key={a.id} to="/annonce/$id" params={{ id: a.id }} style={{ display: "flex", gap: 10, padding: 10, background: "#fff", borderRadius: 12, border: "1px solid #fed7aa", textDecoration: "none", color: "inherit" }}>
              {a.image_url ? <img src={a.image_url} alt={a.title} style={{ width: 70, height: 70, objectFit: "cover", borderRadius: 8 }} /> : <div style={{ width: 70, height: 70, background: "#f1f5f9", borderRadius: 8 }} />}
              <div style={{ flex: 1, minWidth: 0 }}>
                <strong style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.title}</strong>
                <div style={{ color: "#16a34a", fontWeight: 700 }}>{formatPrice(a.price)}</div>
                <div style={{ marginTop: 4, fontSize: "0.78rem", color: days <= 7 ? "#dc2626" : "#64748b", fontWeight: days <= 7 ? 700 : 400 }}>
                  ⏳ Expire dans {days} jour{days > 1 ? "s" : ""}
                </div>
              </div>
            </Link>
          );
        })}
        {data && data.length === 0 && <p style={{ color: "#64748b", textAlign: "center" }}>Aucune annonce active.</p>}
      </div>
    </SiteLayout>
  );
}
