import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout } from "@/components/SiteLayout";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Politique de confidentialité — MMP Shop" },
      { name: "description", content: "Comment MMP Shop collecte, utilise et protège vos données personnelles." },
      { property: "og:title", content: "Politique de confidentialité — MMP Shop" },
      { property: "og:description", content: "Vos données sur MMP Shop : ce que nous collectons, pourquoi, et vos droits." },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <SiteLayout>
      <div style={{ maxWidth: 780, margin: "0 auto", padding: "16px 4px", lineHeight: 1.7 }}>
        <h1>Politique de confidentialité</h1>
        <p style={{ color: "#64748b" }}>Dernière mise à jour&nbsp;: {new Date().toLocaleDateString("fr-FR")}</p>

        <h2>1. Qui sommes-nous ?</h2>
        <p>
          MMP Shop (MaMarketplace E-Shop) est une plateforme d'annonces en ligne. Nous respectons
          votre vie privée et nous engageons à protéger vos données personnelles.
        </p>

        <h2>2. Données que nous collectons</h2>
        <ul>
          <li><strong>Compte&nbsp;:</strong> nom, prénom, e-mail, numéro de téléphone, WhatsApp (optionnel), date de naissance ou année de création d'entreprise, genre, photo de profil / logo.</li>
          <li><strong>Annonces et shorts&nbsp;:</strong> titre, description, prix, ville, catégorie, photos, vidéos.</li>
          <li><strong>Messagerie&nbsp;:</strong> messages échangés avec d'autres utilisateurs, pièces jointes, messages vocaux.</li>
          <li><strong>Utilisation&nbsp;:</strong> vues d'annonces, likes, favoris, abonnements, évaluations, dernière activité.</li>
          <li><strong>Technique&nbsp;:</strong> identifiant de session anonyme, langue, thème choisi.</li>
        </ul>

        <h2>3. Pourquoi nous les utilisons</h2>
        <ul>
          <li>Faire fonctionner votre compte et vos annonces.</li>
          <li>Permettre la mise en relation acheteur ↔ vendeur.</li>
          <li>Afficher un statut «&nbsp;en ligne&nbsp;», les vues et les likes.</li>
          <li>Modérer les contenus (filtre de mots interdits, signalements).</li>
          <li>Améliorer la Plateforme et prévenir la fraude.</li>
        </ul>

        <h2>4. Ce que nous ne faisons pas</h2>
        <ul>
          <li>Nous <strong>ne vendons pas</strong> vos données personnelles à des tiers.</li>
          <li>Nous ne partageons pas votre e-mail ou votre date de naissance avec les autres utilisateurs.</li>
          <li>Nous n'exploitons pas vos messages privés à des fins publicitaires.</li>
        </ul>

        <h2>5. Ce qui est visible publiquement</h2>
        <p>
          Sur les annonces publiques&nbsp;: votre pseudo/prénom, votre photo de profil, votre boutique,
          vos évaluations, et vos annonces. Le numéro de téléphone / WhatsApp d'une annonce n'est
          affiché qu'aux utilisateurs connectés.
        </p>

        <h2>6. Sécurité et arnaques</h2>
        <p style={{ background: "#fff7ed", border: "1px solid #fed7aa", padding: 12, borderRadius: 8 }}>
          MMP Shop met en œuvre des mesures raisonnables (RLS base de données, filtres de contenu,
          modération) pour protéger vos données. Toutefois, la Plateforme n'intervient pas dans les
          transactions et <strong>décline toute responsabilité en cas d'arnaque, de vol ou de litige</strong>
          entre utilisateurs. Voir aussi les <a href="/conditions">Conditions d'utilisation</a>.
        </p>

        <h2>7. Conservation</h2>
        <p>
          Vos données sont conservées tant que votre compte est actif. Vous pouvez supprimer votre
          compte à tout moment depuis Mon compte&nbsp;→&nbsp;Paramètres. La suppression entraîne
          l'effacement de vos annonces, shorts, commentaires et messages.
        </p>

        <h2>8. Vos droits</h2>
        <ul>
          <li>Accéder à vos données et les corriger depuis votre profil.</li>
          <li>Supprimer votre compte.</li>
          <li>Vous opposer au traitement en nous contactant.</li>
        </ul>

        <h2>9. Cookies et stockage local</h2>
        <p>
          Nous utilisons le stockage local du navigateur pour&nbsp;: session de connexion, thème,
          langue, identifiant de session anonyme (pour les vues d'annonces). Aucun cookie
          publicitaire tiers n'est déposé.
        </p>

        <h2>10. Mineurs</h2>
        <p>La Plateforme n'est pas destinée aux moins de 16 ans.</p>

        <h2>11. Modifications</h2>
        <p>
          Cette politique peut évoluer. La version en vigueur est celle affichée sur cette page.
        </p>

        <h2>12. Contact</h2>
        <p>
          Pour toute question relative à vos données&nbsp;:
          {" "}<a href="mailto:liyeyegrace@gmail.com">liyeyegrace@gmail.com</a>
        </p>
      </div>
    </SiteLayout>
  );
}
