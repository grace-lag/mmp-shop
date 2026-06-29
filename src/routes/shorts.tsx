import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { Heart, MessageCircle, Phone, Upload, X } from "lucide-react";
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
  video_url: string;
  thumbnail_url: string | null;
  created_at: string;
};

function ShortsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

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
    if (f.size > 10 * 1024 * 1024) { toast.error("Vidéo trop volumineuse (max 10 Mo)"); return; }
    if (!f.type.startsWith("video/")) { toast.error("Format vidéo invalide"); return; }
    setPendingFile(f);
    setTitle(""); setDescription("");
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
      const { error: insErr } = await (supabase as any).from("shorts").insert({ user_id: user.id, video_url, title: title || null, description: description || null });
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
      <div style={{ display: "flex", flexDirection: "column", gap: 0, marginTop: 0 }}>
        {(shorts ?? []).map((s) => <ShortCard key={s.id} short={s} />)}
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
            <div style={{ display: "flex", gap: 8, marginTop: 12, justifyContent: "flex-end" }}>
              <button onClick={() => setPendingFile(null)} style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid #cbd5e1", background: "white", cursor: "pointer" }}>Annuler</button>
              <button onClick={publish} disabled={uploading} style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: "#ea580c", color: "white", fontWeight: 700, cursor: "pointer" }}>{uploading ? "Publication..." : "Publier"}</button>
            </div>
          </div>
        </div>
      )}
    </SiteLayout>
  );
}

function ShortCard({ short }: { short: Short }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [seller, setSeller] = useState<{ prenom?: string | null; nom?: string | null; avatar_url?: string | null } | null>(null);

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
      if (entry.isIntersecting) v.play().catch(() => {}); else v.pause();
    }, { threshold: 0.6 });
    io.observe(v);
    return () => io.disconnect();
  }, []);

  const name = [seller?.prenom, seller?.nom].filter(Boolean).join(" ") || "Vendeur";
  return (
    <div style={{ position: "relative", background: "#000", overflow: "hidden", height: "calc(100vh - 60px)", scrollSnapAlign: "start" }}>
      <video ref={ref} src={short.video_url} loop playsInline muted controls={false} preload="metadata" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      <div style={{ position: "absolute", right: 10, bottom: 130, display: "flex", flexDirection: "column", gap: 16, color: "#fff" }}>
        <button style={iconBtn}><Heart size={26} fill="#fff" /></button>
        <button style={iconBtn}><MessageCircle size={26} /></button>
      </div>
      <div style={{ position: "absolute", left: 12, right: 80, bottom: 110, color: "#fff", textShadow: "0 1px 3px rgba(0,0,0,0.7)" }}>
        {short.description && <div style={{ fontSize: "0.9rem", opacity: 0.95, marginBottom: 8 }}>{short.description}</div>}
        {short.title && <div style={{ fontWeight: 700, marginBottom: 6 }}>{short.title}</div>}
        <Link to="/u/$id" params={{ id: short.user_id }} style={{ color: "#fff", textDecoration: "none", display: "flex", alignItems: "center", gap: 8 }}>
          {seller?.avatar_url ? <img src={seller.avatar_url} alt="" style={{ width: 32, height: 32, borderRadius: "50%", border: "2px solid #fff", objectFit: "cover" }} /> : <span>👤</span>}
          <strong>{name}</strong>
        </Link>
      </div>
      <Link
        to="/contact/$id"
        params={{ id: short.user_id }}
        style={{ position: "absolute", left: 12, right: 12, bottom: 16, background: "#ea580c", color: "#fff", textAlign: "center", padding: "12px", borderRadius: 10, textDecoration: "none", fontWeight: 700, display: "flex", justifyContent: "center", alignItems: "center", gap: 8 }}
      >
        <Phone size={18} /> Contacter le vendeur
      </Link>
    </div>
  );
}

const iconBtn: React.CSSProperties = { background: "rgba(0,0,0,0.3)", color: "#fff", border: 0, width: 46, height: 46, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" };
