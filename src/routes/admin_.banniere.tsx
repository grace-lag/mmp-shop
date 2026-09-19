import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Upload, Trash2, Eye, EyeOff, Save } from "lucide-react";
import { toast } from "sonner";
import { SiteLayout } from "@/components/SiteLayout";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { listBanners, uploadBanner, updateBanner, deleteBanner, type BannerSlide } from "@/lib/banners";
import { frAuthError } from "@/lib/auth-errors";

export const Route = createFileRoute("/admin_/banniere")({
  head: () => ({
    meta: [
      { title: "Bannière publicitaire — Administration MMP Shop" },
      { name: "description", content: "Gérez les images et vidéos de la barre publicitaire de la page d'accueil de MMP Shop." },
    ],
  }),
  component: AdminBannierePage,
});

function AdminBannierePage() {
  const { user, loading } = useAuth();
  const isAdmin = useIsAdmin();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [caption, setCaption] = useState("");

  useEffect(() => { if (!loading && !user) navigate({ to: "/login" }); }, [user, loading, navigate]);

  const { data: banners } = useQuery({
    queryKey: ["site-banners", "admin"],
    enabled: !!user && isAdmin,
    queryFn: () => listBanners({ all: true }),
  });

  if (!user) return null;
  if (!isAdmin) {
    return (
      <SiteLayout>
        <h1>Accès refusé</h1>
        <p>Cette page est réservée aux administrateurs.</p>
      </SiteLayout>
    );
  }

  const refresh = () => qc.invalidateQueries({ queryKey: ["site-banners"] });

  const onFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setBusy(true);
    let start = (banners?.length ?? 0) + 1;
    let ok = 0;
    for (const f of Array.from(files)) {
      try {
        await uploadBanner(f, caption, start++);
        ok++;
      } catch (e: any) {
        toast.error(frAuthError(e) || e?.message || "Échec de l'envoi");
      }
    }
    setBusy(false);
    setCaption("");
    if (fileRef.current) fileRef.current.value = "";
    if (ok > 0) {
      toast.success(ok > 1 ? `${ok} médias ajoutés` : "Média ajouté");
      refresh();
    }
  };

  return (
    <SiteLayout>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 16 }}>
        <Link to="/admin" style={{ color: "#0f172a", display: "inline-flex" }}><ArrowLeft size={22} /></Link>
        <h1 style={{ margin: 0, fontSize: "1.5rem" }}>Barre publicitaire</h1>
      </div>
      <p style={{ color: "#64748b", marginTop: 6 }}>
        Images (max 5 Mo) et vidéos courtes (max 60 s, 10 Mo). Le son des vidéos est automatiquement coupé.
      </p>

      <section style={{ background: "#fff", border: "1px solid #fed7aa", borderRadius: 12, padding: 14, display: "grid", gap: 10 }}>
        <strong>Ajouter des médias</strong>
        <input
          className="search-input"
          placeholder="Légende (optionnelle) appliquée aux médias envoyés"
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
        />
        <input
          ref={fileRef}
          type="file"
          accept="image/*,video/mp4,video/webm,video/quicktime"
          multiple
          onChange={(e) => onFiles(e.target.files)}
          disabled={busy}
        />
        <div style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "#ea580c", fontWeight: 600 }}>
          <Upload size={16} /> {busy ? "Envoi en cours..." : "Vous pouvez sélectionner plusieurs fichiers à la fois"}
        </div>
      </section>

      <h2 style={{ marginTop: 22 }}>Médias ({banners?.length ?? 0})</h2>
      <div style={{ display: "grid", gap: 12, marginBottom: 28 }}>
        {(banners ?? []).map((b) => (
          <BannerRow key={b.id} banner={b} onChanged={refresh} />
        ))}
        {banners && banners.length === 0 && (
          <p style={{ color: "#64748b" }}>Aucun média. Les visuels par défaut du site sont affichés sur la page d'accueil.</p>
        )}
      </div>
    </SiteLayout>
  );
}

function BannerRow({ banner, onChanged }: { banner: BannerSlide; onChanged: () => void }) {
  const [caption, setCaption] = useState(banner.caption ?? "");
  const [order, setOrder] = useState(banner.sort_order ?? 0);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await updateBanner(banner.id, { caption, sort_order: Number(order) || 0 });
      toast.success("Média mis à jour");
      onChanged();
    } catch (e: any) {
      toast.error(frAuthError(e) || "Échec de la mise à jour");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ background: "#fff", border: "1px solid #fed7aa", borderRadius: 12, padding: 12, display: "grid", gap: 8 }}>
      <div style={{ borderRadius: 10, overflow: "hidden", aspectRatio: "5/2", background: "#0f172a" }}>
        {banner.media_type === "video" ? (
          <video src={banner.url} muted playsInline loop autoPlay style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <img src={banner.url} alt={banner.caption} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        )}
      </div>
      <input className="search-input" value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Légende" />
      <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ color: "#475569", fontSize: "0.85rem" }}>Ordre</span>
        <input
          className="search-input"
          type="number"
          value={order}
          onChange={(e) => setOrder(Number(e.target.value))}
          style={{ width: 90 }}
        />
        <span style={{ marginLeft: "auto", color: banner.is_active ? "#16a34a" : "#dc2626", fontWeight: 600 }}>
          {banner.is_active ? "Affiché" : "Masqué"}
        </span>
      </label>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button onClick={save} disabled={saving} style={{ flex: 1, background: "#2563eb", color: "#fff", border: 0, borderRadius: 8, padding: "9px 10px", fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
          <Save size={15} /> {saving ? "..." : "Enregistrer"}
        </button>
        <button
          onClick={async () => {
            try {
              await updateBanner(banner.id, { is_active: !banner.is_active });
              onChanged();
            } catch (e: any) {
              toast.error(frAuthError(e) || "Échec");
            }
          }}
          style={{ background: "#0f172a", color: "#fff", border: 0, borderRadius: 8, padding: "9px 12px", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 }}
        >
          {banner.is_active ? <EyeOff size={15} /> : <Eye size={15} />} {banner.is_active ? "Masquer" : "Afficher"}
        </button>
        <button
          onClick={async () => {
            if (!confirm("Supprimer définitivement ce média ?")) return;
            try {
              await deleteBanner(banner);
              toast.success("Média supprimé");
              onChanged();
            } catch (e: any) {
              toast.error(frAuthError(e) || "Échec de suppression");
            }
          }}
          style={{ background: "#dc2626", color: "#fff", border: 0, borderRadius: 8, padding: "9px 12px", cursor: "pointer", display: "inline-flex", alignItems: "center" }}
        >
          <Trash2 size={15} />
        </button>
      </div>
    </div>
  );
}
