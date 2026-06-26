import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, type ReactNode } from "react";
import { MessageCircle, Tag, ArrowUp, RefreshCw, MousePointerClick, Star, UserPlus, Pencil, Trash2 } from "lucide-react";
import { SiteLayout } from "@/components/SiteLayout";
import { useAuth } from "@/lib/auth/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { deleteAnnonceServerFn } from "@/lib/annonces.functions";
import { formatPrice } from "@/lib/annonces";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard")({ component: DashboardPage });

function StatCard({
  value,
  label,
  sub,
  icon,
}: {
  value: ReactNode;
  label: string;
  sub?: string;
  icon: ReactNode;
}) {
  return (
    <div
      style={{
        border: "1px solid #e5e7eb",
        borderRadius: 14,
        padding: 18,
        background: "#fff",
        position: "relative",
        minHeight: 130,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
      }}
    >
      <div style={{ position: "absolute", top: 16, right: 16, color: "#0f172a" }}>{icon}</div>
      <div style={{ fontSize: 36, fontWeight: 800, lineHeight: 1, color: "#0f172a" }}>{value}</div>
      <div>
        <div style={{ fontWeight: 700, color: "#0f172a", marginTop: 8 }}>{label}</div>
        {sub && <div style={{ color: "#64748b", marginTop: 2 }}>{sub}</div>}
      </div>
    </div>
  );
}

function DashboardPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const deleteFn = useServerFn(deleteAnnonceServerFn);
  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [user, loading, navigate]);

  const { data: myAds } = useQuery({
    queryKey: ["my-ads-list", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("annonces")
        .select("id,title,price,image_url,created_at,views")
        .eq("seller_id", user!.id)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: stats } = useQuery({
    queryKey: ["dashboard-stats", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const [{ data: annonces }, { count: pendingMsgs }] = await Promise.all([
        supabase
          .from("annonces")
          .select("id,views,created_at")
          .eq("seller_id", user!.id),
        supabase
          .from("messages")
          .select("id", { count: "exact", head: true })
          .eq("receiver_id", user!.id),
      ]);
      const list = annonces ?? [];
      const now = Date.now();
      const DAY = 86400000;
      const active = list.filter((a: any) => now - new Date(a.created_at).getTime() < 30 * DAY);
      const toRenew = list.filter((a: any) => {
        const age = now - new Date(a.created_at).getTime();
        return age >= 20 * DAY && age < 30 * DAY;
      });
      const expired = list.filter((a: any) => now - new Date(a.created_at).getTime() >= 30 * DAY);
      const last7 = list.filter((a: any) => now - new Date(a.created_at).getTime() < 7 * DAY);
      const clicks7 = last7.reduce((s: number, a: any) => s + (a.views ?? 0), 0);
      return {
        pendingDiscussions: pendingMsgs ?? 0,
        active: active.length,
        pending: list.length - active.length,
        toRenew: toRenew.length,
        expired: expired.length,
        clicks7,
      };
    },
  });

  if (!user) return null;

  const s = stats ?? {
    pendingDiscussions: 0,
    active: 0,
    pending: 0,
    toRenew: 0,
    expired: 0,
    clicks7: 0,
  };

  return (
    <SiteLayout>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 16, flexWrap: "wrap", gap: 8 }}>
        <h1 style={{ margin: 0 }}>Tableau de bord</h1>
        <Link to="/poster" className="btn-whatsapp">+ Nouvelle annonce</Link>
      </div>

      <h2 style={{ marginTop: 24, marginBottom: 12 }}>Aperçu</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
        <StatCard
          value={s.pendingDiscussions}
          label="Discussions en attente de réponse"
          icon={<MessageCircle size={22} />}
        />
        <StatCard
          value={s.active}
          label="Annonces actives"
          sub={`${s.pending} en attente`}
          icon={<Tag size={22} />}
        />
        <StatCard
          value={s.toRenew}
          label="Annonces à renouveler"
          icon={<ArrowUp size={22} />}
        />
        <StatCard
          value={s.expired}
          label="Annonces à supprimer et publier à nouveau"
          icon={<RefreshCw size={22} />}
        />
      </div>

      <h2 style={{ marginTop: 28, marginBottom: 12 }}>Performances</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
        <StatCard
          value={s.clicks7}
          label="Clics sur les annonces"
          sub="7 derniers jours"
          icon={<MousePointerClick size={22} />}
        />
        <StatCard
          value={<span>0 <Star size={26} style={{ verticalAlign: "middle" }} fill="#0f172a" /></span>}
          label="Évaluation vendeur"
          sub="0 évaluations"
          icon={<span />}
        />
        <StatCard
          value={0}
          label="Nouveaux followers"
          sub="7 derniers jours"
          icon={<UserPlus size={22} />}
        />
      </div>

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
              <div style={{ color: "#64748b", fontSize: "0.78rem" }}>{new Date(a.created_at).toLocaleDateString("fr-FR")} · {a.views ?? 0} vues</div>
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
                    qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
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
