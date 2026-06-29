import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { Smile, Paperclip, Pencil, Trash2, Check, X, MoreVertical, Copy, Archive } from "lucide-react";
import { SiteLayout } from "@/components/SiteLayout";
import { EmojiPicker } from "@/components/EmojiPicker";
import { Attachment } from "@/components/Attachment";
import { uploadChatFile } from "@/lib/uploads";
import { useAuth } from "@/lib/auth/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const EDIT_WINDOW_MS = 15 * 60 * 1000;

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
  const [showEmoji, setShowEmoji] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const [now, setNow] = useState(Date.now());
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [headerMenuOpen, setHeaderMenuOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (!loading && !user) navigate({ to: "/login" }); }, [user, loading, navigate]);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);

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

  const messagesKey = ["messages", user?.id, validTo] as const;

  const { data: messages } = useQuery({
    queryKey: messagesKey,
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

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages?.length]);

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

  const sendMessage = async (payload: { content: string | null; attachment_url?: string; attachment_type?: string; attachment_name?: string }) => {
    if (!validTo) return;
    const tempId = `temp-${Date.now()}-${Math.random()}`;
    const optimistic = {
      id: tempId, sender_id: user!.id, receiver_id: validTo,
      content: payload.content, attachment_url: payload.attachment_url ?? null,
      attachment_type: payload.attachment_type ?? null, attachment_name: payload.attachment_name ?? null,
      created_at: new Date().toISOString(), read_at: null, edited_at: null, deleted_at: null, _optimistic: true,
    };
    qc.setQueryData(messagesKey, (prev: any[] = []) => [...prev, optimistic]);
    const { data, error } = await supabase
      .from("messages")
      .insert({ sender_id: user!.id, receiver_id: validTo, ...payload })
      .select().single();
    if (error) {
      qc.setQueryData(messagesKey, (prev: any[] = []) => prev.filter((m) => m.id !== tempId));
      toast.error(error.message);
      return;
    }
    qc.setQueryData(messagesKey, (prev: any[] = []) => prev.map((m) => (m.id === tempId ? data : m)));
  };

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const content = text.trim();
    if (!content || !validTo) return;
    setText("");
    setShowEmoji(false);
    await sendMessage({ content });
  };

  const onPickFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f || !user) return;
    setUploading(true);
    try {
      const att = await uploadChatFile(f, user.id, "chat");
      await sendMessage({ content: null, attachment_url: att.url, attachment_type: att.type, attachment_name: att.name });
    } catch (err: any) {
      toast.error(err.message ?? "Upload échoué");
    } finally {
      setUploading(false);
    }
  };

  const startEdit = (m: any) => { setEditingId(m.id); setEditingText(m.content ?? ""); };
  const saveEdit = async () => {
    if (!editingId) return;
    const newContent = editingText.trim();
    if (!newContent) return;
    const { error } = await (supabase as any)
      .from("messages")
      .update({ content: newContent, edited_at: new Date().toISOString() })
      .eq("id", editingId);
    if (error) return toast.error(error.message);
    setEditingId(null); setEditingText("");
    qc.invalidateQueries({ queryKey: messagesKey });
  };
  const deleteMsg = async (id: string) => {
    if (!confirm("Supprimer ce message ?")) return;
    const { error } = await supabase.from("messages").delete().eq("id", id);
    if (error) return toast.error(error.message);
    qc.setQueryData(messagesKey, (prev: any[] = []) => prev.filter((m) => m.id !== id));
  };

  const copyMsg = async (m: any) => {
    try {
      await navigator.clipboard.writeText(m.content ?? m.attachment_url ?? "");
      toast.success("Copié");
    } catch { toast.error("Impossible de copier"); }
    setOpenMenuId(null);
  };

  const deleteConversation = async () => {
    if (!confirm("Supprimer toute cette conversation ?")) return;
    const { error } = await (supabase as any).rpc("delete_conversation", { p_partner: validTo });
    if (error) return toast.error(error.message);
    toast.success("Conversation supprimée");
    qc.invalidateQueries({ queryKey: ["my-messages"] });
    navigate({ to: "/historique" });
  };

  const archiveConversation = async () => {
    const { error } = await (supabase as any).rpc("archive_conversation", { p_partner: validTo });
    if (error) return toast.error(error.message);
    toast.success("Conversation archivée");
    qc.invalidateQueries({ queryKey: ["my-messages"] });
    navigate({ to: "/historique" });
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
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 16, paddingBottom: 12, borderBottom: "1px solid #e5e7eb", position: "relative" }}>
        <Link to="/historique" style={{ textDecoration: "none", color: "#e67e22", fontSize: "1.4rem" }}>←</Link>
        <div style={{ width: 40, height: 40, borderRadius: "50%", overflow: "hidden", background: "#e2e8f0", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, color: "#64748b" }}>
          {partner?.avatar_url
            ? <img src={partner.avatar_url} alt={partnerName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            : (partnerName[0]?.toUpperCase() ?? "U")}
        </div>
        <strong style={{ flex: 1 }}>{partnerName}</strong>
        <button
          type="button"
          onClick={() => setHeaderMenuOpen((v) => !v)}
          aria-label="Options"
          style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b", padding: 6 }}
        >
          <MoreVertical size={20} />
        </button>
        {headerMenuOpen && (
          <div style={{ position: "absolute", top: 48, right: 0, background: "white", border: "1px solid #e5e7eb", borderRadius: 8, boxShadow: "0 6px 18px rgba(0,0,0,0.12)", zIndex: 20, minWidth: 200 }}>
            <button onClick={() => { setHeaderMenuOpen(false); archiveConversation(); }} style={menuItem}>
              <Archive size={15} /> Archiver la conversation
            </button>
            <button onClick={() => { setHeaderMenuOpen(false); deleteConversation(); }} style={{ ...menuItem, color: "#dc2626" }}>
              <Trash2 size={15} /> Supprimer la conversation
            </button>
          </div>
        )}
      </div>

      <div ref={scrollRef} style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 16, height: 400, overflowY: "auto", marginTop: 12, background: "#fafafa" }}>
        {(messages ?? []).map((m: any) => {
          const mine = m.sender_id === user.id;
          const read = !!m.read_at;
          const createdMs = new Date(m.created_at).getTime();
          const canEdit = mine && !m._optimistic && (now - createdMs) < EDIT_WINDOW_MS && !!m.content;
          const isEditing = editingId === m.id;
          return (
            <div key={m.id} style={{ display: "flex", flexDirection: "column", alignItems: mine ? "flex-end" : "flex-start", marginBottom: 10 }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 6, maxWidth: "85%" }}>
                {mine && !isEditing && (
                  <div style={{ display: "flex", gap: 4 }}>
                    {canEdit && (
                      <button onClick={() => startEdit(m)} aria-label="Modifier" style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b", padding: 4 }}>
                        <Pencil size={14} />
                      </button>
                    )}
                    {!m._optimistic && (now - createdMs) < EDIT_WINDOW_MS && (
                      <button onClick={() => deleteMsg(m.id)} aria-label="Supprimer" style={{ background: "none", border: "none", cursor: "pointer", color: "#dc2626", padding: 4 }}>
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                )}
                {isEditing ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <textarea value={editingText} onChange={(e) => setEditingText(e.target.value)} rows={2}
                      style={{ padding: "8px 12px", borderRadius: 14, border: "1px solid #cbd5e1", minWidth: 220, fontFamily: "inherit", fontSize: 15 }} />
                    <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                      <button onClick={() => { setEditingId(null); setEditingText(""); }} style={{ background: "#e2e8f0", border: "none", borderRadius: 8, padding: "4px 8px", cursor: "pointer" }}><X size={14} /></button>
                      <button onClick={saveEdit} style={{ background: "#16a34a", color: "white", border: "none", borderRadius: 8, padding: "4px 8px", cursor: "pointer" }}><Check size={14} /></button>
                    </div>
                  </div>
                ) : (
                  <span style={{
                    display: "inline-block", padding: "8px 12px", borderRadius: 14,
                    background: mine ? "#e67e22" : "white", color: mine ? "white" : "#333",
                    border: mine ? "none" : "1px solid #e5e7eb", wordBreak: "break-word",
                    opacity: m._optimistic ? 0.7 : 1,
                  }}>
                    {m.content && <div>{m.content}</div>}
                    {m.attachment_url && <Attachment url={m.attachment_url} type={m.attachment_type} name={m.attachment_name} />}
                    {m.edited_at && <span style={{ marginLeft: 6, fontSize: "0.72em", opacity: 0.75, fontStyle: "italic" }}>(modifié)</span>}
                    {mine && !m._optimistic && (
                      <span style={{ marginLeft: 6, fontSize: "0.78em", color: read ? "#16a34a" : "rgba(255,255,255,0.85)", fontWeight: 700 }}>
                        {read ? "✓✓" : "✓"}
                      </span>
                    )}
                  </span>
                )}
              </div>
            </div>
          );
        })}
        {messages && messages.length === 0 && <p style={{ textAlign: "center", color: "#94a3b8" }}>Aucun message. Dis bonjour 👋</p>}
      </div>

      {showEmoji && (
        <div style={{ marginTop: 8 }}>
          <EmojiPicker onPick={(e) => setText((t) => t + e)} onClose={() => setShowEmoji(false)} />
        </div>
      )}

      <form onSubmit={send} style={{ display: "flex", gap: 8, alignItems: "flex-end", marginTop: 12 }}>
        <input ref={fileRef} type="file" accept="image/*,video/*,*/*" onChange={onPickFile} style={{ display: "none" }} />
        <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading} aria-label="Joindre un fichier"
          style={{ background: "#f0f2f5", border: "1px solid #e2e8f0", borderRadius: 20, padding: 10, cursor: "pointer", color: "#64748b" }}>
          <Paperclip size={20} />
        </button>
        <button type="button" onClick={() => setShowEmoji((v) => !v)} aria-label="Émojis"
          style={{ background: "#f0f2f5", border: "1px solid #e2e8f0", borderRadius: 20, padding: 10, cursor: "pointer", color: "#64748b" }}>
          <Smile size={20} />
        </button>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(e as any); } }}
          placeholder={uploading ? "Envoi du fichier..." : "Écrire un message..."}
          rows={1}
          style={{
            flex: 1, padding: "10px 14px", borderRadius: 20,
            border: "1px solid #e2e8f0", background: "#f0f2f5",
            fontFamily: "inherit", fontSize: 15, outline: "none",
            resize: "none", minHeight: 42, maxHeight: 140,
          }}
        />
        <button type="submit" disabled={!text.trim()}
          style={{
            padding: "10px 18px", borderRadius: 20, border: "none",
            background: text.trim() ? "#2563eb" : "#cbd5e1", color: "#fff",
            fontWeight: 600, fontSize: 14, cursor: text.trim() ? "pointer" : "not-allowed",
          }}>
          Envoyer
        </button>
      </form>
    </SiteLayout>
  );
}
