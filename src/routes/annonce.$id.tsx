import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { SiteLayout } from "@/components/SiteLayout";
import { Comments } from "@/components/Comments";
import { AnnonceStats } from "@/components/AnnonceStats";
import { SellerRating } from "@/components/SellerRating";
import { formatPrice, getAnnonce, incrementViews } from "@/lib/annonces";
import { deleteAnnonceServerFn } from "@/lib/annonces.functions";
import { useAuth } from "@/lib/auth/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { isOnline } from "@/lib/presence";
import { toast } from "sonner";



export const Route = createFileRoute("/annonce/$id")({
  component: AnnonceDetail,
});

function AnnonceDetail() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const deleteAnnonce = useServerFn(deleteAnnonceServerFn);

  const requireAuth = (e: React.MouseEvent) => {
    if (!user) {
      e.preventDefault();
      toast.info("Connecte-toi d'abord pour utiliser cette action.");
      navigate({ to: "/login" });
      return true;
    }
    return false;
  };

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
        .select("id,prenom,nom,avatar_url,last_seen_at")
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
      qc.invalidateQueries();
      navigate({ to: "/annonces", search: { q: "", city: "", category: "", subcategory: "" } as any });
    },
    onError: (e: any) => toast.error(e?.message ?? "Suppression impossible"),
  });

  const [activeImg, setActiveImg] = useState(0);
  const [enlargedAvatar, setEnlargedAvatar] = useState(false);
  const [enlargedPhoto, setEnlargedPhoto] = useState<string | null>(null);
  const galleryRef = useRef<HTMLDivElement>(null);

  if (isLoading) return <SiteLayout><p>Chargement...</p></SiteLayout>;
  if (!annonce) return <SiteLayout><p>Annonce introuvable.</p></SiteLayout>;

  const isOwner = user?.id === annonce.seller_id;
  const gallery = (annonce.images && annonce.images.length > 0) ? annonce.images : (annonce.image_url ? [annonce.image_url] : []);

  const sellerLabel = seller ? `${seller.prenom ?? ""} ${seller.nom ?? ""}`.trim() || (annonce.seller_name || "Vendeur") : (annonce.seller_name || "Vendeur");

  const onGalleryScroll = () => {
    const el = galleryRef.current;
    if (!el) return;
    const idx = Math.round(el.scrollLeft / el.clientWidth);
    if (idx !== activeImg) setActiveImg(idx);
  };

  const goToImg = (i: number) => {
    const el = galleryRef.current;
    if (!el) return;
    el.scrollTo({ left: i * el.clientWidth, behavior: "smooth" });
  };

  const sellerOnline = isOnline((seller as any)?.last_seen_at);

  return (
    <SiteLayout hideFooter>
      {/* Seller header at the very top */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 16, marginBottom: 12 }}>
        <span
          onClick={() => { if (seller?.avatar_url) setEnlargedAvatar(true); }}
          style={{
            width: 48, height: 48, borderRadius: "50%", overflow: "hidden",
            border: "1px solid #e2e8f0", background: "#f1f5f9",
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, color: "#94a3b8",
            cursor: seller?.avatar_url ? "zoom-in" : "default", flexShrink: 0, position: "relative",
          }}
        >
          {seller?.avatar_url ? (
            <img src={seller.avatar_url} alt={sellerLabel} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : "👤"}
          <span style={{ position: "absolute", bottom: 0, right: 0, width: 12, height: 12, borderRadius: "50%", background: sellerOnline ? "#16a34a" : "#9ca3af", border: "2px solid #fff" }} />
        </span>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600 }}>{sellerLabel}</div>
          {annonce.seller_id && (
            <div style={{ marginTop: 2 }}>
              <SellerRating sellerId={annonce.seller_id} />
            </div>
          )}
          <Link
            to="/vendeur/$id"
            params={{ id: annonce.seller_id ?? "" }}
            className="btn-whatsapp"
            style={{ background: "#15803d", display: "inline-block", marginTop: 6, padding: "6px 14px", fontSize: "0.85rem", textDecoration: "none" }}
          >
            🏪 Accéder à la boutique
          </Link>
        </div>
      </div>

      {/* Swipeable photo gallery with dots */}
      <div className="annonce-grid" style={{ display: "grid", gap: 16 }}>
        <div>
          {gallery.length > 0 ? (
            <>
              <div
                ref={galleryRef}
                onScroll={onGalleryScroll}
                className="annonce-gallery"
              >
                {gallery.map((src, i) => (
                  <img key={src + i} src={src} alt={`photo ${i + 1}`} className="annonce-main-image" style={{ cursor: "zoom-in" }} onClick={() => setEnlargedPhoto(src)} />
                ))}
              </div>
              {gallery.length > 1 && (
                <div className="annonce-dots">
                  {gallery.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => goToImg(i)}
                      aria-label={`Photo ${i + 1}`}
                      className={`annonce-dot ${i === activeImg ? "active" : ""}`}
                    />
                  ))}
                </div>
              )}
            </>
          ) : (
            <div style={{ height: 380, background: "#f1f5f9", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 48 }}>📷</div>
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
            {annonce.phone && (
              <a href={`tel:${annonce.phone}`} className="btn-whatsapp" onClick={requireAuth}>📞 Appel</a>
            )}
            {annonce.whatsapp && (
              <a href={`https://wa.me/${annonce.whatsapp.replace(/\D/g, "")}`} className="btn-whatsapp" style={{ background: "#25D366" }} onClick={requireAuth}>💬 WhatsApp</a>
            )}
            {!isOwner && annonce.seller_id && (
              <>
                {user ? (
                  <Link to="/chat" search={{ to: annonce.seller_id }} className="btn-whatsapp" style={{ background: "#2563eb" }}>
                    ✉️ Message
                  </Link>
                ) : (
                  <a href="#" className="btn-whatsapp" style={{ background: "#2563eb" }} onClick={requireAuth}>✉️ Message</a>
                )}
                {user ? (
                  <button className="btn-whatsapp" onClick={() => toggleFav.mutate()} style={{ background: isFav ? "#dc2626" : "#64748b" }}>
                    {isFav ? "❤️ Fav" : "🤍 Fav"}
                  </button>
                ) : (
                  <button className="btn-whatsapp" onClick={(e) => requireAuth(e)} style={{ background: "#64748b" }}>🤍 Fav</button>
                )}
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

      <section style={{ marginTop: 24, background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: 12, padding: 16 }}>
        <h3 style={{ marginTop: 0, color: "#9a3412" }}>🛡️ Conseils de sécurité</h3>
        <ul style={{ margin: 0, paddingLeft: 20, color: "#7c2d12", lineHeight: 1.7, fontSize: "0.92rem" }}>
          <li>Vérifiez le vendeur : consultez sa boutique, ses évaluations et son ancienneté avant tout paiement.</li>
          <li>Rencontrez-vous dans un lieu public et fréquenté pour les transactions en personne.</li>
          <li>Ne versez jamais d'acompte sans avoir vu le produit ou obtenu de garanties solides.</li>
          <li>Méfiez-vous des prix anormalement bas — c'est souvent une arnaque.</li>
          <li>Gardez vos échanges sur la plateforme : cela vous protège en cas de litige.</li>
          <li>Signalez tout compte ou annonce suspecte via la page Aide.</li>
        </ul>
      </section>


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
