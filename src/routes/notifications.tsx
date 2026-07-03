import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { SiteLayout } from "@/components/SiteLayout";
import { useAuth } from "@/lib/auth/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { formatPrice } from "@/lib/annonces";

export const Route = createFileRoute("/notifications")({ component: NotificationsPage });

type Notif = {
  id: string;
  user_id: string;
  actor_id: string | null;
  type: string;
  entity_type: string | null;
  entity_id: string | null;
  title: string | null;
  read_at: string | null;
  created_at: string;
};

function NotificationsPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  useEffect(() => { if (!loading && !user) navigate({ to: "/login" }); }, [user, loading, navigate]);

  // Direct notifications (likes, comments, follows, etc.)
  const { data: notifs } = useQuery({
    queryKey: ["notif-rows", user?.id],
    enabled: !!user,
    refetchInterval: 30_000,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("notifications")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(80);
      return (data ?? []) as Notif[];
    },
  });

  // Mark all as read on visit (like the Messages tab)
  useEffect(() => {
    if (!user) return;
    (async () => {
      await (supabase as any)
        .from("notifications")
        .update({ read_at: new Date().toISOString() })
        .eq("user_id", user.id)
        .is("read_at", null);
      qc.invalidateQueries({ queryKey: ["compte-notifs-unread", user.id] });
    })();
  }, [user, qc]);

  // Enrich with actor names
  const actorIds = Array.from(new Set((notifs ?? []).map((n) => n.actor_id).filter(Boolean))) as string[];
  const { data: actors } = useQuery({
    queryKey: ["notif-actors", actorIds.join(",")],
    enabled: actorIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("id,prenom,nom,avatar_url").in("id", actorIds);
      const map: Record<string, any> = {};
      for (const p of data ?? []) map[(p as any).id] = p;
      return map;
    },
  });

  // Followed sellers' latest ads
  const { data: items } = useQuery({
    queryKey: ["notifications-feed", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data: follows } = await supabase.from("seller_followers").select("seller_id").eq("follower_id", user!.id);
      const ids = (follows ?? []).map((f: any) => f.seller_id);
      if (ids.length === 0) return [];
      const { data: ads } = await supabase
        .from("annonces")
        .select("id,title,price,image_url,created_at,seller_id,seller_name")
        .in("seller_id", ids)
        .order("created_at", { ascending: false })
        .limit(50);
      return ads ?? [];
    },
  });

  const markRead = async (id: string) => {
    await (supabase as any).from("notifications").update({ read_at: new Date().toISOString() }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["notif-rows", user?.id] });
  };

  if (!user) return null;

  const renderNotif = (n: Notif) => {
    const actor = actors?.[n.actor_id ?? ""];
    const actorName = actor ? `${actor.prenom ?? ""} ${actor.nom ?? ""}`.trim() || "Quelqu'un" : "Quelqu'un";
    const isLikeAnnonce = n.type === "like_annonce";
    const isLikeShort = n.type === "like_short";
    const isCommentAnnonce = n.type === "comment_annonce";
    const isCommentShort = n.type === "comment_short";
    const isNewFollower = n.type === "new_follower";
    const label = isLikeAnnonce
      ? `👍 ${actorName} a liké votre annonce${n.title ? ` "${n.title}"` : ""}`
      : isLikeShort
        ? `👍 ${actorName} a liké votre short${n.title ? ` "${n.title}"` : ""}`
        : isCommentAnnonce
          ? `💬 ${actorName} a commenté votre annonce${n.title ? ` "${n.title}"` : ""}`
          : isCommentShort
            ? `💬 ${actorName} a commenté votre short${n.title ? ` "${n.title}"` : ""}`
            : isNewFollower
              ? `⭐ ${actorName} s'est abonné à votre boutique`
              : n.title ?? "Nouvelle notification";
    const linkProps: any = (isLikeAnnonce || isCommentAnnonce) && n.entity_id
      ? { to: "/annonce/$id", params: { id: n.entity_id } }
      : (isLikeShort || isCommentShort)
        ? { to: "/shorts" }
        : isNewFollower && n.actor_id
          ? { to: "/vendeur/$id", params: { id: n.actor_id } }
          : { to: "/notifications" };

    return (
      <Link
        key={n.id}
        {...linkProps}
        onClick={() => !n.read_at && markRead(n.id)}
        style={{
          display: "flex", gap: 12, alignItems: "center", padding: 10,
          background: n.read_at ? "#fff" : "#fff7ed",
          borderRadius: 12,
          border: "1px solid " + (n.read_at ? "#e5e7eb" : "#fed7aa"),
          textDecoration: "none", color: "inherit",
        }}
      >
        <div style={{ width: 44, height: 44, borderRadius: "50%", overflow: "hidden", background: "#f1f5f9", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
          {actor?.avatar_url
            ? <img src={actor.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            : <span>👤</span>}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: "0.95rem", fontWeight: n.read_at ? 500 : 700 }}>{label}</div>
          <div style={{ fontSize: "0.75rem", color: "#64748b" }}>{new Date(n.created_at).toLocaleString("fr-FR")}</div>
        </div>
      </Link>
    );
  };

  return (
    <SiteLayout hideHeader hideFooter>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 16 }}>
        <Link to="/compte" style={{ textDecoration: "none", color: "#0f172a", fontSize: "1.25rem" }}>←</Link>
        <h1 style={{ margin: 0 }}>Notifications</h1>
      </div>

      <h2 style={{ marginTop: 16, fontSize: "1rem", color: "#334155" }}>❤️ Activité récente</h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {(notifs ?? []).length === 0 && (
          <p style={{ color: "#64748b" }}>Aucune notification pour le moment.</p>
        )}
        {(notifs ?? []).map(renderNotif)}
      </div>

      <h2 style={{ marginTop: 20, fontSize: "1rem", color: "#334155" }}>🛍️ Nouvelles annonces des boutiques suivies</h2>
      {(items ?? []).length === 0 ? (
        <div style={{ padding: 16, textAlign: "center", color: "#64748b", background: "#fff", borderRadius: 12 }}>
          Abonne-toi à des boutiques pour voir leurs publications ici.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {(items ?? []).map((a: any) => (
            <Link key={a.id} to="/annonce/$id" params={{ id: a.id }} style={{ display: "flex", gap: 12, alignItems: "center", padding: 10, background: "#fff", borderRadius: 12, border: "1px solid #fed7aa", textDecoration: "none", color: "inherit" }}>
              {a.image_url ? <img src={a.image_url} alt={a.title} style={{ width: 64, height: 64, borderRadius: 8, objectFit: "cover" }} />
                : <div style={{ width: 64, height: 64, borderRadius: 8, background: "#f1f5f9" }} />}
              <div style={{ flex: 1, minWidth: 0 }}>
                <strong style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.title}</strong>
                <div style={{ color: "#16a34a", fontWeight: 700 }}>{formatPrice(a.price)}</div>
                <div style={{ fontSize: "0.78rem", color: "#64748b" }}>Par {a.seller_name} · {new Date(a.created_at).toLocaleDateString()}</div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </SiteLayout>
  );
}
