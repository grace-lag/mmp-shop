import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { SiteLayout } from "@/components/SiteLayout";
import { useAuth } from "@/lib/auth/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { deleteAnnonceServerFn } from "@/lib/annonces.functions";
import { formatPrice } from "@/lib/annonces";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard")({ component: DashboardPage });

function DashboardPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const deleteFn = useServerFn(deleteAnnonceServerFn);
  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [user, loading, navigate]);

  const { data: profile } = useQuery({
    queryKey: ["dashboard-profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("prenom,nom,avatar_url")
        .eq("id", user!.id)
        .maybeSingle();
      return data;
    },
  });

  const { data: myAds } = useQuery({
    queryKey: ["my-ads-list", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("annonces")
        .select("id,title,price,image_url,created_at,views,expires_at")
        .eq("seller_id", user!.id)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  if (!user) return null;

  const fullName = [profile?.prenom, profile?.nom].filter(Boolean).join(" ").trim() || "Mon compte";

  return (
    <SiteLayout activeNav="compte" hideHeader hideFooter>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 16 }}>
        <Link to="/compte" style={{ textDecoration: "none", color: "#0f172a", fontSize: "1.25rem" }}>←</Link>
        <h1 style={{ margin: 0, fontSize: "2rem" }}>Tableau de bord</h1>
      </div>

      <section style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 20 }}>
        <div style={{ width: 58, height: 58, borderRadius: "50%", overflow: "hidden", background: "#f1f5f9", border: "2px solid #fff", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26 }}>
          {profile?.avatar_url ? <img src={profile.avatar_url} alt={fullName} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : "👤"}
        </div>
        <div>
          <div style={{ color: "#64748b", fontSize: "0.82rem" }}>Profil</div>
          <strong style={{ color: "#0f172a", fontSize: "1.05rem" }}>{fullName}</strong>
        </div>
      </section>

      <Link to="/poster" className="btn-whatsapp" style={{ marginTop: 18, display: "inline-flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
        <Plus size={18} /> Nouvelle annonce
      </Link>

      <h2 style={{ marginTop: 28, marginBottom: 12 }}>Mes annonces</h2>
      <div style={{ display: "grid", gap: 10 }}>
        {(myAds ?? []).map((a: any) => (
          <div key={a.id} style={{ display: "flex", gap: 12, background: "#fff", borderRadius: 12, padding: 10, border: "1px solid #e5e7eb", alignItems: "center" }}>
            <Link to="/annonce/$id" params={{ id: a.id }} style={{ flexShrink: 0 }}>
              <div style={{ width: 64, height: 64, borderRadius: 10, overflow: "hidden", background: "#f1f5f9" }}>
                {a.image_url && <img src={a.image_url} alt={a.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
              </div>
            </Link>
            <div style={{ flex: 1, minWidth: 0 }}>
              <Link to="/annonce/$id" params={{ id: a.id }} style={{ color: "inherit", textDecoration: "none" }}>
                <div style={{ fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.title}</div>
              </Link>
              <div style={{ color: "#ea580c", fontWeight: 700 }}>{formatPrice(a.price)}</div>
              <div style={{ color: "#64748b", fontSize: "0.78rem" }}>
                {new Date(a.created_at).toLocaleDateString("fr-FR")} · {a.views ?? 0} vues · {a.expires_at && new Date(a.expires_at) <= new Date() ? "Expirée" : "Active"}
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <Link to="/modifier-annonce/$id" params={{ id: a.id }} aria-label="Modifier" style={{ background: "#2563eb", color: "#fff", borderRadius: 8, padding: 8, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                <Pencil size={16} />
              </Link>
              <button
                aria-label="Supprimer"
                onClick={async () => {
                  if (!confirm(`Supprimer l'annonce « ${a.title} » ?`)) return;
                  try {
                    await deleteFn({ data: { id: a.id } });
                    toast.success("Annonce supprimée");
                    qc.invalidateQueries({ queryKey: ["my-ads-list"] });
                  } catch (e: any) {
                    toast.error(e?.message ?? "Échec de suppression");
                  }
                }}
                style={{ background: "#dc2626", color: "#fff", borderRadius: 8, padding: 8, border: "none", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center" }}
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
        {myAds && myAds.length === 0 && <p style={{ color: "#64748b" }}>Vous n'avez pas encore d'annonce.</p>}
      </div>
    </SiteLayout>
  );
}
