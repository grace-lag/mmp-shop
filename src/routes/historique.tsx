import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { SiteLayout } from "@/components/SiteLayout";
import { useAuth } from "@/lib/auth/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { formatPrice } from "@/lib/annonces";

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

const DAY = 24 * 3600 * 1000;
const PERIODS: { key: string; label: string; maxMs: number }[] = [
  { key: "3j", label: "Il y a 3 jours", maxMs: 3 * DAY },
  { key: "1s", label: "Il y a 1 semaine", maxMs: 7 * DAY },
  { key: "2s", label: "Il y a 2 semaines", maxMs: 14 * DAY },
  { key: "1m", label: "Il y a 1 mois", maxMs: 30 * DAY },
];

function HistoriquePage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<"visites" | "conversations">("visites");

  useEffect(() => { if (!loading && !user) navigate({ to: "/login" }); }, [user, loading, navigate]);

  if (!user) return null;

  return (
    <SiteLayout activeNav="historique">
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 16 }}>
        <h1 style={{ margin: 0 }}>Historique</h1>
      </div>
      <p style={{ color: "#64748b", marginTop: 4 }}>Vos annonces visitées et vos discussions.</p>

      <div style={{ display: "flex", gap: 8, marginTop: 14, marginBottom: 14 }}>
        <button
          onClick={() => setTab("visites")}
          style={{ flex: 1, padding: "10px 12px", borderRadius: 10, border: "none", background: tab === "visites" ? "#ea580c" : "#e2e8f0", color: tab === "visites" ? "#fff" : "#0f172a", fontWeight: 700, cursor: "pointer" }}
        >
          Annonces visitées
        </button>
        <button
          onClick={() => setTab("conversations")}
          style={{ flex: 1, padding: "10px 12px", borderRadius: 10, border: "none", background: tab === "conversations" ? "#ea580c" : "#e2e8f0", color: tab === "conversations" ? "#fff" : "#0f172a", fontWeight: 700, cursor: "pointer" }}
        >
          Conversations
        </button>
      </div>

      {tab === "visites" ? <VisitedTab userId={user.id} /> : <ConversationsTab userId={user.id} />}
    </SiteLayout>
  );
}

function VisitedTab({ userId }: { userId: string }) {
  const { data: views } = useQuery({
    queryKey: ["annonce-views-mine", userId],
    queryFn: async () => {
      const cutoff = new Date(Date.now() - 30 * DAY).toISOString();
      const { data } = await (supabase as any)
        .from("annonce_views")
        .select("annonce_id, created_at, annonces:annonce_id(id,title,price,image_url,city)")
        .eq("user_id", userId)
        .gte("created_at", cutoff)
        .order("created_at", { ascending: false });
      return (data ?? []) as any[];
    },
  });

  // Keep latest visit per annonce, drop rows without joined annonce (deleted)
  const items = useMemo(() => {
    const seen = new Set<string>();
    const out: any[] = [];
    for (const v of views ?? []) {
      if (!v.annonces) continue;
      if (seen.has(v.annonce_id)) continue;
      seen.add(v.annonce_id);
      out.push(v);
    }
    return out;
  }, [views]);

  const grouped = useMemo(() => {
    const now = Date.now();
    const groups: Record<string, any[]> = {};
    for (const it of items) {
      const age = now - new Date(it.created_at).getTime();
      const p = PERIODS.find((pp) => age <= pp.maxMs);
      if (!p) continue;
      (groups[p.key] ||= []).push(it);
    }
    return groups;
  }, [items]);

  if (!views) return <p style={{ color: "#64748b" }}>Chargement…</p>;

  if (items.length === 0) {
    return (
      <div style={{ padding: 24, textAlign: "center", color: "#64748b", background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12 }}>
        Aucune annonce visitée sur les 30 derniers jours. L'historique est automatiquement effacé après 1 mois.
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {PERIODS.map((p) => {
        const list = grouped[p.key];
        if (!list || list.length === 0) return null;
        return (
          <section key={p.key}>
            <h2 style={{ fontSize: "1rem", color: "#0f172a", marginBottom: 8 }}>{p.label} <span style={{ color: "#94a3b8", fontWeight: 400 }}>({list.length})</span></h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {list.map((it) => {
                const a = it.annonces;
                return (
                  <Link
                    key={`${it.annonce_id}-${it.created_at}`}
                    to="/annonce/$id"
                    params={{ id: a.id }}
                    style={{ display: "flex", alignItems: "center", gap: 12, padding: 10, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, textDecoration: "none", color: "inherit" }}
                  >
                    <div style={{ width: 62, height: 62, borderRadius: 10, overflow: "hidden", background: "#f1f5f9", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {a.image_url ? <img src={a.image_url} alt={a.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : "📷"}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <strong style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.title}</strong>
                      <div style={{ color: "#ea580c", fontWeight: 700, fontSize: "0.9rem" }}>{formatPrice(a.price)}</div>
                      <div style={{ color: "#64748b", fontSize: "0.78rem" }}>{a.city}</div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        );
      })}
      <p style={{ color: "#94a3b8", fontSize: "0.78rem", textAlign: "center" }}>
        Au-delà d'un mois, l'historique est automatiquement supprimé.
      </p>
    </div>
  );
}

function ConversationsTab({ userId }: { userId: string }) {
  const { data: messages } = useQuery({
    queryKey: ["my-messages", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("messages")
        .select("*")
        .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
        .order("created_at", { ascending: false });
      return (data ?? []) as Msg[];
    },
  });

  const conversations = useMemo(() => {
    const lastMap = new Map<string, Msg>();
    const unreadMap = new Map<string, number>();
    for (const m of messages ?? []) {
      const partner = m.sender_id === userId ? m.receiver_id : m.sender_id;
      if (!lastMap.has(partner)) lastMap.set(partner, m);
      if (m.receiver_id === userId && !m.read_at) {
        unreadMap.set(partner, (unreadMap.get(partner) ?? 0) + 1);
      }
    }
    return Array.from(lastMap.entries()).map(([partnerId, last]) => ({
      partnerId, last, unread: unreadMap.get(partnerId) ?? 0,
    }));
  }, [messages, userId]);

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

  const fmt = (d: string) => {
    const dt = new Date(d);
    const now = new Date();
    const sameDay = dt.toDateString() === now.toDateString();
    return sameDay
      ? dt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      : dt.toLocaleDateString([], { day: "2-digit", month: "2-digit" });
  };

  return (
    <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, overflow: "hidden", background: "white" }}>
      {conversations.length === 0 && (
        <div style={{ padding: 24, textAlign: "center", color: "#64748b" }}>
          Aucune discussion pour le moment. Ouvrez une annonce et cliquez sur « Message privé » pour démarrer une conversation.
        </div>
      )}
      {conversations.map(({ partnerId, last, unread }) => {
        const p = profileMap.get(partnerId);
        const name = [p?.prenom, p?.nom].filter(Boolean).join(" ").trim() || "Utilisateur";
        const isMine = last.sender_id === userId;
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
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ flex: 1, color: unread > 0 ? "#0f172a" : "#64748b", fontWeight: unread > 0 ? 600 : 400, fontSize: "0.88rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {isMine ? "Vous : " : ""}{last.content}
                </div>
                {unread > 0 && (
                  <span style={{ background: "#16a34a", color: "white", borderRadius: 999, padding: "2px 8px", fontSize: "0.72rem", fontWeight: 700, flexShrink: 0 }}>
                    {unread > 99 ? "99+" : unread}
                  </span>
                )}
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
