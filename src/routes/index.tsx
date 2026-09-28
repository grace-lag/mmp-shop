import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { SiteLayout } from "@/components/SiteLayout";
import { CITIES, CATEGORIES, formatPrice, listAnnonces } from "@/lib/annonces";
import { shortAge } from "@/lib/time";
import { AnnonceStats } from "@/components/AnnonceStats";
import { usePresenceMap, PresenceDot } from "@/lib/presence";

import { useAuth } from "@/lib/auth/AuthProvider";
import hero from "@/assets/mamarketplace-eshop-hero.webp";
import ad from "@/assets/ad-3.webp";
import adBillboard from "@/assets/ad-billboard.webp.asset.json";
import adPosters from "@/assets/ad-posters.webp.asset.json";
import adMarket from "@/assets/ad-market.webp.asset.json";
import { listBanners } from "@/lib/banners";

const DEFAULT_ADS = [
  { src: hero, type: "image" as const, caption: "Vendez et achetez avec toute facilité" },
  { src: ad, type: "image" as const, caption: "trouvez tout ce dont vous avez besoin à Brazzaville et partout au Congo" },
  { src: adBillboard.url, type: "image" as const, caption: "Vos envies en un clic !" },
  { src: adPosters.url, type: "image" as const, caption: "Explorez, vendez, connectez-vous sur MaMarketplace" },
  { src: adMarket.url, type: "image" as const, caption: "Faites grandir votre entreprise avec MaMarketplace" },
];

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MMP Shop — MaMarketplace E-Shop | Acheter et vendre au Congo" },
      { name: "description", content: "MMP Shop (MaMarketplace E-Shop) : achetez et vendez au Congo. Annonces locales, boutiques, shorts vidéo, paiement et livraison au Congo-Brazzaville." },
      { property: "og:title", content: "MMP Shop — Acheter et vendre au Congo" },
      { property: "og:description", content: "Annonces locales, boutiques et shorts vidéo au Congo-Brazzaville." },
    ],
    links: [{ rel: "preload", as: "image", href: hero, fetchPriority: "high" } as any],
  }),
  component: Index,
});

function Index() {
  const [shopSearch, setShopSearch] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [city, setCity] = useState("Brazzaville");
  const [adIndex, setAdIndex] = useState(0);
  const [showSuggest, setShowSuggest] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  // People suggestions for the top search bar
  const { data: peopleSuggest } = useQuery({
    queryKey: ["people-suggest", shopSearch],
    enabled: shopSearch.trim().length >= 2,
    queryFn: async () => {
      const tokens = shopSearch
        .trim()
        .split(/\s+/)
        .filter((t) => t.length > 0);
      const { supabase } = await import("@/integrations/supabase/client");
      let q = supabase.from("profiles").select("id,prenom,nom,avatar_url");
      for (const t of tokens) {
        const like = `%${t}%`;
        q = q.or(`prenom.ilike.${like},nom.ilike.${like}`);
      }
      const { data } = await q.limit(6);
      return data ?? [];
    },
  });

  const { data: annoncesRaw } = useQuery({
    queryKey: ["annonces", "tendance"],
    queryFn: () => listAnnonces({ limit: 50 }),
  });
  // Trending: last 24h first (by recency), then by views desc
  const annonces = (annoncesRaw ?? []).slice().sort((a: any, b: any) => {
    const now = Date.now();
    const dayMs = 24 * 3600 * 1000;
    const aRecent = now - new Date(a.created_at).getTime() < dayMs;
    const bRecent = now - new Date(b.created_at).getTime() < dayMs;
    if (aRecent !== bRecent) return aRecent ? -1 : 1;
    if (aRecent && bRecent) return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    return (b.views ?? 0) - (a.views ?? 0);
  });
  const { data: presence } = usePresenceMap((annonces ?? []).map((a: any) => a.seller_id));

  // Bannières gérées par les administrateurs (images + vidéos courtes muettes)
  const { data: banners } = useQuery({
    queryKey: ["site-banners", "home"],
    queryFn: () => listBanners(),
    staleTime: 5 * 60 * 1000,
  });
  const slides =
    banners && banners.length > 0
      ? banners.map((b) => ({ src: b.url, type: b.media_type, caption: b.caption ?? "" }))
      : DEFAULT_ADS;

  useEffect(() => {
    setAdIndex(0);
  }, [banners]);

  useEffect(() => {
    const t = setInterval(() => setAdIndex((i) => (i + 1) % slides.length), 4000);
    return () => clearInterval(t);
  }, [slides.length]);

  return (
    <SiteLayout activeNav="accueil">
      {/* Barre 1 : recherche de boutiques */}
      <form
        className="shop-search-bar"
        style={{ marginTop: -32, position: "relative" }}
        onSubmit={(e) => {
          e.preventDefault();
          const q = shopSearch.trim();
          navigate({ to: "/recherche-utilisateur", search: { q } as any });
        }}
      >
        <input
          type="text"
          placeholder="Rechercher une boutique"
          value={shopSearch}
          onChange={(e) => {
            setShopSearch(e.target.value);
            setShowSuggest(true);
          }}
          onFocus={(e) => {
            e.currentTarget.blur();
            navigate({ to: "/recherche-utilisateur", search: { q: shopSearch.trim() } as any });
          }}
          readOnly
        />

        <button type="submit" aria-label="Rechercher">
          <Search size={18} />
        </button>
        {showSuggest && shopSearch.trim().length >= 2 && (peopleSuggest?.length ?? 0) > 0 && (
          <div
            style={{
              position: "absolute",
              top: "100%",
              left: 0,
              right: 0,
              background: "#fff",
              border: "1px solid #fed7aa",
              borderRadius: 12,
              marginTop: 4,
              boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
              zIndex: 40,
              overflow: "hidden",
            }}
          >
            {(peopleSuggest ?? []).map((p: any) => {
              const name = [p.prenom, p.nom].filter(Boolean).join(" ").trim() || "Utilisateur";
              return (
                <button
                  key={p.id}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    setShowSuggest(false);
                    navigate({ to: "/vendeur/$id", params: { id: p.id } });
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "8px 12px",
                    width: "100%",
                    border: "none",
                    background: "transparent",
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: "50%",
                      overflow: "hidden",
                      background: "#f1f5f9",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {p.avatar_url ? (
                      <img src={p.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                      "👤"
                    )}
                  </div>
                  <span style={{ fontWeight: 500 }}>{name}</span>
                </button>
              );
            })}
          </div>
        )}
      </form>

      {/* Carrousel publicitaire - collé sous la barre de recherche */}
      <div
        style={{
          position: "relative",
          borderRadius: 14,
          overflow: "hidden",
          aspectRatio: "5/2",
          background: "#0f172a",
          margin: "0 0 10px 0",
        }}
      >
        {slides.map((ad, i) => {
          // Only the current slide (and the next one, ready to fade in) is
          // fetched — loading all banners at once made the first paint slow.
          const isCurrent = i === adIndex;
          const isNext = i === (adIndex + 1) % slides.length;
          if (!isCurrent && !isNext) return null;
          const style = {
            position: "absolute" as const,
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover" as const,
            opacity: isCurrent ? 1 : 0,
            transition: "opacity 700ms ease-in-out",
          };
          if (ad.type === "video") {
            return (
              <video
                key={ad.src}
                src={ad.src}
                muted
                autoPlay
                loop
                playsInline
                preload="metadata"
                style={style}
              />
            );
          }
          return (
            <img
              key={ad.src}
              src={ad.src}
              alt={ad.caption}
              loading={i === 0 ? "eager" : "lazy"}
              decoding="async"
              style={style}
            />
          );
        })}
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            padding: "10px 14px",
            background: "linear-gradient(to top, rgba(0,0,0,0.65), transparent)",
            color: "#fff",
            fontWeight: 600,
            fontSize: "0.9rem",
          }}
        >
          {slides[adIndex]?.caption ?? ""}
        </div>
        <div style={{ position: "absolute", bottom: 6, right: 10, display: "flex", gap: 4 }}>
          {slides.map((_, i) => (
            <span
              key={i}
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: i === adIndex ? "#fff" : "rgba(255,255,255,0.4)",
              }}
            />
          ))}
        </div>
      </div>

      {/* Catégories horizontales texte uniquement */}
      <div className="cat-scroll text-only">
        {CATEGORIES.filter((c) => c !== "Emplois").map((c) => (
          <Link key={c} to="/annonces" search={{ q: "", city: "", category: c } as any} className="cat-pill">
            {c}
          </Link>
        ))}
      </div>

      {/* Barre 2 : recherche produit + ville */}
      <form
        className="product-search-bar"
        onSubmit={(e) => {
          e.preventDefault();
          navigate({ to: "/annonces", search: { q: productSearch, city } as any });
        }}
      >
        <input
          type="text"
          placeholder="Que recherchez-vous ?"
          value={productSearch}
          onChange={(e) => setProductSearch(e.target.value)}
        />
        <select value={city} onChange={(e) => setCity(e.target.value)}>
          {CITIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <button type="submit" aria-label="Rechercher">
          <Search size={18} />
        </button>
      </form>

      <section style={{ marginTop: 16 }}>
        <div className="section-header">
          <h2>Annonces tendance</h2>
          <Link to="/annonces" className="view-all">
            Voir tout →
          </Link>
        </div>
        <div className="product-grid">
          {(annonces ?? []).map((a) => (
            <div className="product-card" key={a.id}>
              <span className="age-badge">{shortAge((a as any).created_at)}</span>
              {a.city && (
                <div className="badge-city">
                  {a.city}
                  <PresenceDot lastSeenAt={presence?.[(a as any).seller_id]} />
                </div>
              )}

              <Link to="/annonce/$id" params={{ id: a.id }} className="product-link">
                {a.image_url ? (
                  <img src={a.image_url} alt={a.title} loading="lazy" decoding="async" />
                ) : (
                  <div
                    style={{
                      height: 160,
                      background: "#f1f5f9",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      borderRadius: 8,
                    }}
                  >
                    📷
                  </div>
                )}
              </Link>
              <h3>{a.title}</h3>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 8,
                  flexWrap: "wrap",
                }}
              >
                <p className="price" style={{ margin: 0 }}>
                  {formatPrice(a.price, (a as any).currency)}
                </p>
                <AnnonceStats annonceId={a.id} views={a.views ?? 0} likes={a.likes_count ?? 0} />
              </div>

              <Link to="/annonce/$id" params={{ id: a.id }} className="btn-whatsapp">
                Voir l'annonce
              </Link>
            </div>
          ))}
          {annonces && annonces.length === 0 && (
            <p style={{ color: "#64748b" }}>
              Aucune annonce pour le moment. <Link to="/poster">Soyez le premier à en publier !</Link>
            </p>
          )}
        </div>
      </section>
    </SiteLayout>
  );
}
