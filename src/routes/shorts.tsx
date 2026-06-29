import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { Heart, MessageCircle, Phone, Upload } from "lucide-react";
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

  const handleUpload = async (file: File) => {
    if (!user) { navigate({ to: "/login" }); return; }
    if (file.size > 10 * 1024 * 1024) { toast.error("Vidéo trop volumineuse (max 10 Mo)"); return; }
    if (!file.type.startsWith("video/")) { toast.error("Format vidéo invalide"); return; }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "mp4";
      const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("shorts-videos").upload(path, file, { contentType: file.type });
      if (upErr) throw upErr;
      const { data: signed } = await supabase.storage.from("shorts-videos").createSignedUrl(path, 60 * 60 * 24 * 365);
      const video_url = signed?.signedUrl ?? "";
      const { error: insErr } = await (supabase as any).from("shorts").insert({ user_id: user.id, video_url });
      if (insErr) throw insErr;
      toast.success("Short publié !");
      refetch();
    } catch (e: any) {
      toast.error(e.message ?? "Échec de publication");
    } finally {
      setUploading(false);
    }
  };

  return (
    <SiteLayout activeNav="shorts">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12 }}>
        <h1 style={{ margin: 0 }}>🎬 Shorts</h1>
        <button
          onClick={() => user ? fileRef.current?.click() : navigate({ to: "/login" })}
          disabled={uploading}
          style={{ background: "#ea580c", color: "#fff", border: 0, borderRadius: 999, padding: "8px 14px", display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer", fontWeight: 600 }}
        >
          <Upload size={16} /> {uploading ? "Envoi..." : "Publier"}
        </button>
        <input ref={fileRef} type="file" accept="video/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f); }} />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 18, marginTop: 14 }}>
        {(shorts ?? []).map((s) => <ShortCard key={s.id} short={s} />)}
        {shorts && shorts.length === 0 && (
          <p style={{ color: "#64748b", textAlign: "center", marginTop: 30 }}>Aucun Short pour le moment. Soyez le premier !</p>
        )}
      </div>
    </SiteLayout>
  );
}

function ShortCard({ short }: { short: Short }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [seller, setSeller] = useState<{ prenom?: string | null; nom?: string | null; tel?: string | null; avatar_url?: string | null } | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase.from("profiles").select("prenom,nom,tel,avatar_url").eq("id", short.user_id).maybeSingle();
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
    <div style={{ position: "relative", background: "#000", borderRadius: 14, overflow: "hidden", aspectRatio: "9/16", maxHeight: "75vh" }}>
      <video ref={ref} src={short.video_url} loop playsInline muted controls={false} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      <div style={{ position: "absolute", right: 10, bottom: 80, display: "flex", flexDirection: "column", gap: 16, color: "#fff" }}>
        <button style={iconBtn}><Heart size={26} fill="#fff" /></button>
        <button style={iconBtn}><MessageCircle size={26} /></button>
      </div>
      <div style={{ position: "absolute", left: 12, right: 90, bottom: 60, color: "#fff", textShadow: "0 1px 3px rgba(0,0,0,0.7)" }}>
        <Link to="/u/$id" params={{ id: short.user_id }} style={{ color: "#fff", textDecoration: "none", display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
          {seller?.avatar_url ? <img src={seller.avatar_url} alt="" style={{ width: 32, height: 32, borderRadius: "50%", border: "2px solid #fff", objectFit: "cover" }} /> : <span>👤</span>}
          <strong>{name}</strong>
        </Link>
        {short.title && <div style={{ fontWeight: 600 }}>{short.title}</div>}
        {short.description && <div style={{ fontSize: "0.88rem", opacity: 0.9 }}>{short.description}</div>}
      </div>
      <a
        href={seller?.tel ? `tel:${seller.tel}` : "#"}
        style={{ position: "absolute", left: 12, right: 12, bottom: 12, background: "#ea580c", color: "#fff", textAlign: "center", padding: "12px", borderRadius: 10, textDecoration: "none", fontWeight: 700, display: "flex", justifyContent: "center", alignItems: "center", gap: 8 }}
      >
        <Phone size={18} /> Contacter le vendeur
      </a>
    </div>
  );
}

const iconBtn: React.CSSProperties = { background: "rgba(0,0,0,0.3)", color: "#fff", border: 0, width: 46, height: 46, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" };
