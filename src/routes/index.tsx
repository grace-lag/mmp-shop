import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { SiteLayout } from "@/components/SiteLayout";
import { CITIES, CATEGORIES, CATEGORY_ICONS, formatPrice, listAnnonces } from "@/lib/annonces";
import { shortAge } from "@/lib/time";
import { AnnonceStats } from "@/components/AnnonceStats";
import { useAuth } from "@/lib/auth/AuthProvider";
import ad1 from "@/assets/ad-1.jpg";
import ad2 from "@/assets/ad-2.jpg";
import ad3 from "@/assets/ad-3.jpg";
import heroPlatform from "@/assets/mamarketplace-eshop-hero.jpg";

const ADS = [
  { src: heroPlatform, caption: "MaMarketplace E-Shop : la plateforme N°1 au Congo" },
  { src: ad1, caption: "Achetez tout, partout au Congo" },
  { src: ad2, caption: "Vendre devient simple sur MaMarketplace E-Shop" },
  { src: ad3, caption: "Livraison rapide à Brazzaville et au-delà" },
];

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MaMarketplace — Accueil" },
      { name: "description", content: "Trouvez ce dont vous avez besoin au Congo." },
    ],
  }),
  component: Index,
});

function Index() {
  const [search, setSearch] = useState("");
  const [city, setCity] = useState("Brazzaville");
  const [adIndex, setAdIndex] = useState(0);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: annonces } = useQuery({
    queryKey: ["annonces", "tendance", user?.id ?? "anon"],
    queryFn: () => listAnnonces({ limit: 9, excludeUserId: user?.id ?? null }),
  });

  useEffect(() => {
    const t = setInterval(() => setAdIndex((i) => (i + 1) % ADS.length), 3000);
    return () => clearInterval(t);
  }, []);

  return (
    <SiteLayout activeNav="accueil">
      {/* Barre de recherche collée sous le bandeau orange */}
      <form
        className="search-container"
        style={{ margin: "0 -16px 12px", borderRadius: 0 }}
        onSubmit={(e) => {
          e.preventDefault();
          navigate({ to: "/annonces", search: { q: search, city } as any });
        }}
      >
        <input
          type="text"
          placeholder="Rechercher une boutique sur ma marketplace"
          className="search-input"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select className="city-select" value={city} onChange={(e) => setCity(e.target.value)}>
          {CITIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <button type="submit" className="search-btn search-icon-only" aria-label="Rechercher">🔍</button>
      </form>

      {/* Carrousel publicitaire */}
      <div
        style={{
          position: "relative",
          borderRadius: 14,
          overflow: "hidden",
          aspectRatio: "5/2",
          background: "#0f172a",
          marginBottom: 12,
        }}
      >
        {ADS.map((ad, i) => (
          <img
            key={ad.src}
            src={ad.src}
            alt={ad.caption}
            loading="lazy"
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              opacity: i === adIndex ? 1 : 0,
              transition: "opacity 700ms ease-in-out",
            }}
          />
        ))}
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
          {ADS[adIndex].caption}
        </div>
        <div style={{ position: "absolute", bottom: 6, right: 10, display: "flex", gap: 4 }}>
          {ADS.map((_, i) => (
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

      <section
        className="hero-search"
        style={{
          backgroundImage: `linear-gradient(rgba(15,23,42,0.08), rgba(15,23,42,0.22)), url(${heroBg})`,
          backgroundSize: "cover",
          backgroundPosition: "center top",
          color: "white",
        }}
      >
        <h1 className="sr-only">MaMarketplace E-Shop</h1>
      </section>
      <form
        className="search-container hero-search-form"
        onSubmit={(e) => {
          e.preventDefault();
          navigate({ to: "/annonces", search: { q: search, city } as any });
        }}
      >
        <input
          type="text"
          placeholder="Que recherchez-vous ?"
          className="search-input"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select className="city-select" value={city} onChange={(e) => setCity(e.target.value)}>
          {CITIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <button type="submit" className="search-btn search-icon-only" aria-label="Rechercher">
          <span className="search-label">🔍 </span>
        </button>
      </form>

      <section>
        <div className="section-header">
          <h2>Annonces tendance</h2>
          <Link to="/annonces" className="view-all">
            Voir tout →
          </Link>
        </div>
        <div className="product-grid">
          {(annonces ?? []).map((a) => (
            <div className="product-card" key={a.id}>
              {a.city && <div className="badge-city">{a.city}</div>}
              <Link to="/annonce/$id" params={{ id: a.id }} className="product-link">
                {a.image_url ? (
                  <img src={a.image_url} alt={a.title} />
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
                  {formatPrice(a.price)}
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
