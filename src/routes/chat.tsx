import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { Smile, Paperclip, Pencil, Trash2, Check, X, MoreVertical, Copy, Archive, Mic, Forward, Star, Send } from "lucide-react";
import { SiteLayout } from "@/components/SiteLayout";
import { EmojiPicker } from "@/components/EmojiPicker";
import { Attachment } from "@/components/Attachment";
import { uploadChatFile } from "@/lib/uploads";
import { WavRecorder } from "@/lib/wav-recorder";
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
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const wavRecRef = useRef<WavRecorder | null>(null);
  const recordTimerRef = useRef<number | null>(null);
  const [forwardFrom, setForwardFrom] = useState<any>(null);
  const [importantIds, setImportantIds] = useState<Set<string>>(() => {
    if (typeof window === "undefined") return new Set();
    try { return new Set(JSON.parse(localStorage.getItem("chat-important") || "[]")); } catch { return new Set(); }
  });
  const toggleImportant = (id: string) => {
    setImportantIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); toast.success("Message retiré des importants"); }
      else { next.add(id); toast.success("Message marqué comme important"); }
      try { localStorage.setItem("chat-important", JSON.stringify(Array.from(next))); } catch {}
      return next;
    });
  };

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

  const startRecording = async () => {
    if (!user) return;
    try {
      const rec = await WavRecorder.start();
      wavRecRef.current = rec;
      setRecording(true);
      setRecordSeconds(0);
      recordTimerRef.current = window.setInterval(() => setRecordSeconds((s) => s + 1), 1000);
    } catch (err: any) {
      toast.error("Micro indisponible : " + (err?.message ?? "permission refusée"));
    }
  };
  const stopRecording = async (cancel = false) => {
    const rec = wavRecRef.current;
    if (recordTimerRef.current) { clearInterval(recordTimerRef.current); recordTimerRef.current = null; }
    setRecording(false);
    wavRecRef.current = null;
    if (!rec) return;
    if (cancel) { rec.cancel(); return; }
    const blob = rec.stop();
    const file = new File([blob], `voice-${Date.now()}.wav`, { type: "audio/wav" });
    setUploading(true);
    try {
      const att = await uploadChatFile(file, user!.id, "chat");
      await sendMessage({ content: null, attachment_url: att.url, attachment_type: "audio/wav", attachment_name: file.name });
    } catch (err: any) {
      toast.error(err.message ?? "Envoi audio échoué");
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
    const { error } = await (supabase as any).rpc("delete_conversation", { _other_user: validTo });
    if (error) return toast.error(error.message);
    toast.success("Conversation supprimée");
    qc.invalidateQueries({ queryKey: ["my-messages"] });
    navigate({ to: "/historique" });
  };

  const archiveConversation = async () => {
    const { error } = await (supabase as any).rpc("archive_conversation", { _other_user: validTo });
    if (error) return toast.error(error.message);
    toast.success("Conversation archivée");
    qc.invalidateQueries({ queryKey: ["my-messages"] });
    navigate({ to: "/historique" });
  };

  // Theme customization
  const [theme, setTheme] = useState<string>(() => {
    if (typeof window === "undefined") return "default";
    return localStorage.getItem(`chat-theme-${validTo}`) || "default";
  });
  const [showPerso, setShowPerso] = useState(false);
  useEffect(() => {
    if (typeof window !== "undefined") localStorage.setItem(`chat-theme-${validTo}`, theme);
  }, [theme, validTo]);
  const themes: Record<string, { bg: string; mine: string; other: string }> = {
    default: { bg: "#fafafa", mine: "#e67e22", other: "white" },
    blue: { bg: "#eff6ff", mine: "#2563eb", other: "white" },
    green: { bg: "#f0fdf4", mine: "#15803d", other: "white" },
    dark: { bg: "#1f2937", mine: "#ea580c", other: "#374151" },
    rose: { bg: "#fff1f2", mine: "#e11d48", other: "white" },
  };
  const T = themes[theme] ?? themes.default;
  const darkTheme = theme === "dark";

  // Close menus on outside click / escape
  useEffect(() => {
    if (!openMenuId && !headerMenuOpen && !showPerso) return;
    const close = () => { setOpenMenuId(null); setHeaderMenuOpen(false); setShowPerso(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    document.addEventListener("click", close);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("click", close); document.removeEventListener("keydown", onKey); };
  }, [openMenuId, headerMenuOpen, showPerso]);


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

  const stop = (e: React.MouseEvent) => e.stopPropagation();

  return (
    <SiteLayout activeNav="historique" hideFooter>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 16, paddingBottom: 12, borderBottom: "1px solid #e5e7eb", position: "relative" }} onClick={stop}>
        <Link to="/historique" style={{ textDecoration: "none", color: "#e67e22", fontSize: "1.4rem" }}>←</Link>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); if (partner?.avatar_url) setLightbox(partner.avatar_url); }}
          aria-label="Voir la photo"
          style={{ width: 40, height: 40, borderRadius: "50%", overflow: "hidden", background: "#e2e8f0", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, color: "#64748b", border: "none", padding: 0, cursor: partner?.avatar_url ? "pointer" : "default" }}
        >
          {partner?.avatar_url
            ? <img src={partner.avatar_url} alt={partnerName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            : (partnerName[0]?.toUpperCase() ?? "U")}
        </button>
        <Link to="/vendeur/$id" params={{ id: validTo }} style={{ flex: 1, textDecoration: "none", color: "inherit" }}>
          <strong>{partnerName}</strong>
        </Link>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setHeaderMenuOpen((v) => !v); setOpenMenuId(null); setShowPerso(false); }}
          aria-label="Options"
          style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b", padding: 6 }}
        >
          <MoreVertical size={20} />
        </button>
        {headerMenuOpen && (
          <div onClick={stop} style={{ position: "absolute", top: 48, right: 0, background: "white", border: "1px solid #e5e7eb", borderRadius: 8, boxShadow: "0 6px 18px rgba(0,0,0,0.12)", zIndex: 20, minWidth: 220 }}>
            <button onClick={() => { setHeaderMenuOpen(false); setShowPerso(true); }} style={menuItem}>
              🎨 Personnalisation
            </button>
            <button onClick={() => { setHeaderMenuOpen(false); archiveConversation(); }} style={menuItem}>
              <Archive size={15} /> Archiver la conversation
            </button>
            <button onClick={() => { setHeaderMenuOpen(false); deleteConversation(); }} style={{ ...menuItem, color: "#dc2626" }}>
              <Trash2 size={15} /> Supprimer la conversation
            </button>
          </div>
        )}
        {showPerso && (
          <div onClick={stop} style={{ position: "absolute", top: 48, right: 0, background: "white", border: "1px solid #e5e7eb", borderRadius: 10, boxShadow: "0 6px 18px rgba(0,0,0,0.15)", zIndex: 25, padding: 12, minWidth: 220 }}>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>Thème de la conversation</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8 }}>
              {Object.entries(themes).map(([k, v]) => (
                <button key={k} onClick={() => { setTheme(k); setShowPerso(false); }} aria-label={k}
                  style={{ width: 32, height: 32, borderRadius: "50%", border: theme === k ? "3px solid #0f172a" : "1px solid #cbd5e1", background: v.mine, cursor: "pointer" }} />
              ))}
            </div>
          </div>
        )}
      </div>

      <div ref={scrollRef} style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 16, paddingBottom: 88, minHeight: 400, height: "calc(100vh - 260px)", overflowY: "auto", marginTop: 12, background: T.bg }}>
        {(messages ?? []).map((m: any) => {
          const mine = m.sender_id === user.id;
          const read = !!m.read_at;
          const createdMs = new Date(m.created_at).getTime();
          const canEdit = mine && !m._optimistic && (now - createdMs) < EDIT_WINDOW_MS && !!m.content;
          const isEditing = editingId === m.id;
          return (
            <div key={m.id} style={{ display: "flex", flexDirection: "column", alignItems: mine ? "flex-end" : "flex-start", marginBottom: 10 }} onClick={stop}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 6, maxWidth: "85%" }}>
                {!isEditing && !m._optimistic && (
                  <div style={{ position: "relative", order: mine ? 0 : 3 }}>
                    <button onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === m.id ? null : m.id); setHeaderMenuOpen(false); }} aria-label="Options" style={{ background: "none", border: "none", cursor: "pointer", color: darkTheme ? "#cbd5e1" : "#64748b", padding: 4 }}>
                      <MoreVertical size={16} />
                    </button>
                    {openMenuId === m.id && (
                      <div onClick={stop} style={{ position: "absolute", top: 24, [mine ? "right" : "left"]: 0, background: "white", border: "1px solid #e5e7eb", borderRadius: 8, boxShadow: "0 6px 18px rgba(0,0,0,0.12)", zIndex: 10, minWidth: 170 }}>
                        {m.content && (
                          <button onClick={() => copyMsg(m)} style={menuItem}><Copy size={14} /> Copier</button>
                        )}
                        {canEdit && (
                          <button onClick={() => { startEdit(m); setOpenMenuId(null); }} style={menuItem}><Pencil size={14} /> Modifier</button>
                        )}
                        {mine && (
                          <button onClick={() => { setOpenMenuId(null); deleteMsg(m.id); }} style={{ ...menuItem, color: "#dc2626" }}><Trash2 size={14} /> Supprimer</button>
                        )}
                      </div>
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
                    background: mine ? T.mine : T.other, color: mine || darkTheme ? "white" : "#333",
                    border: mine ? "none" : (darkTheme ? "1px solid #4b5563" : "1px solid #e5e7eb"), wordBreak: "break-word",
                    opacity: m._optimistic ? 0.7 : 1,
                  }}>
                    {m.content && <div>{m.content}</div>}
                    {m.attachment_url && <Attachment url={m.attachment_url} type={m.attachment_type} name={m.attachment_name} onImageClick={setLightbox} />}
                    <div style={{ marginTop: 4, fontSize: "0.7em", opacity: 0.85, textAlign: mine ? "right" : "left", color: mine || darkTheme ? "rgba(255,255,255,0.85)" : "#64748b" }}>
                      {new Date(m.created_at).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                      {m.edited_at && <span style={{ marginLeft: 6, fontStyle: "italic" }}>(modifié)</span>}
                      {mine && !m._optimistic && (
                        <span style={{ marginLeft: 6, color: read ? "#bbf7d0" : "inherit", fontWeight: 700 }}>
                          {read ? "✓✓" : "✓"}
                        </span>
                      )}
                    </div>
                  </span>
                )}
              </div>
            </div>
          );
        })}
        {messages && messages.length === 0 && <p style={{ textAlign: "center", color: "#94a3b8" }}>Aucun message. Dis bonjour 👋</p>}
      </div>

      {showEmoji && (
        <div onClick={stop} style={{ position: "fixed", left: 0, right: 0, bottom: 124, zIndex: 30, padding: "0 8px" }}>
          <EmojiPicker onPick={(e) => setText((t) => t + e)} onClose={() => setShowEmoji(false)} />
        </div>
      )}

      <form onSubmit={send} onClick={stop} style={{ display: "flex", gap: 8, alignItems: "flex-end", position: "fixed", left: 0, right: 0, bottom: 60, background: "white", padding: "8px 8px", borderTop: "1px solid #e5e7eb", zIndex: 40 }}>
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
        {recording ? (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 20, color: "#b91c1c", fontWeight: 600 }}>
              <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#dc2626", animation: "pulse 1s infinite" }} />
              {String(Math.floor(recordSeconds / 60)).padStart(2, "0")}:{String(recordSeconds % 60).padStart(2, "0")}
            </div>
            <button type="button" onClick={() => stopRecording(true)} aria-label="Annuler"
              style={{ background: "#f0f2f5", border: "1px solid #e2e8f0", borderRadius: 20, padding: 10, cursor: "pointer", color: "#64748b" }}>
              <X size={20} />
            </button>
            <button type="button" onClick={() => stopRecording(false)} aria-label="Envoyer l'audio"
              style={{ background: "#16a34a", border: "none", borderRadius: 20, padding: 10, cursor: "pointer", color: "#fff" }}>
              <Check size={20} />
            </button>
          </>
        ) : text.trim() ? (
          <button type="submit"
            style={{
              padding: "10px 18px", borderRadius: 20, border: "none",
              background: "#2563eb", color: "#fff",
              fontWeight: 600, fontSize: 14, cursor: "pointer",
            }}>
            Envoyer
          </button>
        ) : (
          <button type="button" onClick={startRecording} aria-label="Message vocal" disabled={uploading}
            style={{ background: "#e67e22", border: "none", borderRadius: 20, padding: 10, cursor: "pointer", color: "#fff" }}>
            <Mic size={20} />
          </button>
        )}
      </form>

      {lightbox && (
        <div
          onClick={() => setLightbox(null)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.9)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, cursor: "zoom-out" }}
        >
          <img src={lightbox} alt="" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setLightbox(null); }}
            aria-label="Fermer"
            style={{ position: "absolute", top: 16, right: 16, background: "rgba(255,255,255,0.15)", color: "#fff", border: "none", borderRadius: "50%", width: 40, height: 40, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            <X size={24} />
          </button>
        </div>
      )}
    </SiteLayout>
  );
}


const menuItem: React.CSSProperties = {
  display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "10px 14px",
  background: "none", border: "none", textAlign: "left", cursor: "pointer", fontSize: 14, color: "#0f172a",
};
