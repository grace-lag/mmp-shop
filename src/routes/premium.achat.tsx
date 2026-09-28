import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteLayout } from "@/components/SiteLayout";
import { PremiumOrderForm } from "@/components/PremiumOrderForm";
import { useAuth } from "@/lib/auth/AuthProvider";

export const Route = createFileRoute("/premium/achat")({
  head: () => ({
    meta: [
      { title: "Achat pour vous (Alibaba, AliExpress) — MMP Shop" },
      {
        name: "description",
        content:
          "Collez le lien du produit : nous l'achetons pour vous, nous l'expédions et nous vous le livrons au Congo. Zéro risque d'arnaque.",
      },
      { property: "og:title", content: "Achat pour vous (Alibaba, AliExpress) — MMP Shop" },
      { property: "og:description", content: "Nous achetons, expédions et livrons. Devis transparent." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PremiumSourcingPage,
});

function PremiumSourcingPage() {
  const { user, loading } = useAuth();
  if (loading) return <SiteLayout><p style={{ marginTop: 16 }}>Chargement...</p></SiteLayout>;
  if (!user) return <SiteLayout><p style={{ marginTop: 24 }}>Connectez-vous pour accéder à MMP Premium. <Link to="/login">Se connecter</Link></p></SiteLayout>;

  return (
    <SiteLayout>
      <h1 style={{ marginTop: 16 }}>Faites-vous acheter un produit</h1>
      <p style={{ color: "#475569", maxWidth: 620 }}>
        Vous avez repéré un produit sur Alibaba, AliExpress ou une boutique en ligne ? Collez le lien, indiquez le prix
        affiché : nous achetons à votre place, nous payons le fournisseur, nous expédions et nous vous livrons. En cas
        de problème, c'est MMP Shop qui répond devant vous.
      </p>
      <PremiumOrderForm kind="sourcing" />
    </SiteLayout>
  );
}
