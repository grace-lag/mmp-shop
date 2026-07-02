import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { ThumbsUp, Heart, MessageCircle, Phone, Upload, X, Download, Play, Plus, Check } from "lucide-react";
import { SiteLayout } from "@/components/SiteLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth/AuthProvider";
import { toast } from "sonner";

export const Route = createFileRoute("/shorts")({
  head: () => ({ meta: [{ title: "Shorts — MaMarketplace E-Shop" }] }),
  component: ShortsPage,
});

type Short = {
  id: string;
  user_id: string;
  title: string | null;
  description: string | null;
  price: number | null;
  video_url: string;
  thumbnail_url: string | null;
  created_at: string;
  likes_count: number;
};

function ShortsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [commentsFor, setCommentsFor] = useState<string | null>(null);

  const { data: shorts, refetch } = useQuery({
    queryKey: ["shorts-feed"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("shorts")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return (data ?? []) as Short[];
    },
  });

  const onPick = (f: File) => {
    if (!user) { navigate({ to: "/login" }); return; }
    if (f.size > 50 * 1024 * 1024) { toast.error("Vidéo trop volumineuse (max 50 Mo)"); return; }
    if (!f.type.startsWith("video/")) { toast.error("Format vidéo invalide"); return; }
    setPendingFile(f);
    setTitle(""); setDescription(""); setPrice("");
  };

  const publish = async () => {
    if (!pendingFile || !user) return;
    setUploading(true);
    try {
      const ext = pendingFile.name.split(".").pop() || "mp4";
      const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("shorts-videos").upload(path, pendingFile, { contentType: pendingFile.type });
      if (upErr) throw upErr;
      const { data: signed } = await supabase.storage.from("shorts-videos").createSignedUrl(path, 60 * 60 * 24 * 365);
      const video_url = signed?.signedUrl ?? "";
      const { error: insErr } = await (supabase as any).from("shorts").insert({
        user_id: user.id,
        video_url,
        title: title.trim() || null,
        description: description.trim() || null,
        price: price.trim() ? Number(price) : null,
      });
      if (insErr) throw insErr;
      toast.success("Short publié !");
      setPendingFile(null);
      refetch();
    } catch (e: any) {
      toast.error(e.message ?? "Échec de publication");
    } finally {
      setUploading(false);
    }
  };

  return (
    <SiteLayout activeNav="shorts" hideHeader hideFooter>
      <div style={{ display: "flex", flexDirection: "column", gap: 0, marginTop: 0, background: "#000", minHeight: "100vh" }}>
        {(shorts ?? []).map((s) => (
          <ShortCard key={s.id} short={s} onOpenComments={() => setCommentsFor(s.id)} />
        ))}
        {shorts && shorts.length === 0 && (
          <p style={{ color: "#fff", textAlign: "center", marginTop: 30, background: "#000", padding: 40 }}>Aucun Short. Soyez le premier !</p>
        )}
      </div>

      <button
        onClick={() => user ? fileRef.current?.click() : navigate({ to: "/login" })}
        disabled={uploading}
        aria-label="Publier"
        style={{ position: "fixed", right: 16, bottom: 80, zIndex: 100, background: "#ea580c", color: "#fff", border: 0, borderRadius: 999, padding: "12px 18px", display: "inline-flex", alignItems: "center", gap: 8, cursor: "pointer", fontWeight: 700, boxShadow: "0 6px 18px rgba(0,0,0,0.3)" }}
      >
        <Upload size={18} /> {uploading ? "Envoi..." : "Publier"}
      </button>
      <input ref={fileRef} type="file" accept="video/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) onPick(f); e.target.value = ""; }} />

      {pendingFile && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ background: "white", borderRadius: 14, padding: 18, width: "100%", maxWidth: 420, position: "relative" }}>
            <button onClick={() => setPendingFile(null)} aria-label="Fermer" style={{ position: "absolute", top: 8, right: 8, background: "none", border: "none", cursor: "pointer" }}><X size={20} /></button>
            <h2 style={{ marginTop: 0 }}>Détails du Short</h2>
            <video src={URL.createObjectURL(pendingFile)} controls style={{ width: "100%", borderRadius: 8, maxHeight: 220, background: "#000" }} />
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Titre (optionnel)"
              style={{ width: "100%", padding: 10, marginTop: 10, border: "1px solid #cbd5e1", borderRadius: 8 }} />
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description (optionnel)" rows={3}
              style={{ width: "100%", padding: 10, marginTop: 8, border: "1px solid #cbd5e1", borderRadius: 8, fontFamily: "inherit" }} />
            <input value={price} onChange={(e) => setPrice(e.target.value.replace(/[^0-9.]/g, ""))} placeholder="Prix en FCFA (optionnel)" inputMode="numeric"
              style={{ width: "100%", padding: 10, marginTop: 8, border: "1px solid #cbd5e1", borderRadius: 8 }} />
            <div style={{ display: "flex", gap: 8, marginTop: 12, justifyContent: "flex-end" }}>
              <button onClick={() => setPendingFile(null)} style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid #cbd5e1", background: "white", cursor: "pointer" }}>Annuler</button>
              <button onClick={publish} disabled={uploading} style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: "#ea580c", color: "white", fontWeight: 700, cursor: "pointer" }}>{uploading ? "Publication..." : "Publier"}</button>
            </div>
          </div>
        </div>
      )}

      {commentsFor && <ShortComments shortId={commentsFor} onClose={() => setCommentsFor(null)} />}
    </SiteLayout>
  );
}

function ShortCard({ short, onOpenComments }: { short: Short; onOpenComments: () => void }) {
  const ref = useRef<HTMLVideoElement>(null);
  const { user } = useAuth();
  const qc = useQueryClient();
  const [seller, setSeller] = useState<{ prenom?: string | null; nom?: string | null; avatar_url?: string | null } | null>(null);
  const [paused, setPaused] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase.from("profiles").select("prenom,nom,avatar_url").eq("id", short.user_id).maybeSingle();
      if (!cancelled) setSeller(data as any);
    })();
    return () => { cancelled = true; };
  }, [short.user_id]);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { v.play().catch(() => {}); setPaused(false); }
      else v.pause();
    }, { threshold: 0.6 });
    io.observe(v);
    const onTime = () => { if (v.duration) setProgress((v.currentTime / v.duration) * 100); };
    v.addEventListener("timeupdate", onTime);
    return () => { io.disconnect(); v.removeEventListener("timeupdate", onTime); };
  }, []);

  // Like state
  const { data: likeState } = useQuery({
    queryKey: ["short-like", short.id, user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await (supabase as any).from("shorts_likes").select("id").eq("short_id", short.id).eq("user_id", user!.id).maybeSingle();
      return !!data;
    },
  });
  const { data: likeCount } = useQuery({
    queryKey: ["short-like-count", short.id],
    queryFn: async () => {
      const { count } = await (supabase as any).from("shorts_likes").select("id", { count: "exact", head: true }).eq("short_id", short.id);
      return count ?? 0;
    },
  });
  const toggleLike = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("connexion requise");
      if (likeState) {
        await (supabase as any).from("shorts_likes").delete().eq("short_id", short.id).eq("user_id", user.id);
      } else {
        await (supabase as any).from("shorts_likes").insert({ short_id: short.id, user_id: user.id });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["short-like", short.id, user?.id] });
      qc.invalidateQueries({ queryKey: ["short-like-count", short.id] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Favorites
  const { data: favState } = useQuery({
    queryKey: ["short-fav", short.id, user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await (supabase as any).from("shorts_favorites").select("id").eq("short_id", short.id).eq("user_id", user!.id).maybeSingle();
      return !!data;
    },
  });
  const toggleFav = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("connexion requise");
      if (favState) {
        await (supabase as any).from("shorts_favorites").delete().eq("short_id", short.id).eq("user_id", user.id);
      } else {
        await (supabase as any).from("shorts_favorites").insert({ short_id: short.id, user_id: user.id });
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["short-fav", short.id, user?.id] }),
  });

  // Comment count
  const { data: commentCount } = useQuery({
    queryKey: ["short-comment-count", short.id],
    queryFn: async () => {
      const { count } = await (supabase as any).from("shorts_comments").select("id", { count: "exact", head: true }).eq("short_id", short.id);
      return count ?? 0;
    },
  });

  // Follow
  const { data: followState } = useQuery({
    queryKey: ["short-follow", short.user_id, user?.id],
    enabled: !!user && user.id !== short.user_id,
    queryFn: async () => {
      const { data } = await (supabase as any).from("seller_followers").select("id").eq("seller_id", short.user_id).eq("follower_id", user!.id).maybeSingle();
      return !!data;
    },
  });
  const toggleFollow = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("connexion requise");
      if (followState) {
        await (supabase as any).from("seller_followers").delete().eq("seller_id", short.user_id).eq("follower_id", user.id);
      } else {
        await (supabase as any).from("seller_followers").insert({ seller_id: short.user_id, follower_id: user.id });
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["short-follow", short.user_id, user?.id] }),
  });

  const togglePlay = () => {
    const v = ref.current; if (!v) return;
    if (v.paused) { v.play(); setPaused(false); } else { v.pause(); setPaused(true); }
    setShowControls(true);
    window.setTimeout(() => setShowControls(false), 1500);
  };

  const seek = (delta: number) => {
    const v = ref.current; if (!v) return;
    v.currentTime = Math.max(0, Math.min((v.duration || 0), v.currentTime + delta));
  };

  const download = async () => {
    try {
      const r = await fetch(short.video_url);
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `short-${short.id}.mp4`; a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch { toast.error("Téléchargement impossible"); }
  };

  const isMe = user?.id === short.user_id;

  return (
    <div style={{ position: "relative", background: "#000", overflow: "hidden", height: "calc(100vh - 60px)", scrollSnapAlign: "start" }}>
      <video ref={ref} src={short.video_url} loop playsInline muted={false} controls={false} preload="metadata" style={{ width: "100%", height: "100%", objectFit: "cover" }} />

      {/* Tap zones: left = -10s, middle = play/pause, right = +10s */}
      <div style={{ position: "absolute", inset: 0, display: "grid", gridTemplateColumns: "1fr 2fr 1fr" }}>
        <div onDoubleClick={() => seek(-10)} onClick={togglePlay} />
        <div onClick={togglePlay} />
        <div onDoubleClick={() => seek(10)} onClick={togglePlay} />
      </div>

      {/* Play/pause indicator */}
      {(paused || showControls) && (
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
          <div style={{ background: "rgba(0,0,0,0.55)", borderRadius: "50%", width: 72, height: 72, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Play size={36} color="#fff" fill="#fff" />
          </div>
        </div>
      )}

      {/* Progress bar */}
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 60, height: 2, background: "rgba(255,255,255,0.2)" }}>
        <div style={{ width: `${progress}%`, height: "100%", background: "#fff" }} />
      </div>

      {/* Right rail — TikTok style */}
      <div style={{ position: "absolute", right: 8, bottom: 90, display: "flex", flexDirection: "column", alignItems: "center", gap: 18, color: "#fff", zIndex: 5 }}>
        {/* Avatar with + follow */}
        <div style={{ position: "relative" }}>
          <Link to="/u/$id" params={{ id: short.user_id }}>
            {seller?.avatar_url
              ? <img src={seller.avatar_url} alt="" style={{ width: 48, height: 48, borderRadius: "50%", border: "2px solid #fff", objectFit: "cover", display: "block" }} />
              : <div style={{ width: 48, height: 48, borderRadius: "50%", border: "2px solid #fff", background: "#334155", display: "flex", alignItems: "center", justifyContent: "center" }}>👤</div>}
          </Link>
          {!isMe && user && (
            <button
              onClick={() => toggleFollow.mutate()}
              aria-label={followState ? "Se désabonner" : "S'abonner"}
              style={{ position: "absolute", left: "50%", bottom: -8, transform: "translateX(-50%)", width: 22, height: 22, borderRadius: "50%", background: followState ? "#22c55e" : "#ef4444", color: "#fff", border: "2px solid #fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", padding: 0 }}
            >
              {followState ? <Check size={12} /> : <Plus size={14} />}
            </button>
          )}
        </div>

        {/* Like (thumbs up) */}
        <button onClick={() => user ? toggleLike.mutate() : toast.error("Connectez-vous")} style={iconBtn} aria-label="J'aime">
          <ThumbsUp size={30} fill={likeState ? "#fff" : "none"} color={likeState ? "#3b82f6" : "#fff"} />
          <span style={countStyle}>{likeCount ?? short.likes_count ?? 0}</span>
        </button>

        {/* Comments */}
        <button onClick={onOpenComments} style={iconBtn} aria-label="Commentaires">
          <MessageCircle size={30} color="#fff" />
          <span style={countStyle}>{commentCount ?? 0}</span>
        </button>

        {/* Favorites (heart) */}
        <button onClick={() => user ? toggleFav.mutate() : toast.error("Connectez-vous")} style={iconBtn} aria-label="Favoris">
          <Heart size={30} fill={favState ? "#ef4444" : "none"} color={favState ? "#ef4444" : "#fff"} />
          <span style={countStyle}>Favori</span>
        </button>

        {/* Download */}
        <button onClick={download} style={iconBtn} aria-label="Télécharger">
          <Download size={26} color="#fff" />
        </button>
      </div>

      {/* Bottom overlay: title + description (TikTok style) */}
      <div style={{ position: "absolute", left: 12, right: 84, bottom: 70, color: "#fff", textShadow: "0 1px 3px rgba(0,0,0,0.8)", zIndex: 4 }}>
        {short.title && <div style={{ fontWeight: 700, fontSize: "1rem", marginBottom: 4 }}>{short.title}</div>}
        {short.description && <div style={{ fontSize: "0.9rem", opacity: 0.95, lineHeight: 1.35 }}>{short.description}</div>}
        {short.price != null && (
          <div style={{ marginTop: 6, display: "inline-block", background: "#16a34a", color: "#fff", padding: "3px 10px", borderRadius: 999, fontWeight: 700, fontSize: "0.85rem" }}>
            {new Intl.NumberFormat("fr-FR").format(short.price)} FCFA
          </div>
        )}
      </div>

      <Link
        to="/contact/$id"
        params={{ id: short.user_id }}
        style={{ position: "absolute", left: 12, right: 12, bottom: 12, background: "#ea580c", color: "#fff", textAlign: "center", padding: "12px", borderRadius: 10, textDecoration: "none", fontWeight: 700, display: "flex", justifyContent: "center", alignItems: "center", gap: 8, zIndex: 5 }}
      >
        <Phone size={18} /> Contacter le vendeur
      </Link>
    </div>
  );
}

function ShortComments({ shortId, onClose }: { shortId: string; onClose: () => void }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const { data: comments } = useQuery({
    queryKey: ["short-comments", shortId],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("shorts_comments")
        .select("id,user_id,content,created_at")
        .eq("short_id", shortId)
        .order("created_at", { ascending: false });
      return (data ?? []) as Array<{ id: string; user_id: string; content: string; created_at: string }>;
    },
  });

  const add = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Connectez-vous");
      const t = text.trim();
      if (!t) return;
      const { error } = await (supabase as any).from("shorts_comments").insert({ short_id: shortId, user_id: user.id, content: t });
      if (error) throw error;
    },
    onSuccess: () => {
      setText("");
      qc.invalidateQueries({ queryKey: ["short-comments", shortId] });
      qc.invalidateQueries({ queryKey: ["short-comment-count", shortId] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("shorts_comments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["short-comments", shortId] });
      qc.invalidateQueries({ queryKey: ["short-comment-count", shortId] });
    },
  });

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 3000, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}
         onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)" }} />
      <div style={{ position: "relative", background: "#fff", borderRadius: "16px 16px 0 0", maxHeight: "80vh", display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderBottom: "1px solid #e2e8f0" }}>
          <h3 style={{ margin: 0 }}>Commentaires</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer" }}><X size={22} /></button>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: 12, display: "flex", flexDirection: "column", gap: 10 }}>
          {(comments ?? []).length === 0 && <p style={{ color: "#64748b", textAlign: "center" }}>Aucun commentaire.</p>}
          {(comments ?? []).map((c) => (
            <div key={c.id} style={{ background: "#f1f5f9", borderRadius: 12, padding: "8px 12px" }}>
              <div style={{ fontSize: 14, whiteSpace: "pre-wrap" }}>{c.content}</div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4, fontSize: 12, color: "#64748b" }}>
                <span>{new Date(c.created_at).toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                {user?.id === c.user_id && (
                  <button onClick={() => del.mutate(c.id)} style={{ background: "none", border: "none", color: "#dc2626", cursor: "pointer" }}>Supprimer</button>
                )}
              </div>
            </div>
          ))}
        </div>
        <div style={{ padding: 12, borderTop: "1px solid #e2e8f0" }}>
          {user ? (
            <form onSubmit={(e) => { e.preventDefault(); add.mutate(); }} style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <div style={{ width: 36, height: 36, borderRadius: "50%", overflow: "hidden", background: "#e2e8f0", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>
                {user?.user_metadata?.avatar_url
                  ? <img src={user.user_metadata.avatar_url} alt="moi" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  : "👤"}
              </div>
              <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Écris un commentaire..."
                     style={{ flex: 1, padding: 10, borderRadius: 20, border: "1px solid #e2e8f0", background: "#f0f2f5", outline: "none" }} />
              <button type="submit" disabled={!text.trim()} style={{ padding: "10px 16px", borderRadius: 20, border: "none", background: text.trim() ? "#2563eb" : "#cbd5e1", color: "#fff", fontWeight: 600, cursor: "pointer" }}>
                Envoyer
              </button>
            </form>
          ) : (
            <p style={{ color: "#64748b", textAlign: "center", margin: 0 }}><Link to="/login" onClick={onClose}>Connectez-vous</Link> pour commenter.</p>
          )}
        </div>
      </div>
    </div>
  );
}

const iconBtn: React.CSSProperties = { background: "none", color: "#fff", border: 0, width: 52, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, cursor: "pointer", padding: 0 };
const countStyle: React.CSSProperties = { fontSize: 12, fontWeight: 700, textShadow: "0 1px 2px rgba(0,0,0,0.7)" };
