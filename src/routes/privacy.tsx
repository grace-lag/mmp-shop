import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout } from "@/components/SiteLayout";
export const Route = createFileRoute("/privacy")({ component: () => (
  <SiteLayout>
    <h1 style={{ marginTop: 16 }}>Politique de confidentialité</h1>
    <p>Nous collectons uniquement les données nécessaires au fonctionnement du service (email, nom, contact). Vos données ne sont jamais vendues.</p>
  </SiteLayout>
)});
