import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { SiteLayout } from "@/components/SiteLayout";
import { useAuth } from "@/lib/auth/AuthProvider";
import { getAdminAnnonces, adminDeleteAnnonce } from "@/lib/admin.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/admin")({ component: AdminPage });

function fmtDate(d?: string | null) {
  if (!d) return "—";
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return "—";
  return dt.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function AdminPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const fetchAdmin = useServerFn(getAdminAnnonces);
  const deleteFn = useServerFn(adminDeleteAnnonce);
  const qc = useQueryClient();

  useEffect(() => { if (!loading && !user) navigate({ to: "/login" }); }, [user, loading, navigate]);

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-annonces"],
    enabled: !!user,
    queryFn: () => fetchAdmin(),
    retry: false,
  });

  const del = useMutation({
    mutationFn: (userId: string) => deleteFn({ data: { userId } }),
    onSuccess: () => { toast.success("Compte supprimé"); qc.invalidateQueries({ queryKey: ["admin-annonces"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  if (!user) return null;
  if (isLoading) return <SiteLayout><p>Chargement...</p></SiteLayout>;
  if (error) return <SiteLayout><h1>Accès refusé</h1><p>Cette page est réservée aux administrateurs.</p></SiteLayout>;

  const sellers = data?.annonces ?? [];

  return (
    <SiteLayout>
      <h1 style={{ marginTop: 16 }}>Administration</h1>
      <h2>Vendeurs ayant publié ({sellers.length})</h2>
      <div style={{ display: "grid", gap: 10 }}>
        {sellers.map((row: any) => {
          const s = row.seller;
          const name = s ? [s.prenom, s.nom].filter(Boolean).join(" ").trim() || s.email || "Utilisateur" : "Utilisateur";
          return (
            <div key={row.seller_id} style={{ display: "flex", alignItems: "center", gap: 12, background: "white", border: "1px solid #e5e7eb", borderRadius: 12, padding: 12 }}>
              <Link to="/vendeur/$id" params={{ id: row.seller_id }} style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, minWidth: 0, color: "inherit", textDecoration: "none" }}>
                <div style={{ width: 52, height: 52, borderRadius: "50%", overflow: "hidden", background: "#e2e8f0", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, color: "#64748b" }}>
                  {s?.avatar_url ? <img src={s.avatar_url} alt={name} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : (name[0]?.toUpperCase() ?? "?")}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</div>
                  <div style={{ color: "#64748b", fontSize: "0.82rem" }}>{row.annonces_count} annonce(s) · Dernière publication {fmtDate(row.last_annonce_at)}</div>
                </div>
              </Link>
              <button
                onClick={() => { if (confirm(`Supprimer définitivement le compte de ${name} et toutes ses données ?`)) del.mutate(row.seller_id); }}
                disabled={del.isPending}
                style={{ color: "#fff", background: "#dc2626", border: 0, borderRadius: 8, cursor: "pointer", padding: "9px 12px", fontWeight: 700 }}
              >
                Supprimer
              </button>
            </div>
          );
        })}
        {sellers.length === 0 && <p style={{ color: "#64748b" }}>Aucun vendeur avec annonce.</p>}
      </div>
    </SiteLayout>
  );
}
