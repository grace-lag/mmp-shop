import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Mail, CheckCircle2, Clock, Star } from "lucide-react";
import { SiteLayout } from "@/components/SiteLayout";
import { useAuth } from "@/lib/auth/AuthProvider";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/apercu")({ component: ApercuPage });

function ApercuPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  useEffect(() => { if (!loading && !user) navigate({ to: "/login" }); }, [user, loading, navigate]);

  const { data: counts } = useQuery({
    queryKey: ["apercu-counts", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const now = new Date().toISOString();
      const [{ data: unread }, { data: actives }, { data: expired }] = await Promise.all([
        (supabase as any).from("messages").select("id").eq("receiver_id", user!.id).is("read_at", null),
        supabase.from("annonces").select("id", { count: "exact", head: true }).eq("seller_id", user!.id).gt("expires_at", now),
        supabase.from("annonces").select("id", { count: "exact", head: true }).eq("seller_id", user!.id).lte("expires_at", now),
      ]);
      return { unread: unread?.length ?? 0, actives: (actives as any)?.count ?? 0, expired: (expired as any)?.count ?? 0 };
    },
  });

  if (!user) return null;

  const Tile = ({ Icon, title, to, badge, params }: any) => (
    <Link to={to} params={params} style={{ position: "relative", textDecoration: "none", color: "inherit", background: "#fff", borderRadius: 14, padding: 20, border: "1px solid #fed7aa", minHeight: 100, display: "flex", flexDirection: "column", gap: 10 }}>
      <Icon size={26} strokeWidth={1.8} color="#ea580c" />
      <strong>{title}</strong>
      {badge != null && badge > 0 && (
        <span style={{ position: "absolute", top: 10, right: 12, background: "#ea580c", color: "white", borderRadius: 999, padding: "2px 8px", fontSize: "0.72rem", fontWeight: 700 }}>{badge > 99 ? "99+" : badge}</span>
      )}
    </Link>
  );

  return (
    <SiteLayout hideHeader hideFooter>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 16 }}>
        <Link to="/compte" style={{ textDecoration: "none", color: "#0f172a", display: "inline-flex", alignItems: "center" }}><ArrowLeft size={22} /></Link>
        <h1 style={{ margin: 0 }}>Aperçu</h1>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 16 }}>
        <Tile Icon={Mail} title="Messages non lus" to="/messages-non-lus" badge={counts?.unread} />
        <Tile Icon={CheckCircle2} title="Annonces actives" to="/annonces-actives" badge={counts?.actives} />
        <Tile Icon={Clock} title="Annonces expirées" to="/annonces-expirees" badge={counts?.expired} />
        <Tile Icon={Star} title="Évaluation de ma boutique" to="/evaluations/$id" params={{ id: user.id }} />
      </div>
    </SiteLayout>
  );
}
