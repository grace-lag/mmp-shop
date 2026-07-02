import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { SiteLayout } from "@/components/SiteLayout";
import { CATEGORIES, CITIES, formatPrice, listAnnonces } from "@/lib/annonces";
import { AnnonceStats } from "@/components/AnnonceStats";


export const Route = createFileRoute("/annonces")({
  validateSearch: (s: Record<string, unknown>) => ({
    q: (s.q as string) || "",
    city: (s.city as string) || "",
    category: (s.category as string) || "",
    subcategory: (s.subcategory as string) || "",
  }),
  component: AnnoncesPage,
});

function AnnoncesPage() {
  const sp = Route.useSearch();
  const [search, setSearch] = useState(sp.q);
  const [city, setCity] = useState(sp.city);
  const [category, setCategory] = useState(sp.category);
  const subcategory = sp.subcategory;
  

  const { data, isLoading } = useQuery({
    queryKey: ["annonces", { search, city, category, subcategory }],
    queryFn: () => listAnnonces({ search, city, category, subcategory }),
  });

  return (
    <SiteLayout>
      <h1 style={{ marginTop: 16 }}>
        Toutes les annonces{subcategory ? ` — ${subcategory}` : ""}
      </h1>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
        <input className="search-input" placeholder="Rechercher..." value={search} onChange={(e) => setSearch(e.target.value)} />
        <select className="city-select" value={city} onChange={(e) => setCity(e.target.value)}>
          <option value="">Toutes les villes</option>
          {CITIES.map((c) => <option key={c}>{c}</option>)}
        </select>
        <select className="city-select" value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">Toutes catégories</option>
          {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
        </select>
      </div>

      {isLoading && <p>Chargement...</p>}
      <div className="product-grid">
        {(data ?? []).map((a) => (
          <div className="product-card" key={a.id}>
            {a.city && <div className="badge-city">{a.city}</div>}
            <Link to="/annonce/$id" params={{ id: a.id }} className="product-link">
              {a.image_url ? <img src={a.image_url} alt={a.title} /> : <div style={{ height: 160, background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 8 }}>📷</div>}
            </Link>
            <h3>{a.title}</h3>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
              <p className="price" style={{ margin: 0 }}>{formatPrice(a.price)}</p>
              <AnnonceStats annonceId={a.id} views={a.views ?? 0} likes={a.likes_count ?? 0} />
            </div>

            <Link to="/annonce/$id" params={{ id: a.id }} className="btn-whatsapp">Voir l'annonce</Link>
          </div>
        ))}
        {data && data.length === 0 && <p>Aucune annonce ne correspond.</p>}
      </div>
    </SiteLayout>
  );
}
