import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { SiteLayout } from "@/components/SiteLayout";
import { PremiumOrderForm } from "@/components/PremiumOrderForm";
import { computeQuote, fcfa, getPremiumProduct, getPremiumSettings } from "@/lib/premium";

export const Route = createFileRoute("/premium/$id")({
  head: () => ({
    meta: [
      { title: "Produit Premium — MMP Shop" },
      { name: "description", content: "Détails du produit Premium et devis d'importation jusqu'au Congo." },
      { property: "og:title", content: "Produit Premium — MMP Shop" },
      { property: "og:description", content: "Devis clair : prix, transport et taxes inclus." },
      { property: "og:type", content: "product" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PremiumProductPage,
});

function PremiumProductPage() {
  const { id } = Route.useParams();
  const { data: product, isLoading } = useQuery({ queryKey: ["premium-product", id], queryFn: () => getPremiumProduct(id) });
  const { data: settings } = useQuery({ queryKey: ["premium-settings"], queryFn: getPremiumSettings });

  if (isLoading) return <SiteLayout><p style={{ marginTop: 16 }}>Chargement...</p></SiteLayout>;
  if (!product)
    return (
      <SiteLayout>
        <p style={{ marginTop: 16 }}>Produit introuvable. <Link to="/premium">Retour au Premium</Link></p>
      </SiteLayout>
    );

  const shown = settings
    ? computeQuote(settings, { basePrice: product.base_price, quantity: 1, weightKg: product.weight_kg }).productPrice
    : product.base_price;
  const gallery = product.images?.length ? product.images : product.image_url ? [product.image_url] : [];

  return (
    <SiteLayout>
      <h1 style={{ marginTop: 16 }}>{product.title}</h1>
      <p style={{ color: "#64748b", marginTop: 0 }}>
        {product.shop_name ? `${product.shop_name} — ` : ""}{product.origin_country}
      </p>
      {gallery.length > 0 && (
        <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 8 }}>
          {gallery.map((src, i) => (
            <img
              key={i}
              src={src}
              alt={`${product.title} ${i + 1}`}
              loading="lazy"
              style={{ width: 260, height: 260, objectFit: "cover", borderRadius: 12, flexShrink: 0 }}
            />
          ))}
        </div>
      )}
      <p className="price" style={{ fontSize: "1.4em" }}>{fcfa(shown)}</p>
      {product.description && <p style={{ whiteSpace: "pre-wrap" }}>{product.description}</p>}
      <h2>Commander ce produit</h2>
      <PremiumOrderForm kind="catalog" product={product} />
    </SiteLayout>
  );
}
