import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { SiteLayout } from "@/components/SiteLayout";
import { useAuth } from "@/lib/auth/AuthProvider";
import { listMyAnnonces, formatPrice, renewAnnonce } from "@/lib/annonces";

export const Route = createFileRoute("/annonces-expirees")({ component: Page });

function Page() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  useEffect(() => { if (!loading && !user) navigate({ to: "/login" }); }, [user, loading, navigate]);
  const { data } = useQuery({
    queryKey: ["my-expired-annonces", user?.id],
    enabled: !!user,
    queryFn: () => listMyAnnonces(user!.id, { expired: true }),
  });
  const renew = useMutation({
    mutationFn: (id: string) => renewAnnonce(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-expired-annonces"] });
      qc.invalidateQueries({ queryKey: ["my-active-annonces"] });
      qc.invalidateQueries({ queryKey: ["apercu-counts"] });
      toast.success("Annonce renouvelée pour 30 jours");
    },
    onError: (e: any) => toast.error(e.message ?? "Erreur"),
  });
  if (!user) return null;

  return (
    <SiteLayout hideHeader hideFooter>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 16 }}>
        <Link to="/apercu" style={{ textDecoration: "none", color: "#0f172a", fontSize: "1.25rem" }}>←</Link>
        <h1 style={{ margin: 0 }}>Annonces expirées ({data?.length ?? 0})</h1>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 12 }}>
        {(data ?? []).map((a) => (
          <div key={a.id} style={{ display: "flex", gap: 10, padding: 10, background: "#fff", borderRadius: 12, border: "1px solid #fed7aa" }}>
            {a.image_url ? <img src={a.image_url} alt={a.title} style={{ width: 70, height: 70, objectFit: "cover", borderRadius: 8 }} /> : <div style={{ width: 70, height: 70, background: "#f1f5f9", borderRadius: 8 }} />}
            <div style={{ flex: 1, minWidth: 0 }}>
              <strong style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.title}</strong>
              <div style={{ color: "#16a34a", fontWeight: 700 }}>{formatPrice(a.price, (a as any).currency)}</div>
              <div style={{ marginTop: 4, fontSize: "0.78rem", color: "#dc2626" }}>⏰ Expirée le {new Date(a.expires_at).toLocaleDateString()}</div>
            </div>
            <button onClick={() => renew.mutate(a.id)} disabled={renew.isPending} className="btn-whatsapp" style={{ background: "#ea580c", whiteSpace: "nowrap", alignSelf: "center" }}>🔄 Renouveler</button>
          </div>
        ))}
        {data && data.length === 0 && <p style={{ color: "#64748b", textAlign: "center" }}>Aucune annonce expirée.</p>}
      </div>
    </SiteLayout>
  );
}
