import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { Search, Send, Smile, Paperclip } from "lucide-react";
import { SiteLayout } from "@/components/SiteLayout";
import { EmojiPicker } from "@/components/EmojiPicker";
import { Attachment } from "@/components/Attachment";
import { uploadChatFile } from "@/lib/uploads";
import { useAuth } from "@/lib/auth/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const Route = createFileRoute("/social-chat")({
  validateSearch: (s: Record<string, unknown>) => ({ to: (s.to as string) || "" }),
  component: SocialChatPage,
});

function SocialChatPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { to } = Route.useSearch();
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [searchUser, setSearchUser] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (!loading && !user) navigate({ to: "/login" }); }, [user, loading, navigate]);

  const validTo = to && UUID_RE.test(to) ? to : "";

  // List of conversations (partners I've exchanged messages with)
  const { data: convos } = useQuery({
    queryKey: ["social-convos", user?.id],
    enabled: !!user,
    refetchInterval: 8000,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("messages")
        .select("sender_id,receiver_id,created_at,content")
        .or(`sender_id.eq.${user!.id},receiver_id.eq.${user!.id}`)
        .order("created_at", { ascending: false })
        .limit(200);
      const map = new Map<string, { id: string; lastAt: string; lastText: string }>();
      for (const m of data ?? []) {
        const other = m.sender_id === user!.id ? m.receiver_id : m.sender_id;
        if (!map.has(other)) map.set(other, { id: other, lastAt: m.created_at, lastText: m.content ?? "📎 Pièce jointe" });
      }
      const ids = Array.from(map.keys());
      if (ids.length === 0) return [];
      const { data: profs } = await supabase.from("public_profiles").select("id,prenom,nom,avatar_url").in("id", ids);
      return ids.map((id) => ({ ...map.get(id)!, profile: (profs ?? []).find((p: any) => p.id === id) }));
    },
  });

  // Search users to start new chat
  const { data: searchResults } = useQuery({
    queryKey: ["social-search", searchUser],
    enabled: searchUser.trim().length >= 2,
    queryFn: async () => {
      const term = `%${searchUser.trim()}%`;
      const { data } = await supabase
        .from("public_profiles")
        .select("id,prenom,nom,avatar_url")
        .or(`prenom.ilike.${term},nom.ilike.${term}`)
        .limit(20);
      return (data ?? []).filter((p: any) => p.id !== user?.id);
    },
  });

  const { data: partner } = useQuery({
    queryKey: ["social-partner", validTo],
    enabled: !!validTo,
    queryFn: async () => {
      const { data } = await supabase.from("public_profiles").select("id,prenom,nom,avatar_url").eq("id", validTo).maybeSingle();
      return data;
    },
  });

  const { data: messages } = useQuery({
    queryKey: ["social-msgs", user?.id, validTo],
    enabled: !!user && !!validTo,
    refetchInterval: 4000,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("messages")
        .select("*")
        .or(`and(sender_id.eq.${user!.id},receiver_id.eq.${validTo}),and(sender_id.eq.${validTo},receiver_id.eq.${user!.id})`)
        .order("created_at", { ascending: true });
      // mark received as read
      const unread = (data ?? []).filter((m: any) => m.receiver_id === user!.id && !m.read_at);
      if (unread.length) {
        await (supabase as any).from("messages").update({ read_at: new Date().toISOString() }).in("id", unread.map((m: any) => m.id));
      }
      return data ?? [];
    },
  });

  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight }); }, [messages?.length]);

  const send = async (payload: { content?: string | null; attachment_url?: string; attachment_type?: string; attachment_name?: string }) => {
    if (!user || !validTo) return;
    const { error } = await (supabase as any).from("messages").insert({ sender_id: user.id, receiver_id: validTo, ...payload });
    if (error) return toast.error(error.message);
    setText("");
    setShowEmoji(false);
    qc.invalidateQueries({ queryKey: ["social-msgs"] });
    qc.invalidateQueries({ queryKey: ["social-convos"] });
  };

  const onPickFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f || !user) return;
    setUploading(true);
    try {
      const att = await uploadChatFile(f, user.id, "chat");
      await send({ content: text.trim() || null, attachment_url: att.url, attachment_type: att.type, attachment_name: att.name });
    } catch (err: any) {
      toast.error(err.message ?? "Upload échoué");
    } finally { setUploading(false); }
  };

  if (!user) return null;

  return (
    <SiteLayout hideHeader hideFooter>
      {/* Bandeau orange "Bienvenue sur MaMarketplace / Tchat" */}
      <div style={{
        background: "linear-gradient(135deg, #f97316, #ea580c)",
        color: "#fff", borderRadius: 14, padding: "18px 16px",
        textAlign: "center", marginTop: 14,
        boxShadow: "0 4px 14px rgba(234,88,12,0.25)",
      }}>
        <div style={{ fontSize: "1.05rem", letterSpacing: 0.3, opacity: 0.95 }}>Bienvenue sur</div>
        <div style={{ fontSize: "1.5rem", fontWeight: 800, lineHeight: 1.15, marginTop: 2 }}>MaMarketplace</div>
        <div style={{ fontSize: "1.1rem", fontWeight: 700, opacity: 0.95 }}>Tchat</div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr)", gap: 14, marginTop: 14 }}>
        {/* Recherche utilisateur */}
        <div style={{ background: "#fff", borderRadius: 12, padding: 10, border: "1px solid #e5e7eb" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#f8fafc", borderRadius: 999, padding: "8px 12px", border: "1px solid #e5e7eb" }}>
            <Search size={16} color="#64748b" />
            <input
              value={searchUser}
              onChange={(e) => setSearchUser(e.target.value)}
              placeholder="Chercher une personne pour démarrer un chat"
              style={{ flex: 1, border: "none", outline: "none", background: "transparent", fontSize: 14 }}
            />
          </div>
          {searchResults && searchResults.length > 0 && (
            <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 6 }}>
              {searchResults.map((p: any) => {
                const name = [p.prenom, p.nom].filter(Boolean).join(" ") || "Utilisateur";
                return (
                  <Link key={p.id} to="/social-chat" search={{ to: p.id } as any} onClick={() => setSearchUser("")}
                    style={{ display: "flex", alignItems: "center", gap: 10, padding: 8, borderRadius: 10, textDecoration: "none", color: "inherit", background: "#fff7ed" }}>
                    <Avatar url={p.avatar_url} name={name} size={36} />
                    <strong>{name}</strong>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Liste des conversations */}
        {(convos ?? []).length > 0 && (
          <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e5e7eb", overflow: "hidden" }}>
            <div style={{ padding: "10px 14px", fontWeight: 700, borderBottom: "1px solid #f1f5f9" }}>Mes conversations</div>
            {(convos ?? []).map((c) => {
              const name = [c.profile?.prenom, c.profile?.nom].filter(Boolean).join(" ") || "Utilisateur";
              const active = c.id === validTo;
              return (
                <Link key={c.id} to="/social-chat" search={{ to: c.id } as any}
                  style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", textDecoration: "none", color: "inherit", background: active ? "#fff7ed" : "transparent", borderTop: "1px solid #f8fafc" }}>
                  <Avatar url={c.profile?.avatar_url ?? undefined} name={name} size={40} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600 }}>{name}</div>
                    <div style={{ color: "#64748b", fontSize: "0.82rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.lastText}</div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {/* Zone de chat */}
        {validTo ? (
          <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e5e7eb", display: "flex", flexDirection: "column", minHeight: 420 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderBottom: "1px solid #f1f5f9", background: "#fff7ed", borderTopLeftRadius: 12, borderTopRightRadius: 12 }}>
              <Avatar url={partner?.avatar_url ?? undefined} name={[partner?.prenom, partner?.nom].filter(Boolean).join(" ") || "..."} size={36} />
              <div>
                <div style={{ fontWeight: 700 }}>{[partner?.prenom, partner?.nom].filter(Boolean).join(" ") || "Utilisateur"}</div>
                <Link to="/u/$id" params={{ id: validTo }} style={{ fontSize: "0.78rem", color: "#ea580c" }}>Voir le profil</Link>
              </div>
            </div>
            <div ref={scrollRef} style={{ flex: 1, padding: 14, overflowY: "auto", display: "flex", flexDirection: "column", gap: 6, background: "#f8fafc", maxHeight: 480 }}>
              {(messages ?? []).map((m: any) => {
                const mine = m.sender_id === user.id;
                return (
                  <div key={m.id} style={{ alignSelf: mine ? "flex-end" : "flex-start", maxWidth: "82%", background: mine ? "#dcf8c6" : "#fff", border: "1px solid #e5e7eb", borderRadius: 14, padding: "8px 12px" }}>
                    {m.content && <div style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{m.content}</div>}
                    {m.attachment_url && <Attachment url={m.attachment_url} type={m.attachment_type} name={m.attachment_name} />}
                    <div style={{ fontSize: "0.68rem", color: "#64748b", marginTop: 2, textAlign: "right" }}>
                      {new Date(m.created_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                      {mine && <span style={{ marginLeft: 4 }}>{m.read_at ? "✓✓" : "✓"}</span>}
                    </div>
                  </div>
                );
              })}
              {messages && messages.length === 0 && <div style={{ color: "#64748b", textAlign: "center", marginTop: 20 }}>Démarrez la conversation 👋</div>}
            </div>
            {showEmoji && <div style={{ padding: 8 }}><EmojiPicker onPick={(e) => setText((t) => t + e)} onClose={() => setShowEmoji(false)} /></div>}
            <form onSubmit={(e) => { e.preventDefault(); if (!text.trim()) return; send({ content: text.trim() }); }}
              style={{ display: "flex", alignItems: "flex-end", gap: 6, padding: 10, borderTop: "1px solid #f1f5f9" }}>
              <input ref={fileRef} type="file" accept="image/*,video/*,*/*" onChange={onPickFile} style={{ display: "none" }} />
              <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading} style={iconBtn} aria-label="Joindre"><Paperclip size={18} /></button>
              <button type="button" onClick={() => setShowEmoji((v) => !v)} style={iconBtn} aria-label="Émojis"><Smile size={18} /></button>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Écris un message..."
                rows={1}
                style={{ flex: 1, padding: "10px 14px", borderRadius: 20, border: "1px solid #e2e8f0", background: "#f0f2f5", fontFamily: "inherit", fontSize: 15, outline: "none", resize: "none", maxHeight: 120 }}
              />
              <button type="submit" disabled={!text.trim()} style={{ ...iconBtn, background: text.trim() ? "#ea580c" : "#cbd5e1", color: "#fff", border: "none" }} aria-label="Envoyer"><Send size={18} /></button>
            </form>
          </div>
        ) : (
          <div style={{ textAlign: "center", color: "#64748b", padding: 30 }}>
            👈 Cherchez ou sélectionnez une personne pour commencer à discuter.
          </div>
        )}
      </div>
    </SiteLayout>
  );
}

const iconBtn: React.CSSProperties = { background: "#f0f2f5", border: "1px solid #e2e8f0", borderRadius: 20, padding: 8, cursor: "pointer", color: "#64748b" };

function Avatar({ url, name, size = 40 }: { url?: string; name: string; size?: number }) {
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", overflow: "hidden", background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      {url ? <img src={url} alt={name} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span style={{ fontSize: size * 0.5 }}>👤</span>}
    </div>
  );
}
