## Changements demandés

### 1. Page Admin — suppression d'annonces individuelles
- Ajouter dans la boutique d'un vendeur (`src/routes/vendeur.$id.tsx` ou `boutique.tsx` selon la route utilisée depuis l'admin) un bouton **Supprimer** par annonce, visible uniquement si l'utilisateur courant est admin (via `useIsAdmin`).
- Nouveau server function `adminDeleteAnnonceById(annonceId)` dans `src/lib/admin.functions.ts` avec vérification du rôle admin puis `DELETE` sur `annonces` (RLS admin ou via `supabaseAdmin`).

### 2. Liste des 150 mots bannis
- Requête `SELECT word FROM banned_words` et affichage complet de la liste dans la réponse (pas de changement de code).

### 3. Page Shorts — bouton "+" personnalisé
- Sur `src/components/SiteLayout.tsx` : détecter la route `/shorts`. Sur cette page, le bouton central "+" de la barre du bas pointe vers un formulaire "Poster un short" (au lieu de `/poster`).
- Style spécifique (icône vidéo) uniquement sur `/shorts`.
- Retirer le bouton "Publier" en haut de `src/routes/shorts.tsx` — la publication se fait uniquement via le "+" de la barre.
- Extraire le formulaire de post d'un short en route dédiée `src/routes/poster-short.tsx` (réutilisation de la logique existante).

### 4. Shorts — lecture différée + swipe TikTok + fond noir
- `src/routes/shorts.tsx` :
  - **Lazy load** : ne monter le `<video>` que pour la vidéo visible ± 1 (IntersectionObserver, `preload="none"` pour les autres).
  - **Swipe court** : remplacer le scroll libre par snap vertical avec seuil bas (~15 % de hauteur ou vitesse) déclenchant `scrollIntoView` sur la vidéo suivante — comportement TikTok.
  - **Fond noir** intégral autour de la vidéo (container `bg-black`, layout plein écran, retirer le fond pêche).

### 5. Indicateur en ligne (point vert/gris) fiable
- Vérifier `src/lib/presence.ts` (seuil 5 min sur `profiles.last_seen_at`).
- Cause probable : `touch_last_seen()` n'est pas appelée assez souvent. Ajouter un appel régulier (toutes les 60s + au focus) dans `AuthProvider` via `supabase.rpc("touch_last_seen")`.
- Auditer tous les endroits qui affichent le point (annonces, boutique, chat, admin, shorts) — s'assurer qu'ils lisent `last_seen_at` du profil et utilisent `isOnline()`.

### 6. Notifications de likes
- Les triggers `notify_annonce_like` et `notify_short_like` existent déjà en base et insèrent dans `notifications`.
- Vérifier que `src/routes/notifications.tsx` :
  - Affiche les types `like_annonce` et `like_short` avec le nom de l'auteur.
  - Génère un lien cliquable vers `/annonce/$id` ou `/shorts?id=$id`.
- Corriger les libellés/liens manquants si besoin.

### 7. Barre de commentaire — retirer l'avatar
- Dans `src/components/CommentDrawer.tsx` et `src/components/Comments.tsx` : retirer l'avatar de la zone de saisie (garder juste input + bouton envoyer), comme dans le chat.

### 8. Pages statiques (pas de shift horizontal)
- Dans `src/styles.css` : `html, body { overflow-x: hidden; width: 100%; }`, forcer `max-width: 100vw` sur les conteneurs et vérifier les grilles/carousels qui débordent.

### 9. Offres d'emploi — image plein écran zoomable
- Dans `src/routes/offres-emploi.tsx` : clic sur l'image ouvre un `Dialog` plein écran avec l'image et gestes de zoom (pinch tactile + molette + boutons +/−). Utiliser `react-zoom-pan-pinch` (léger, ~10 Ko) ou implémentation CSS `touch-action: none` avec transform.

### Détails techniques
- Aucune migration nécessaire (triggers notifications déjà en place, `last_seen_at` déjà présent).
- Nouvelle dépendance possible : `react-zoom-pan-pinch` pour le zoom.
- Lazy load vidéos via `IntersectionObserver` natif — pas de dépendance ajoutée.
