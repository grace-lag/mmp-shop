import { createFileRoute, useNavigate } from "@tanstack/react-router";
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
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => { toast.success("Supprimée"); qc.invalidateQueries({ queryKey: ["admin-annonces"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  if (!user) return null;
  if (isLoading) return <SiteLayout><p>Chargement...</p></SiteLayout>;
  if (error) return <SiteLayout><h1>Accès refusé</h1><p>Cette page est réservée aux administrateurs.</p></SiteLayout>;

  const annonces = data?.annonces ?? [];

  return (
    <SiteLayout>
      <h1 style={{ marginTop: 16 }}>Administration</h1>
      <h2>Annonces ({annonces.length})</h2>
      <div style={{ overflowX: "auto", border: "1px solid #e5e7eb", borderRadius: 8 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.88rem", background: "white" }}>
          <thead style={{ background: "#f8fafc" }}>
            <tr style={{ textAlign: "left" }}>
              <th style={{ padding: 10 }}>Vendeur</th>
              <th style={{ padding: 10 }}>Annonce</th>
              <th style={{ padding: 10 }}>Prix</th>
              <th style={{ padding: 10 }}>Ville</th>
              <th style={{ padding: 10 }}>Publiée le</th>
              <th style={{ padding: 10 }}>Compte créé le</th>
              <th style={{ padding: 10 }}></th>
            </tr>
          </thead>
          <tbody>
            {annonces.map((a: any) => {
              const s = a.seller;
              const name = s ? [s.prenom, s.nom].filter(Boolean).join(" ").trim() || s.email || "—" : "—";
              return (
                <tr key={a.id} style={{ borderTop: "1px solid #e5e7eb", verticalAlign: "middle" }}>
                  <td style={{ padding: 10 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ width: 36, height: 36, borderRadius: "50%", overflow: "hidden", background: "#e2e8f0", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, color: "#64748b", fontSize: "0.85rem" }}>
                        {s?.avatar_url
                          ? <img src={s.avatar_url} alt={name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          : (name[0]?.toUpperCase() ?? "?")}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 600 }}>{name}</div>
                        {s?.email && <div style={{ fontSize: "0.75rem", color: "#64748b" }}>{s.email}</div>}
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: 10 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      {a.image_url && <img src={a.image_url} alt={a.title} style={{ width: 36, height: 36, borderRadius: 6, objectFit: "cover", flexShrink: 0 }} />}
                      <span>{a.title}</span>
                    </div>
                  </td>
                  <td style={{ padding: 10 }}>{a.price}</td>
                  <td style={{ padding: 10 }}>{a.city ?? "—"}</td>
                  <td style={{ padding: 10, whiteSpace: "nowrap" }}>{fmtDate(a.created_at)}</td>
                  <td style={{ padding: 10, whiteSpace: "nowrap" }}>{fmtDate(s?.created_at)}</td>
                  <td style={{ padding: 10 }}>
                    <button onClick={() => { if (confirm("Supprimer ?")) del.mutate(a.id); }} style={{ color: "#dc2626", background: "none", border: 0, cursor: "pointer" }}>Supprimer</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </SiteLayout>
  );
}
