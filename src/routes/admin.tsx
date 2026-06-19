import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { SiteLayout } from "@/components/SiteLayout";
import { useAuth } from "@/lib/auth/AuthProvider";
import { getAdminAnnonces, adminDeleteAnnonce } from "@/lib/admin.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/admin")({ component: AdminPage });

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
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead><tr><th align="left">Titre</th><th>Prix</th><th>Ville</th><th></th></tr></thead>
        <tbody>
          {annonces.map((a: any) => (
            <tr key={a.id} style={{ borderTop: "1px solid #e5e7eb" }}>
              <td>{a.title}</td>
              <td>{a.price}</td>
              <td>{a.city}</td>
              <td>
                <button onClick={() => { if (confirm("Supprimer ?")) del.mutate(a.id); }} style={{ color: "#dc2626", background: "none", border: 0, cursor: "pointer" }}>Supprimer</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </SiteLayout>
  );
}
