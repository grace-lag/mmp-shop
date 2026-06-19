import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout } from "@/components/SiteLayout";
export const Route = createFileRoute("/mentions-legales")({ component: () => (
  <SiteLayout>
    <h1 style={{ marginTop: 16 }}>Mentions légales</h1>
    <p>MaMarketplace — Plateforme communautaire au Congo. Contact : support@mamarketplace.cg</p>
  </SiteLayout>
)});
