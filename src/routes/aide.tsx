import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteLayout } from "@/components/SiteLayout";

export const Route = createFileRoute("/aide")({
  head: () => ({ meta: [{ title: "Aide — MaMarketplace E-Shop" }] }),
  component: AidePage,
});

const TIPS = [
  { t: "Vérifiez le vendeur", d: "Consultez sa boutique, ses évaluations et son ancienneté avant tout paiement." },
  { t: "Rencontrez-vous en public", d: "Pour les achats en personne, privilégiez un lieu public et fréquenté." },
  { t: "Ne payez jamais à l'avance", d: "Ne versez pas d'acompte sans avoir vu le produit ou obtenu de garanties." },
  { t: "Méfiez-vous des prix trop bas", d: "Une offre anormalement basse est souvent une arnaque." },
  { t: "Gardez les conversations sur la plateforme", d: "Cela vous protège en cas de litige." },
  { t: "Signalez tout abus", d: "Contactez-nous pour signaler un compte ou une annonce suspecte." },
];

function AidePage() {
  return (
    <SiteLayout>
      <h1 style={{ marginTop: 16 }}>Aide & sécurité</h1>
      <p style={{ color: "#475569" }}>Quelques conseils pour acheter et vendre en toute confiance sur MaMarketplace E-Shop.</p>

      <h2 style={{ marginTop: 24 }}>Conseils de sécurité</h2>
      <div style={{ display: "grid", gap: 10, marginTop: 8 }}>
        {TIPS.map((tip) => (
          <div key={tip.t} style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 14 }}>
            <div style={{ fontWeight: 700, marginBottom: 4 }}>✅ {tip.t}</div>
            <div style={{ color: "#475569", fontSize: "0.92rem" }}>{tip.d}</div>
          </div>
        ))}
      </div>

      <h2 style={{ marginTop: 24 }}>Nous contacter</h2>
      <ul style={{ lineHeight: 1.9 }}>
        <li>📱 <a href="tel:+242064223575">+242 06 422 35 75</a></li>
        <li>✉️ <a href="mailto:liyeyegrace@gmail.com">liyeyegrace@gmail.com</a></li>
        <li>💬 <Link to="/chat">Chat en ligne</Link></li>
      </ul>
    </SiteLayout>
  );
}
