import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { SiteLayout } from "@/components/SiteLayout";
import { useAuth } from "@/lib/auth/AuthProvider";
import { getAdminUsers, adminDeleteAnnonce } from "@/lib/admin.functions";
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
  const fetchUsers = useServerFn(getAdminUsers);
  const deleteFn = useServerFn(adminDeleteAnnonce);
  const qc = useQueryClient();
  const [search, setSearch] = useState("");

  useEffect(() => { if (!loading && !user) navigate({ to: "/login" }); }, [user, loading, navigate]);

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-users"],
    enabled: !!user,
    queryFn: () => fetchUsers(),
    retry: false,
  });

  const del = useMutation({
    mutationFn: (userId: string) => deleteFn({ data: { userId } }),
    onSuccess: () => { toast.success("Compte supprimé"); qc.invalidateQueries({ queryKey: ["admin-users"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  if (!user) return null;
  if (isLoading) return <SiteLayout><p>Chargement...</p></SiteLayout>;
  if (error) return <SiteLayout><h1>Accès refusé</h1><p>Cette page est réservée aux administrateurs.</p></SiteLayout>;

  const allUsers = data?.users ?? [];
  const q = search.toLowerCase().trim();
  const users = q ? allUsers.filter((u: any) => [u.prenom, u.nom, u.email, u.tel].filter(Boolean).join(" ").toLowerCase().includes(q)) : allUsers;

  return (
    <SiteLayout>
      <h1 style={{ marginTop: 16 }}>Administration</h1>
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Rechercher un utilisateur..."
        style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid #cbd5e1", marginBottom: 12 }}
      />
      <h2>Utilisateurs ({users.length})</h2>
      <div style={{ display: "grid", gap: 10 }}>
        {users.map((u: any) => {
          const name = [u.prenom, u.nom].filter(Boolean).join(" ").trim() || u.email || "Utilisateur";
          return (
            <div key={u.id} style={{ display: "flex", alignItems: "center", gap: 12, background: "white", border: "1px solid #e5e7eb", borderRadius: 12, padding: 12 }}>
              <Link to="/u/$id" params={{ id: u.id }} style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, minWidth: 0, color: "inherit", textDecoration: "none" }}>
                <div style={{ width: 52, height: 52, borderRadius: "50%", overflow: "hidden", background: "#e2e8f0", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, color: "#64748b" }}>
                  {u.avatar_url ? <img src={u.avatar_url} alt={name} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : (name[0]?.toUpperCase() ?? "?")}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</div>
                  <div style={{ color: "#64748b", fontSize: "0.78rem" }}>{u.email ?? "—"}</div>
                  <div style={{ color: "#64748b", fontSize: "0.78rem" }}>{u.annonces_count} annonce(s) · Inscrit le {fmtDate(u.created_at)}</div>
                </div>
              </Link>
              <button
                onClick={() => { if (confirm(`Supprimer définitivement le compte de ${name} ?`)) del.mutate(u.id); }}
                disabled={del.isPending}
                style={{ color: "#fff", background: "#dc2626", border: 0, borderRadius: 8, cursor: "pointer", padding: "9px 12px", fontWeight: 700 }}
              >
                Supprimer
              </button>
            </div>
          );
        })}
        {users.length === 0 && <p style={{ color: "#64748b" }}>Aucun utilisateur.</p>}
      </div>
    </SiteLayout>
  );
}
