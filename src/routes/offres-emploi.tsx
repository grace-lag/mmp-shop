import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { SiteLayout } from "@/components/SiteLayout";
import { formatPrice, listAnnonces } from "@/lib/annonces";
import { shortAge } from "@/lib/time";

export const Route = createFileRoute("/offres-emploi")({
  head: () => ({ meta: [{ title: "Offres d'emploi — MaMarketplace E-Shop" }] }),
  component: JobsPage,
});

function JobsPage() {
  const { data: jobs } = useQuery({
    queryKey: ["jobs"],
    queryFn: () => listAnnonces({ category: "Emplois", limit: 60 }),
  });

  return (
    <SiteLayout>
      <h1 style={{ marginTop: 16 }}>💼 Offres d'emploi</h1>
      <p style={{ color: "#475569" }}>Toutes les offres d'emploi publiées sur MaMarketplace E-Shop.</p>
      <Link to="/poster" className="btn-whatsapp" style={{ display: "inline-block", marginBottom: 16 }}>
        + Publier une offre d'emploi
      </Link>
      <div className="product-grid">
        {(jobs ?? []).map((a) => (
          <div className="product-card" key={a.id}>
            <span className="age-badge">{shortAge((a as any).created_at)}</span>
            {a.city && <div className="badge-city">{a.city}</div>}
            <Link to="/annonce/$id" params={{ id: a.id }} className="product-link">
              {a.image_url ? <img src={a.image_url} alt={a.title} /> : (
                <div style={{ height: 160, background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 8 }}>💼</div>
              )}
            </Link>
            <h3>{a.title}</h3>
            <p className="price">{formatPrice(a.price)}</p>
            <Link to="/annonce/$id" params={{ id: a.id }} className="btn-whatsapp">Voir l'offre</Link>
          </div>
        ))}
        {jobs && jobs.length === 0 && <p style={{ color: "#64748b" }}>Aucune offre pour le moment.</p>}
      </div>
    </SiteLayout>
  );
}
