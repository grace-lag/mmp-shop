# Plan d'exécution

Tu as demandé "tout à la fois" — c'est environ 25 changements distincts touchant la base de données, l'auth, le storage, l'UI et la logique métier. Je vais tout faire, mais je dois procéder en 4 phases successives dans **cette même session**, sans m'arrêter entre les phases. Je te ping à la fin avec le résumé global.

## Phase 1 — Fondations base de données (1 migration)
- Table `shorts` (videos) + bucket `shorts-videos` (privé, max 10 Mo)
- Table `banned_words` + fonction `contains_banned_word()` + trigger sur `messages` et `annonce_comments`
- Colonne `is_job_offer` sur `annonces` (formulaire allégé)
- RPC `delete_conversation(other_user_id)`
- RPC `delete_comment_safe(id)` (corrige la suppression cassée)
- Trigger qui force `tel NOT NULL` à la publication d'annonce ou de short
- Vue admin: liste de tous les profils (pas seulement vendeurs)

## Phase 2 — Page d'accueil + navigation
- Barre orange plus fine, fond gris foncé (#a8a8a8), menu hamburger en `position: fixed` z-index élevé
- Menu hamburger nettoyé (suppression Accueil/Catégories/Rechercher/Poster/Tableau de bord, ajout Offres d'emploi)
- Barre "Rechercher une boutique sur MaMarketplace" collée à la barre orange, pleine largeur, redirige vers `/recherche-boutique`
- Ligne de catégories horizontale scrollable
- Carrousel pub pleine largeur incluant le hero, image orange régénérée "MaMarketplace"
- Barre de recherche compactée (padding réduit, bouton loupe icône seule)
- Onglet "Catégories" → "Shorts" (icône vidéo) dans la barre du bas
- Mode invité: annonces visibles sans login, redirection vers `/login` seulement aux actions (like, appel, contact, commenter)
- Annonces propres visibles mais bouton Like masqué
- Badge durée compact (1H/1J/1S) sur chaque carte

## Phase 3 — Shorts, contact, messagerie
- Composant `VideoFeed` (`/shorts`) avec scroll-snap, lazy load (1 vidéo à la fois via IntersectionObserver), boutons Like/Commenter/Contacter en overlay droite, avatar + nom en bas gauche cliquable vers la boutique
- Page `/poster-short` avec validation taille 10 Mo et téléphone obligatoire
- Page `/contacter/$annonceId` avec Appel / WhatsApp (conditionnel) / Message privé
- WhatsApp optionnel partout (poster.tsx, modifier-annonce, complete-profile, parametres) — masqué dans les contacts si vide
- Messagerie: composer `position: sticky bottom: 0`, menu 3 points (changer fond/supprimer/copier/transférer/archiver) — implémentation complète des actions
- Dates sous chaque message
- 3 points par conversation dans la liste → supprimer conversation
- Correction suppression commentaires

## Phase 4 — Admin, dashboard, paramètres, divers
- Admin: liste tous les profils + barre de recherche + clic vers boutique
- Dashboard: grille de carreaux au lieu d'une liste
- Paramètres: thème (clair/sombre/auto) réellement appliqué via `ThemeProvider` + classe sur `<html>`, langue FR/EN via contexte i18n basique, bouton Aide vers `/aide`
- Page `/aide` avec guide d'utilisation
- Détail annonce: point vert "actif"/"inactif" basé sur `last_seen_at` (<5 min), conseils sécurité en bas
- Catégorie "Emploi" retirée, route `/offres-emploi` + formulaire allégé (image + tel + description)
- Splash screen avec logo MaMarketplace E-Shop centré

## Détails techniques
- Compression d'images: hook `compressImage()` (canvas, JPEG 0.8, max 1600px) appliqué à tous les uploads
- Compression vidéo côté serveur impossible (Worker n'a pas ffmpeg) — j'enforce max 10 Mo côté client uniquement
- i18n: contexte React simple avec dictionnaire FR/EN, pas de lib externe
- Thème: classe `dark` sur `<html>`, persisté dans `localStorage`, le CSS existant ajoutera des variantes dark via `prefers-color-scheme` + classe
- Splash: composant React avec timeout 800ms au premier chargement
- Filtre d'insultes: liste de ~150 mots FR (variantes communes) stockée en base, vérification via trigger Postgres

## Avertissement honnête
C'est beaucoup. Certains détails visuels nécessiteront des itérations après que tu vois le résultat. Je vise un état fonctionnel cohérent, pas pixel-perfect du premier coup.

Confirme et je démarre par la Phase 1 (migration). Si tu préfères toujours que je commence par un sous-ensemble plus restreint, dis-le maintenant.