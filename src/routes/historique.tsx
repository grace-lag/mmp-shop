import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";
import { SiteLayout } from "@/components/SiteLayout";
import { useAuth } from "@/lib/auth/AuthProvider";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/historique")({ component: HistoriquePage });

type Msg = {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
  read_at: string | null;
};

type Profile = {
  id: string;
  prenom: string | null;
  nom: string | null;
  avatar_url: string | null;
};

function HistoriquePage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  useEffect(() => { if (!loading && !user) navigate({ to: "/login" }); }, [user, loading, navigate]);

  const { data: messages } = useQuery({
    queryKey: ["my-messages", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("messages")
        .select("*")
        .or(`sender_id.eq.${user!.id},receiver_id.eq.${user!.id}`)
        .order("created_at", { ascending: false });
      return (data ?? []) as Msg[];
    },
  });

  // Group by conversation partner -> keep latest message
  const conversations = useMemo(() => {
    const map = new Map<string, Msg>();
    for (const m of messages ?? []) {
      const partner = m.sender_id === user?.id ? m.receiver_id : m.sender_id;
      if (!map.has(partner)) map.set(partner, m);
    }
    return Array.from(map.entries()).map(([partnerId, last]) => ({ partnerId, last }));
  }, [messages, user?.id]);

  const partnerIds = conversations.map((c) => c.partnerId);

  const { data: profiles } = useQuery({
    queryKey: ["chat-partners", partnerIds.sort().join(",")],
    enabled: partnerIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, prenom, nom, avatar_url")
        .in("id", partnerIds);
      return (data ?? []) as Profile[];
    },
  });

  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));

  if (!user) return null;

  const fmt = (d: string) => {
    const dt = new Date(d);
    const now = new Date();
    const sameDay = dt.toDateString() === now.toDateString();
    return sameDay
      ? dt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      : dt.toLocaleDateString([], { day: "2-digit", month: "2-digit" });
  };

  return (
    <SiteLayout activeNav="historique">
      <h1 style={{ marginTop: 16 }}>Messages</h1>
      <p style={{ color: "#64748b", marginTop: 4 }}>Vos discussions avec les vendeurs et acheteurs.</p>

      <div style={{ marginTop: 16, border: "1px solid #e5e7eb", borderRadius: 12, overflow: "hidden", background: "white" }}>
        {conversations.length === 0 && (
          <div style={{ padding: 24, textAlign: "center", color: "#64748b" }}>
            Aucune discussion pour le moment. Ouvrez une annonce et cliquez sur « Message privé » pour démarrer une conversation.
          </div>
        )}
        {conversations.map(({ partnerId, last }) => {
          const p = profileMap.get(partnerId);
          const name = [p?.prenom, p?.nom].filter(Boolean).join(" ").trim() || "Utilisateur";
          const isMine = last.sender_id === user.id;
          return (
            <Link
              key={partnerId}
              to="/chat"
              search={{ to: partnerId }}
              style={{
                display: "flex", alignItems: "center", gap: 12,
                padding: "12px 14px", borderBottom: "1px solid #f1f5f9",
                textDecoration: "none", color: "inherit",
              }}
            >
              <div style={{ width: 48, height: 48, borderRadius: "50%", overflow: "hidden", background: "#e2e8f0", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, color: "#64748b" }}>
                {p?.avatar_url
                  ? <img src={p.avatar_url} alt={name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  : (name[0]?.toUpperCase() ?? "U")}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                  <strong style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</strong>
                  <span style={{ fontSize: "0.75rem", color: "#94a3b8", flexShrink: 0 }}>{fmt(last.created_at)}</span>
                </div>
                <div style={{ color: "#64748b", fontSize: "0.88rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {isMine ? "Vous : " : ""}{last.content}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </SiteLayout>
  );
}
