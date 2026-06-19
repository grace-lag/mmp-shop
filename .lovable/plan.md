# Portage de `new_program` → Lovable

Objectif : porter toute la marketplace (sauf le panier) sur la stack Lovable, en gardant le look actuel (`style.css` réutilisé).

## Étape 1 — Fondations

1. Activer **Lovable Cloud** (Postgres + auth + storage).
2. Copier `style.css` du repo dans `src/styles.css` (en plus des tokens Tailwind existants) pour conserver le look.
3. Copier les assets nécessaires de `images/` vers `src/assets/`.
4. Créer un layout commun (header + nav + footer) basé sur le HTML actuel dans `src/routes/__root.tsx` ou un layout dédié.

## Étape 2 — Base de données (Lovable Cloud)

Tables à créer (calquées sur `backend/app.py`, sans `cart_items`) :

- `profiles` (id = auth.user.id, nom, prenom, genre, tel, email, created_at)
- `user_roles` (user_id, role enum: admin/user) + fonction `has_role`
- `annonces` (id, title, description, price, city, category, seller_id, phone, whatsapp, image_url, created_at)
- `favorites` (id, user_id, annonce_id)
- `orders` (id, user_id, annonce_id, quantity, created_at)
- `messages` (id, sender_id, receiver_id, annonce_id, content, created_at) pour le chat
- Bucket storage `annonces-images` pour les photos

Avec RLS + GRANT corrects sur chaque table.

## Étape 3 — Pages (routes TanStack)

Mapping HTML → routes (panier retiré) :

| HTML original | Route |
|---|---|
| accueil_public.html | `/` |
| Boutique.html | `/boutique` |
| categories.html | `/categories` |
| details.html | `/annonce/$id` |
| plus_annonces.html | `/annonces` |
| poster_annonce.html | `/poster` (auth) |
| profil_vendeur.html | `/vendeur/$id` |
| compte.html | `/login` + `/signup` |
| parametres.html | `/parametres` (auth) |
| historique.html | `/historique` (auth) |
| dashboard.html | `/dashboard` (auth, vendeur) |
| admin.html | `/admin` (auth, role admin) |
| chat.html | `/chat` (auth) |
| autres_options.html | `/options` |
| conditions.html | `/conditions` |
| mentions_legales.html | `/mentions-legales` |
| privacy.html | `/privacy` |

## Étape 4 — Logique métier

- Auth Lovable Cloud (email/password + Google) → remplace `/auth/register` et `/auth/login` de FastAPI.
- Server functions (`createServerFn`) pour : créer/modifier/supprimer une annonce, lister, filtrer par catégorie/ville, ajouter/retirer favori, créer commande, envoyer message, gérer admin (liste users, suppression).
- Upload d'images → Lovable Cloud Storage (bucket public `annonces-images`).
- Chat → table `messages` + polling toutes les 3s (ou Realtime Supabase plus tard).

## Étape 5 — Approche d'exécution

Vu l'ampleur (~17 routes, 7 tables, auth, storage, chat), je vais procéder par vagues pour livrer du fonctionnel rapidement :

1. **Vague 1** : Cloud activé + schéma DB + auth + layout + page d'accueil + boutique + détail annonce + poster annonce. (cœur marketplace utilisable)
2. **Vague 2** : Favoris, profil vendeur, compte/paramètres, historique, dashboard vendeur.
3. **Vague 3** : Chat, admin, catégories, pages légales/secondaires.

Tu vois le résultat se construire au fur et à mesure et peux ajuster entre chaque vague.

## Détails techniques

- Stack : TanStack Start v1 + React 19 + Tailwind v4 + Lovable Cloud (Supabase managé).
- `style.css` original chargé tel quel via import dans `__root.tsx`, en parallèle des design tokens existants — quelques ajustements mineurs pour cohabiter avec Tailwind.
- Pas de migration des données de `mamarketplace.db` (confirmé).
- Pas de page `/panier` (confirmé).
- Server functions appellent Supabase via `requireSupabaseAuth` quand auth requise.
- Storage public pour les images d'annonces, signature côté serveur pour l'upload.

## Question de cadrage rapide

Pour l'auth : **email/password seul** ou **email/password + Google sign-in** ? (Google sign-in est dispo nativement dans Lovable Cloud et améliore la conversion — je pars là-dessus par défaut sauf si tu préfères email seul.)
