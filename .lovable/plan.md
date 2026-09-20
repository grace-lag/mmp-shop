# Personnalisation de l’arrière-plan

## Résultat attendu
- Ajouter dans « Paramètres du site » un bouton « Personnaliser l’arrière-plan du site », disponible pour tous les comptes, administrateurs compris.
- Ouvrir un panneau permettant de choisir :
  - l’arrière-plan par défaut ;
  - une couleur personnalisée ;
  - une image importée depuis l’appareil.
- Afficher un aperçu avant application et proposer « Appliquer » et « Réinitialiser ».

## Comportement
- Le choix sera personnel et conservé sur l’appareil de l’utilisateur, sans modifier l’apparence des autres utilisateurs.
- Les changements seront appliqués immédiatement sur toutes les pages et resteront après fermeture du site.
- Le mode clair/sombre continuera de fonctionner ; « Par défaut » retrouvera automatiquement l’arrière-plan adapté au thème.
- L’image sera limitée à un format léger, vérifiée puis compressée avant stockage pour préserver la vitesse du site. Les formats acceptés seront JPEG, PNG et WebP.

## Détails techniques
- Étendre le gestionnaire d’apparence existant pour appliquer une couleur ou une image via des variables globales.
- Ajouter une petite fenêtre de personnalisation dans la page des paramètres, avec sélecteur de couleur et import d’image.
- Stocker les préférences avec les protections déjà utilisées pour les navigateurs privés et intégrés.
- Ajouter les styles nécessaires, puis vérifier le rendu sur mobile et ordinateur ainsi que la compilation.
