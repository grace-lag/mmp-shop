import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { SiteLayout } from "@/components/SiteLayout";
import { useAuth } from "@/lib/auth/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/chat")({
  validateSearch: (s: Record<string, unknown>) => ({ to: (s.to as string) || "" }),
  component: ChatPage,
});

function ChatPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { to } = Route.useSearch();
  const qc = useQueryClient();
  const [text, setText] = useState("");

  useEffect(() => { if (!loading && !user) navigate({ to: "/login" }); }, [user, loading, navigate]);

  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const validTo = to && UUID_RE.test(to) ? to : "";

  const { data: partner } = useQuery({
    queryKey: ["chat-partner", validTo],
    enabled: !!validTo,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, prenom, nom, avatar_url")
        .eq("id", validTo)
        .maybeSingle();
      return data;
    },
  });

  const { data: messages } = useQuery({
    queryKey: ["messages", user?.id, validTo],
    enabled: !!user && !!validTo,
    queryFn: async () => {
      const { data } = await supabase
        .from("messages")
        .select("*")
        .or(`and(sender_id.eq.${user!.id},receiver_id.eq.${validTo}),and(sender_id.eq.${validTo},receiver_id.eq.${user!.id})`)
        .order("created_at", { ascending: true });
      return data ?? [];
    },
  });

  // Mark partner's messages as read when entering / on new messages
  useEffect(() => {
    if (!user || !validTo) return;
    (async () => {
      await (supabase as any)
        .from("messages")
        .update({ read_at: new Date().toISOString() })
        .eq("receiver_id", user.id)
        .eq("sender_id", validTo)
        .is("read_at", null);
      qc.invalidateQueries({ queryKey: ["unread-messages"] });
      qc.invalidateQueries({ queryKey: ["my-messages"] });
    })();
  }, [user, validTo, messages?.length, qc]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase.channel("messages")
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, () => {
        qc.invalidateQueries({ queryKey: ["messages"] });
        qc.invalidateQueries({ queryKey: ["my-messages"] });
        qc.invalidateQueries({ queryKey: ["unread-messages"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, qc]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || !validTo) return toast.error("Destinataire requis");
    const { error } = await supabase.from("messages").insert({ sender_id: user!.id, receiver_id: validTo, content: text });
    if (error) return toast.error(error.message);
    setText("");
  };

  if (!user) return null;

  const partnerName = [partner?.prenom, partner?.nom].filter(Boolean).join(" ").trim() || "Utilisateur";

  if (!validTo) {
    return (
      <SiteLayout activeNav="historique">
        <h1 style={{ marginTop: 16 }}>Messages</h1>
        <p>Ouvre une discussion depuis ton <Link to="/historique">historique</Link> ou depuis la page d'une annonce.</p>
      </SiteLayout>
    );
  }

  return (
    <SiteLayout activeNav="historique">
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 16, paddingBottom: 12, borderBottom: "1px solid #e5e7eb" }}>
        <Link to="/historique" style={{ textDecoration: "none", color: "#e67e22", fontSize: "1.4rem" }}>←</Link>
        <div style={{ width: 40, height: 40, borderRadius: "50%", overflow: "hidden", background: "#e2e8f0", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, color: "#64748b" }}>
          {partner?.avatar_url
            ? <img src={partner.avatar_url} alt={partnerName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            : (partnerName[0]?.toUpperCase() ?? "U")}
        </div>
        <strong>{partnerName}</strong>
      </div>

      <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 16, height: 400, overflowY: "auto", marginTop: 12, background: "#fafafa" }}>
        {(messages ?? []).map((m: any) => {
          const mine = m.sender_id === user.id;
          const read = !!m.read_at;
          return (
            <div key={m.id} style={{ textAlign: mine ? "right" : "left", marginBottom: 8 }}>
              <span style={{ display: "inline-block", padding: "8px 12px", borderRadius: 14, background: mine ? "#e67e22" : "white", color: mine ? "white" : "#333", maxWidth: "75%", border: mine ? "none" : "1px solid #e5e7eb" }}>
                {m.content}
                {mine && (
                  <span style={{ marginLeft: 6, fontSize: "0.78em", color: read ? "#16a34a" : "rgba(255,255,255,0.85)", fontWeight: 700 }}>
                    {read ? "✓✓" : "✓"}
                  </span>
                )}
              </span>
            </div>
          );
        })}
        {messages && messages.length === 0 && <p style={{ textAlign: "center", color: "#94a3b8" }}>Aucun message. Dis bonjour 👋</p>}
      </div>

      <form onSubmit={send} style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <input className="search-input" value={text} onChange={(e) => setText(e.target.value)} placeholder="Écrire un message..." style={{ flex: 1 }} />
        <button className="btn-whatsapp">Envoyer</button>
      </form>
    </SiteLayout>
  );
}
