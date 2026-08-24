import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Crown, Globe2, PackageCheck, ShieldCheck } from "lucide-react";
import { SiteLayout } from "@/components/SiteLayout";
import { computeQuote, fcfa, getPremiumSettings, listPremiumProducts } from "@/lib/premium";

export const Route = createFileRoute("/premium/")({
  head: () => ({
    meta: [
      { title: "MMP Premium — Achat & import depuis la France | MMP Shop" },
      {
        name: "description",
        content:
          "Commandez des produits de boutiques françaises ou faites-vous acheter vos articles Alibaba en toute sécurité. Devis clair, livraison au Congo.",
      },
      { property: "og:title", content: "MMP Premium — Achat & import depuis la France" },
      {
        property: "og:description",
        content: "Devis transparent : prix, transport et taxes inclus. Livraison accompagnée jusqu'à vos mains.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PremiumPage,
});

function PremiumPage() {
  const { data: settings } = useQuery({ queryKey: ["premium-settings"], queryFn: getPremiumSettings });
  const { data: products, isLoading } = useQuery({
    queryKey: ["premium-products"],
    queryFn: () => listPremiumProducts(),
  });

  return (
    <SiteLayout>
      <section
        style={{
          marginTop: 16,
          borderRadius: 16,
          padding: 20,
          background: "linear-gradient(135deg,#111827,#f97316)",
          color: "#fff",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 700 }}>
          <Crown size={22} /> MMP Premium
        </div>
        <h1 style={{ margin: "8px 0", color: "#fff" }}>Commandez de France et de Chine, livré au Congo</h1>
        <p style={{ margin: 0, opacity: 0.95 }}>
          Nous achetons pour vous chez nos boutiques partenaires ou sur Alibaba, nous expédions et nous vous livrons.
          Un devis unique : prix du produit, transport et taxes inclus.
        </p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 14 }}>
          <Link to="/premium/achat" className="btn-whatsapp">
            Faire acheter un produit (Alibaba, etc.)
          </Link>
        </div>
      </section>

      <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", margin: "16px 0" }}>
        <Perk Icon={ShieldCheck} title="Garantie MMP" text="Siège physique au Congo. Non conforme ? Nous prenons la responsabilité." />
        <Perk Icon={Globe2} title="Boutiques partenaires" text="Produits sélectionnés en France et à l'étranger." />
        <Perk
          Icon={PackageCheck}
          title="Suivi complet"
          text={`Livraison estimée ${settings?.eta_days_min ?? 10}–${settings?.eta_days_max ?? 21} jours.`}
        />
      </div>

      <h2>Catalogue Premium</h2>
      {isLoading && <p>Chargement...</p>}
      <div className="product-grid">
        {(products ?? []).map((p) => {
          const shown = settings
            ? computeQuote(settings, { basePrice: p.base_price, quantity: 1, weightKg: p.weight_kg }).productPrice
            : p.base_price;
          return (
            <div className="product-card" key={p.id}>
              <div className="badge-city">{p.origin_country}</div>
              <Link to="/premium/$id" params={{ id: p.id }} className="product-link">
                {p.image_url ? (
                  <img src={p.image_url} alt={p.title} loading="lazy" decoding="async" />
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
                    📦
                  </div>
                )}
              </Link>
              <h3>{p.title}</h3>
              <p className="price" style={{ margin: 0 }}>{fcfa(shown)}</p>
              <Link to="/premium/$id" params={{ id: p.id }} className="btn-whatsapp">
                Commander
              </Link>
            </div>
          );
        })}
        {products && products.length === 0 && !isLoading && (
          <p>Aucun produit Premium pour le moment. Utilisez le service « Faire acheter un produit ».</p>
        )}
      </div>
    </SiteLayout>
  );
}

function Perk({ Icon, title, text }: { Icon: React.ComponentType<any>; title: string; text: string }) {
  return (
    <div style={{ border: "1px solid #e2e8f0", borderRadius: 12, padding: 12, display: "grid", gap: 4 }}>
      <Icon size={20} strokeWidth={1.8} color="#f97316" />
      <strong>{title}</strong>
      <span style={{ fontSize: "0.87em", color: "#64748b" }}>{text}</span>
    </div>
  );
}
