import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteLayout } from "@/components/SiteLayout";
export const Route = createFileRoute("/options")({ component: () => (
  <SiteLayout>
    <h1 style={{ marginTop: 16 }}>Autres options</h1>
    <div className="product-grid" style={{ marginTop: 16 }}>
      <Link to="/chat" className="option-card">💬 <div><h3>Chat</h3><p>Discuter avec les vendeurs</p></div></Link>
      <Link to="/historique" className="option-card">📋 <div><h3>Historique</h3><p>Mes commandes et favoris</p></div></Link>
      <Link to="/dashboard" className="option-card">📊 <div><h3>Tableau de bord</h3><p>Gérer mes annonces</p></div></Link>
    </div>
  </SiteLayout>
)});
