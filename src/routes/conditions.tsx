import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout } from "@/components/SiteLayout";
export const Route = createFileRoute("/conditions")({ component: () => (
  <SiteLayout>
    <h1 style={{ marginTop: 16 }}>Conditions d'utilisation</h1>
    <p>En utilisant MaMarketplace, vous acceptez nos conditions : ne pas publier de contenu illégal, respecter les autres utilisateurs, et assumer la responsabilité de vos transactions. MaMarketplace agit uniquement comme intermédiaire.</p>
  </SiteLayout>
)});
