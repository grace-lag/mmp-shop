import { frAuthError } from "@/lib/auth-errors";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useRef, useEffect } from "react";
import { Phone, Plus, X } from "lucide-react";
import { SiteLayout } from "@/components/SiteLayout";
import { PhoneInput } from "@/components/PhoneInput";
import { useAuth } from "@/lib/auth/AuthProvider";
import { createAnnonce, listAnnonces, uploadAnnonceImage } from "@/lib/annonces";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/offres-emploi")({
  head: () => ({ meta: [{ title: "Offres d'emploi — MaMarketplace E-Shop" }] }),
  component: JobsPage,
});

function JobsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [phone, setPhone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [sellerName, setSellerName] = useState("");

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("nom,prenom")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setSellerName(`${data.prenom || ""} ${data.nom || ""}`.trim() || (user.email ?? ""));
      });
  }, [user]);

  const { data: jobs, refetch } = useQuery({
    queryKey: ["jobs"],
    queryFn: () => listAnnonces({ category: "Emplois", limit: 60, includeJobs: true, includeExpired: true }),
  });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      navigate({ to: "/login" });
      return;
    }
    if (!title || !description) return toast.error("Titre et description requis");
    if (!phone) return toast.error("Numéro d'appel requis");
    if (!file) return toast.error("Ajoute une affiche/image");
    setSubmitting(true);
    try {
      const url = await uploadAnnonceImage(file, user.id);
      await createAnnonce({
        title,
        description,
        price: 0,
        city: "Brazzaville",
        category: "Emplois",
        subcategory: "",
        phone,
        whatsapp,
        seller_name: sellerName,
        image_url: url,
        images: [url],
      });
      toast.success("Offre publiée !");
      setShowForm(false);
      setTitle("");
      setDescription("");
      setPhone("");
      setWhatsapp("");
      setFile(null);
      refetch();
    } catch (err: any) {
      toast.error(frAuthError(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SiteLayout hideFooter>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12 }}>
        <h1 style={{ margin: 0 }}>💼 Offres d'emploi</h1>
        <button
          onClick={() => (user ? setShowForm(true) : navigate({ to: "/login" }))}
          style={{
            background: "#ea580c",
            color: "#fff",
            border: 0,
            borderRadius: 999,
            padding: "8px 14px",
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            cursor: "pointer",
            fontWeight: 600,
          }}
        >
          <Plus size={16} /> Publier une offre
        </button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 18, marginTop: 14 }}>
        {(jobs ?? []).map((a: any) => (
          <div
            key={a.id}
            style={{
              position: "relative",
              background: "#000",
              borderRadius: 14,
              overflow: "hidden",
              aspectRatio: "3/4",
            }}
          >
            {a.image_url ? (
              <img
                src={a.image_url}
                alt={a.title}
                onClick={() => setLightbox(a.image_url!)}
                style={{ width: "100%", height: "100%", objectFit: "cover", cursor: "zoom-in" }}
              />
            ) : (
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  background: "#1e293b",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 64,
                  color: "#94a3b8",
                }}
              >
                💼
              </div>
            )}
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: "linear-gradient(180deg, rgba(0,0,0,0.1) 30%, rgba(0,0,0,0.85) 100%)",
              }}
            />
            <div
              style={{
                position: "absolute",
                left: 14,
                right: 14,
                bottom: 14,
                color: "#fff",
                textShadow: "0 1px 3px rgba(0,0,0,0.7)",
              }}
            >
              <h2 style={{ margin: 0, fontSize: "1.3rem" }}>{a.title}</h2>
              <p style={{ margin: "6px 0 10px", fontSize: "0.95rem", opacity: 0.95 }}>{a.description}</p>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {a.phone && (
                  <a
                    href={`tel:${a.phone}`}
                    style={{
                      background: "#16a34a",
                      color: "#fff",
                      padding: "8px 12px",
                      borderRadius: 8,
                      textDecoration: "none",
                      fontWeight: 700,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <Phone size={14} /> {a.phone}
                  </a>
                )}
                {a.whatsapp && (
                  <a
                    href={`https://wa.me/${a.whatsapp.replace(/\D/g, "")}`}
                    style={{
                      background: "#25D366",
                      color: "#fff",
                      padding: "8px 12px",
                      borderRadius: 8,
                      textDecoration: "none",
                      fontWeight: 700,
                    }}
                  >
                    💬 {a.whatsapp}
                  </a>
                )}
                <Link
                  to="/annonce/$id"
                  params={{ id: a.id }}
                  style={{
                    background: "rgba(255,255,255,0.2)",
                    color: "#fff",
                    padding: "8px 12px",
                    borderRadius: 8,
                    textDecoration: "none",
                    fontWeight: 700,
                  }}
                >
                  Voir
                </Link>
              </div>
            </div>
          </div>
        ))}
        {jobs && jobs.length === 0 && <p style={{ color: "#64748b" }}>Aucune offre pour le moment.</p>}
      </div>

      {showForm && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.7)",
            zIndex: 200,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
        >
          <form
            onSubmit={submit}
            style={{
              background: "white",
              borderRadius: 14,
              padding: 18,
              width: "100%",
              maxWidth: 460,
              position: "relative",
              maxHeight: "90vh",
              overflowY: "auto",
            }}
          >
            <button
              type="button"
              onClick={() => setShowForm(false)}
              aria-label="Fermer"
              style={{ position: "absolute", top: 8, right: 8, background: "none", border: "none", cursor: "pointer" }}
            >
              <X size={20} />
            </button>
            <h2 style={{ marginTop: 0 }}>Publier une offre d'emploi</h2>
            <div style={{ display: "grid", gap: 10 }}>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Titre de l'offre"
                required
                style={inputStyle}
              />
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Description"
                rows={5}
                required
                style={{ ...inputStyle, fontFamily: "inherit" }}
              />
              <label style={{ fontSize: "0.85rem", fontWeight: 600 }}>Numéro à appeler</label>
              <PhoneInput value={phone} onChange={setPhone} placeholder="Téléphone" />
              <label style={{ fontSize: "0.85rem", fontWeight: 600 }}>Numéro WhatsApp (optionnel)</label>
              <PhoneInput value={whatsapp} onChange={setWhatsapp} placeholder="WhatsApp" />
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                style={{ ...inputStyle, cursor: "pointer", textAlign: "left", background: "#f8fafc" }}
              >
                📷 {file ? file.name : "Ajouter une affiche / photo"}
              </button>
              {file && (
                <img
                  src={URL.createObjectURL(file)}
                  alt=""
                  style={{ width: "100%", maxHeight: 200, objectFit: "cover", borderRadius: 8 }}
                />
              )}
              <button
                type="submit"
                disabled={submitting}
                style={{
                  background: "#ea580c",
                  color: "white",
                  border: "none",
                  padding: "12px",
                  borderRadius: 8,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                {submitting ? "Publication..." : "Publier l'offre"}
              </button>
            </div>
          </form>
        </div>
      )}

      {lightbox && <ZoomableLightbox src={lightbox} onClose={() => setLightbox(null)} />}
    </SiteLayout>
  );
}

function ZoomableLightbox({ src, onClose }: { src: string; onClose: () => void }) {
  const [scale, setScale] = useState(1);
  const [tx, setTx] = useState(0);
  const [ty, setTy] = useState(0);
  const dragging = useRef<{ x: number; y: number } | null>(null);
  const pinch = useRef<{ dist: number; scale: number } | null>(null);
  const lastTap = useRef(0);

  const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
  const applyScale = (next: number) => {
    const s = clamp(next, 1, 5);
    setScale(s);
    if (s === 1) {
      setTx(0);
      setTy(0);
    }
  };

  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    applyScale(scale + (e.deltaY < 0 ? 0.2 : -0.2));
  };
  const onPointerDown = (e: React.PointerEvent) => {
    (e.target as Element).setPointerCapture?.(e.pointerId);
    dragging.current = { x: e.clientX - tx, y: e.clientY - ty };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging.current || scale === 1) return;
    setTx(e.clientX - dragging.current.x);
    setTy(e.clientY - dragging.current.y);
  };
  const onPointerUp = () => {
    dragging.current = null;
  };
  const onTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      pinch.current = { dist: Math.hypot(dx, dy), scale };
    } else if (e.touches.length === 1) {
      const now = Date.now();
      if (now - lastTap.current < 300) applyScale(scale > 1 ? 1 : 2);
      lastTap.current = now;
    }
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && pinch.current) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const d = Math.hypot(dx, dy);
      applyScale(pinch.current.scale * (d / pinch.current.dist));
    }
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (e.touches.length < 2) pinch.current = null;
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onWheel={onWheel}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.95)",
        zIndex: 300,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        touchAction: "none",
      }}
    >
      <img
        src={src}
        alt=""
        onDoubleClick={() => applyScale(scale > 1 ? 1 : 2)}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        draggable={false}
        style={{
          maxWidth: "100%",
          maxHeight: "100%",
          objectFit: "contain",
          transform: `translate(${tx}px, ${ty}px) scale(${scale})`,
          transition: dragging.current ? "none" : "transform 0.15s ease",
          cursor: scale > 1 ? "grab" : "zoom-in",
          userSelect: "none",
        }}
      />
      <div style={{ position: "absolute", top: 16, right: 16, display: "flex", gap: 8 }}>
        <button onClick={() => applyScale(scale - 0.5)} aria-label="Dézoomer" style={zoomBtnStyle}>
          −
        </button>
        <button onClick={() => applyScale(scale + 0.5)} aria-label="Zoomer" style={zoomBtnStyle}>
          ＋
        </button>
        <button onClick={onClose} aria-label="Fermer" style={zoomBtnStyle}>
          <X size={18} />
        </button>
      </div>
    </div>
  );
}

const zoomBtnStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.18)",
  color: "#fff",
  border: "none",
  borderRadius: "50%",
  width: 40,
  height: 40,
  cursor: "pointer",
  fontSize: 20,
  fontWeight: 700,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const inputStyle: React.CSSProperties = {
  padding: 10,
  border: "1px solid #cbd5e1",
  borderRadius: 8,
  width: "100%",
  fontSize: "1rem",
};
