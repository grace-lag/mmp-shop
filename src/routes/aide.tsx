import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteLayout } from "@/components/SiteLayout";

export const Route = createFileRoute("/aide")({
  head: () => ({ meta: [{ title: "Aide — MaMarketplace E-Shop" }] }),
  component: AidePage,
});

const STEPS = [
  { t: "Créer un compte", d: "Inscrivez-vous avec votre nom, prénom, téléphone et photo de profil. Vous pouvez aussi vous connecter avec Google." },
  { t: "Parcourir les annonces", d: "Sur la page d'accueil, faites défiler les annonces ou filtrez par catégorie et par ville." },
  { t: "Rechercher un produit", d: "Utilisez la barre « Que recherchez-vous ? » pour trouver un article précis, ou recherchez une boutique par son nom." },
  { t: "Contacter un vendeur", d: "Sur la page d'une annonce, appuyez sur Appel, WhatsApp ou Message privé pour entrer en contact." },
  { t: "Publier une annonce", d: "Appuyez sur ➕ Poster, remplissez le titre, le prix, la description, ajoutez des photos puis publiez." },
  { t: "Publier un Short (vidéo)", d: "Allez dans Shorts puis appuyez sur Publier pour téléverser une courte vidéo de votre produit (10 Mo max)." },
  { t: "Publier une offre d'emploi", d: "Dans le menu, choisissez « Offre d'emploi » puis Publier : ajoutez juste un titre, une description, vos numéros et une image." },
  { t: "Gérer mes annonces", d: "Dans Mon compte → Tableau de bord, modifiez, renouvelez ou supprimez vos annonces." },
  { t: "Messages", d: "Toutes vos conversations sont dans 💬 Messages. Vous pouvez archiver ou supprimer une conversation, ou supprimer un message." },
  { t: "Favoris & abonnements", d: "Ajoutez aux favoris les annonces qui vous plaisent et abonnez-vous aux boutiques pour suivre leurs nouveautés." },
];

function AidePage() {
  return (
    <SiteLayout>
      <h1 style={{ marginTop: 16 }}>Aide — Comment utiliser MaMarketplace</h1>
      <p style={{ color: "#475569" }}>Voici comment profiter au mieux de la plateforme.</p>

      <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
        {STEPS.map((s, i) => (
          <div key={s.t} style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 14 }}>
            <div style={{ fontWeight: 700, marginBottom: 4 }}>{i + 1}. {s.t}</div>
            <div style={{ color: "#475569", fontSize: "0.92rem" }}>{s.d}</div>
          </div>
        ))}
      </div>

      <h2 style={{ marginTop: 24 }}>Besoin d'aide ?</h2>
      <ul style={{ lineHeight: 1.9 }}>
        <li>📱 <a href="tel:+242064223575">+242 06 422 35 75</a></li>
        <li>✉️ <a href="mailto:liyeyegrace@gmail.com">liyeyegrace@gmail.com</a></li>
        <li>💬 <Link to="/chat">Chat en ligne</Link></li>
      </ul>
    </SiteLayout>
  );
}
