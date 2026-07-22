import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout } from "@/components/SiteLayout";

export const Route = createFileRoute("/conditions")({
  head: () => ({
    meta: [
      { title: "Conditions d'utilisation — MMP Shop" },
      { name: "description", content: "Conditions générales d'utilisation de MMP Shop / MaMarketplace E-Shop." },
      { property: "og:title", content: "Conditions d'utilisation — MMP Shop" },
      { property: "og:description", content: "Règles, droits et responsabilités sur MMP Shop." },
    ],
  }),
  component: ConditionsPage,
});

function ConditionsPage() {
  return (
    <SiteLayout>
      <div style={{ maxWidth: 780, margin: "0 auto", padding: "16px 4px", lineHeight: 1.7 }}>
        <h1>Conditions d'utilisation</h1>
        <p style={{ color: "#64748b" }}>Dernière mise à jour&nbsp;: {new Date().toLocaleDateString("fr-FR")}</p>

        <h2>1. Présentation</h2>
        <p>
          MMP Shop (MaMarketplace E-Shop, ci-après «&nbsp;la Plateforme&nbsp;») est une plateforme
          communautaire d'annonces et de mise en relation entre acheteurs et vendeurs, principalement
          au Congo-Brazzaville. La Plateforme <strong>n'est ni un vendeur, ni un acheteur, ni un
          intermédiaire de paiement</strong>. Elle se limite à fournir un espace de publication
          d'annonces, de messagerie et de découverte de produits ou services.
        </p>

        <h2>2. Acceptation</h2>
        <p>
          En créant un compte, en publiant une annonce, en envoyant un message ou simplement en
          naviguant sur la Plateforme, vous acceptez sans réserve les présentes conditions ainsi que
          notre <a href="/privacy">politique de confidentialité</a>. Si vous n'acceptez pas ces
          termes, vous devez cesser immédiatement d'utiliser la Plateforme.
        </p>

        <h2>3. Inscription et compte</h2>
        <ul>
          <li>Vous devez avoir au moins 16 ans pour un compte personnel.</li>
          <li>Les comptes entreprise doivent correspondre à une activité réelle et vérifiable.</li>
          <li>Vous êtes seul responsable de la confidentialité de votre mot de passe et de toute activité effectuée depuis votre compte.</li>
          <li>Un seul compte par personne. La Plateforme peut suspendre les comptes multiples, faux ou usurpés.</li>
        </ul>

        <h2>4. Contenu publié par les utilisateurs</h2>
        <p>
          Vous êtes <strong>entièrement responsable</strong> des annonces, photos, vidéos (shorts),
          commentaires, messages et tout autre contenu que vous publiez. Sont notamment interdits&nbsp;:
        </p>
        <ul>
          <li>Produits illégaux, contrefaits, volés, dangereux, ou soumis à autorisation sans autorisation valide (armes, drogues, médicaments, faune protégée, etc.).</li>
          <li>Contenus à caractère pornographique, pédopornographique, haineux, discriminatoires, diffamatoires ou incitant à la violence.</li>
          <li>Escroqueries, ventes pyramidales, faux prix, fausses promotions, «&nbsp;dropshipping&nbsp;» trompeur.</li>
          <li>Publications répétitives, spam, liens vers des sites malveillants.</li>
          <li>Utilisation de la messagerie pour du harcèlement ou de la sollicitation abusive.</li>
        </ul>
        <p>
          La Plateforme peut retirer sans préavis toute annonce ou tout contenu contraire à ces
          règles, aux lois en vigueur ou à la moralité publique, et suspendre le compte fautif.
        </p>

        <h2>5. Transactions entre utilisateurs — Décharge de responsabilité</h2>
        <p style={{ background: "#fff7ed", border: "1px solid #fed7aa", padding: 12, borderRadius: 8 }}>
          <strong>Important&nbsp;:</strong> toutes les transactions (paiement, livraison, remise du
          produit, garantie, service après-vente) se déroulent <strong>exclusivement entre l'acheteur
          et le vendeur</strong>. MMP Shop n'intervient à aucun moment dans la transaction et ne
          perçoit aucun paiement. En conséquence&nbsp;:
        </p>
        <ul>
          <li>La Plateforme <strong>ne peut être tenue responsable</strong> d'aucune arnaque, vol,
          perte financière, produit défectueux, non-conforme ou non livré, ni d'aucun litige survenant
          entre utilisateurs à la suite d'une prise de contact réalisée via la Plateforme.</li>
          <li>Si vous êtes victime d'une arnaque, cela relève exclusivement de votre relation avec
          l'autre partie et, le cas échéant, des autorités compétentes (police, justice).</li>
          <li>La Plateforme peut coopérer avec les autorités sur réquisition légale, mais ne
          remplace ni les forces de l'ordre ni les tribunaux.</li>
        </ul>

        <h2>6. Conseils de sécurité</h2>
        <ul>
          <li>Rencontrez le vendeur dans un lieu public et fréquenté.</li>
          <li>Vérifiez toujours le produit <em>avant</em> tout paiement.</li>
          <li>Méfiez-vous des prix anormalement bas, des demandes d'acompte, des paiements Mobile Money vers un numéro inconnu, ou des «&nbsp;frais de dossier&nbsp;» avant livraison.</li>
          <li>Ne communiquez jamais vos codes de confirmation (Mobile Money, banque, e-mail).</li>
          <li>Signalez toute annonce ou tout compte suspect via la page Aide.</li>
        </ul>

        <h2>7. Propriété intellectuelle</h2>
        <p>
          Vous garantissez détenir les droits sur les images, vidéos et textes que vous publiez.
          En publiant, vous accordez à MMP Shop une licence non-exclusive, gratuite et mondiale
          pour afficher ces contenus dans le cadre du fonctionnement de la Plateforme.
        </p>

        <h2>8. Suspension et suppression de compte</h2>
        <p>
          La Plateforme se réserve le droit de suspendre ou supprimer, sans préavis ni indemnité,
          tout compte violant les présentes conditions, tenant des propos abusifs, ou soupçonné de
          fraude. Vous pouvez également supprimer votre compte à tout moment depuis Mon compte.
        </p>

        <h2>9. Limitation de responsabilité</h2>
        <p>
          La Plateforme est fournie «&nbsp;telle quelle&nbsp;». Nous ne garantissons ni la
          disponibilité continue, ni l'exactitude des annonces, ni l'honnêteté des utilisateurs.
          Dans toute la mesure autorisée par la loi, MMP Shop décline toute responsabilité pour
          les dommages directs ou indirects liés à l'utilisation de la Plateforme.
        </p>

        <h2>10. Modification</h2>
        <p>
          Les présentes conditions peuvent être modifiées à tout moment. La version en vigueur
          est celle affichée sur cette page. L'utilisation continue de la Plateforme après
          modification vaut acceptation des nouvelles conditions.
        </p>

        <h2>11. Contact</h2>
        <p>Pour toute question&nbsp;: <a href="mailto:liyeyegrace@gmail.com">liyeyegrace@gmail.com</a></p>
      </div>
    </SiteLayout>
  );
}
