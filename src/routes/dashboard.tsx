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
  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [user, loading, navigate]);

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
    </SiteLayout>
  );
}
