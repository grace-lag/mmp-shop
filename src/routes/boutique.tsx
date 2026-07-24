import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { SiteLayout } from "@/components/SiteLayout";
import { formatPrice, listAnnonces } from "@/lib/annonces";
import { useAuth } from "@/lib/auth/AuthProvider";

export const Route = createFileRoute("/boutique")({ component: BoutiquePage });

function BoutiquePage() {
  const { user } = useAuth();
  const { data } = useQuery({ queryKey: ["annonces", "all", user?.id ?? "anon"], queryFn: () => listAnnonces({ excludeUserId: user?.id ?? null }) });
  return (
    <SiteLayout>
      <section className="store-banner">
        <div className="store-flex">
          <div className="store-logo-large">M</div>
          <div className="store-info">
            <h1>MaMarketplace — Toutes les boutiques</h1>
            <p>📍 Congo | 🕒 Ouvert 24h/24</p>
          </div>
        </div>
      </section>
      <div className="product-grid" style={{ marginTop: 24 }}>
        {(data ?? []).map((a) => (
          <Link key={a.id} to="/annonce/$id" params={{ id: a.id }} className="product-card" style={{ textDecoration: "none", color: "inherit" }}>
            {a.image_url ? <img src={a.image_url} alt={a.title} /> : <div style={{ height: 160, background: "#f1f5f9", borderRadius: 8 }} />}
            <h3>{a.title}</h3>
            <p className="price">{formatPrice(a.price, (a as any).currency)}</p>
          </Link>
        ))}
      </div>
    </SiteLayout>
  );
}
