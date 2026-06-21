import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { SiteLayout } from "@/components/SiteLayout";
import { Comments } from "@/components/Comments";
import { AnnonceStats } from "@/components/AnnonceStats";
import { formatPrice, getAnnonce, incrementViews } from "@/lib/annonces";
import { deleteAnnonceServerFn } from "@/lib/annonces.functions";
import { useAuth } from "@/lib/auth/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";


export const Route = createFileRoute("/annonce/$id")({
  component: AnnonceDetail,
});

function AnnonceDetail() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const qc = useQueryClient();
  const deleteAnnonce = useServerFn(deleteAnnonceServerFn);

  const { data: annonce, isLoading } = useQuery({ queryKey: ["annonce", id], queryFn: () => getAnnonce(id) });

  // Increment view once per mount
  useEffect(() => {
    incrementViews(id).catch(() => {});
  }, [id]);

  // Seller profile (name + avatar)
  const { data: seller } = useQuery({
    queryKey: ["seller-profile", annonce?.seller_id],
    enabled: !!annonce?.seller_id,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id,prenom,nom,avatar_url")
        .eq("id", annonce!.seller_id!)
        .maybeSingle();
      return data;
    },
  });

  // Favorites

  const { data: isFav } = useQuery({
    queryKey: ["fav", id, user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("favorites").select("id").eq("annonce_id", id).eq("user_id", user!.id).maybeSingle();
      return !!data;
    },
  });

  const toggleFav = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Connecte-toi d'abord");
      if (isFav) {
        await supabase.from("favorites").delete().eq("annonce_id", id).eq("user_id", user.id);
      } else {
        await supabase.from("favorites").insert({ annonce_id: id, user_id: user.id });
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["fav", id] }),
    onError: (e: any) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: () => deleteAnnonce({ data: { id } }),
    onSuccess: () => {
      toast.success("Annonce supprimée");
      window.location.href = "/annonces";
    },
    onError: (e: any) => toast.error(e.message),
  });

  const [activeImg, setActiveImg] = useState(0);
  const [enlargedAvatar, setEnlargedAvatar] = useState(false);

  if (isLoading) return <SiteLayout><p>Chargement...</p></SiteLayout>;
  if (!annonce) return <SiteLayout><p>Annonce introuvable.</p></SiteLayout>;

  const isOwner = user?.id === annonce.seller_id;
  const gallery = (annonce.images && annonce.images.length > 0) ? annonce.images : (annonce.image_url ? [annonce.image_url] : []);
  const mainImg = gallery[activeImg] ?? gallery[0];

  const sellerLabel = seller ? `${seller.prenom ?? ""} ${seller.nom ?? ""}`.trim() || (annonce.seller_name || "Vendeur") : (annonce.seller_name || "Vendeur");

  return (
    <SiteLayout>
      {/* Seller header at the very top */}
      <Link
        to="/vendeur/$id"
        params={{ id: annonce.seller_id ?? "" }}
        style={{ display: "flex", alignItems: "center", gap: 12, textDecoration: "none", color: "inherit", marginTop: 16, marginBottom: 12 }}
      >
        <span
          onClick={(e) => { if (seller?.avatar_url) { e.preventDefault(); setEnlargedAvatar(true); } }}
          style={{
            width: 48, height: 48, borderRadius: "50%", overflow: "hidden",
            border: "1px solid #e2e8f0", background: "#f1f5f9",
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, color: "#94a3b8",
            cursor: seller?.avatar_url ? "zoom-in" : "default", flexShrink: 0,
          }}
        >
          {seller?.avatar_url ? (
            <img src={seller.avatar_url} alt={sellerLabel} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : "👤"}
        </span>
        <div>
          <div style={{ fontWeight: 600 }}>{sellerLabel}</div>
          <div style={{ fontSize: "0.85em", color: "#64748b" }}>Voir la boutique →</div>
        </div>
      </Link>

      {/* Full-width image */}
      <div className="annonce-grid" style={{ display: "grid", gap: 16 }}>
        <div>
          {mainImg ? (
            <img src={mainImg} alt={annonce.title} className="annonce-main-image" style={{ borderRadius: 12 }} />
          ) : (
            <div style={{ height: 380, background: "#f1f5f9", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 48 }}>📷</div>
          )}
          {gallery.length > 1 && (
            <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
              {gallery.map((src, i) => (
                <button key={src} onClick={() => setActiveImg(i)} style={{ padding: 0, border: i === activeImg ? "2px solid #e67e22" : "2px solid transparent", borderRadius: 8, background: "none", cursor: "pointer" }}>
                  <img src={src} alt={`photo ${i + 1}`} style={{ width: 72, height: 72, objectFit: "cover", borderRadius: 6, display: "block" }} />
                </button>
              ))}
            </div>
          )}
          <div style={{ marginTop: 12 }}>
            <AnnonceStats annonceId={id} views={annonce.views ?? 0} likes={annonce.likes_count ?? 0} />
          </div>
        </div>

        <div>
          <h1>{annonce.title}</h1>
          <p className="price" style={{ fontSize: "1.8em" }}>{formatPrice(annonce.price)}</p>
          {annonce.city && <p>📍 {annonce.city}</p>}
          {annonce.category && <p>🏷️ {annonce.category}{annonce.subcategory ? ` — ${annonce.subcategory}` : ""}</p>}

          <p style={{ marginTop: 16 }}>{annonce.description}</p>
          <div className="annonce-actions">
            {annonce.phone && <a href={`tel:${annonce.phone}`} className="btn-whatsapp">📞 Appel</a>}
            {annonce.whatsapp && <a href={`https://wa.me/${annonce.whatsapp.replace(/\D/g, "")}`} className="btn-whatsapp" style={{ background: "#25D366" }}>💬 WhatsApp</a>}
            {user && !isOwner && annonce.seller_id && (
              <>
                <Link to="/chat" search={{ to: annonce.seller_id }} className="btn-whatsapp" style={{ background: "#2563eb" }}>
                  ✉️ Message
                </Link>
                <button className="btn-whatsapp" onClick={() => toggleFav.mutate()} style={{ background: isFav ? "#dc2626" : "#64748b" }}>
                  {isFav ? "❤️ Fav" : "🤍 Fav"}
                </button>
              </>
            )}
            {isOwner && (
              <button className="btn-whatsapp" style={{ background: "#dc2626" }} onClick={() => confirm("Supprimer cette annonce ?") && del.mutate()}>
                🗑️ Supprimer
              </button>
            )}
          </div>
        </div>
      </div>


      <Comments annonceId={id} />

      {/* Avatar lightbox */}
      {enlargedAvatar && seller?.avatar_url && (
        <div
          onClick={() => setEnlargedAvatar(false)}
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 2000, cursor: "zoom-out", padding: 24,
          }}
        >
          <img src={seller.avatar_url} alt={sellerLabel} style={{ maxWidth: "92vw", maxHeight: "92vh", borderRadius: 12 }} />
        </div>
      )}
    </SiteLayout>
  );
}
