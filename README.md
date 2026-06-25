# Migracount

Migracount est une PWA de suivi des crises de migraine. Elle permet d'enregistrer chaque crise en quelques étapes, de visualiser son évolution dans le temps, et de garder un historique consultable et filtrable.
Comme ça tu peux bien te rapeler comment t'en a chié ta mère et montrer ça à un fdp de médecin pour qu'il daigne t'aider un peu.

## Fonctionnalités

### Accueil

- Tableau de bord sans défilement, qui s'adapte à l'orientation de l'écran (graphiques en colonnes en mode paysage, en lignes en mode portrait).
- Graphiques de fréquence, d'intensité et d'efficacité des traitements, avec une vue détaillée en plein écran au clic.
- Écran d'accueil dédié tant qu'aucune migraine n'a été enregistrée, avec une explication du concept et un bouton pour commencer.

### Liste des migraines

- Liste sous forme de cartes, avec survol et badges (avortée, nausée, vomissement, aura, localisation).
- Recherche par mot-clé et filtre par mois.

### Formulaire (ajout / modification)

- Assistant en plusieurs étapes (quand, intensité, médicaments, symptômes, localisation/déclencheurs, notes, récapitulatif).
- Sélecteur de date et d'heure personnalisé (calendrier et liste déroulante), avec saisie manuelle possible.
- Barre d'actions fixe en bas (Précédent / Enregistrer / Suivant), boutons grisés plutôt que masqués pour éviter les sauts de mise en page.
- Fermeture du formulaire avec conservation du brouillon, et confirmation avant de perdre des modifications en cours d'édition.
- Récapitulatif final organisé par icônes, qui n'affiche que les champs réellement renseignés.

### Réglages

- Thème Clair / Sombre / Auto (suit le système) / **Migraine**.
- Le mode Migraine applique une palette de couleurs chaude et à contraste réduit, inspirée des recherches sur la photophobie (teinte FL-41, lumière verte apaisante) et désactive toutes les animations.
- Police adaptée à la dyslexie au choix (Lexend ou OpenDyslexic), avec aperçu en direct avant sélection.
- Export et import des données au format JSON.

### Application installable et 100% locale

- Fonctionne hors-ligne (PWA avec mise en cache via Workbox).
- Toutes les données restent sur l'appareil (`localStorage`) — aucune donnée n'est envoyée à un serveur.

## Confidentialité des données

Migracount ne communique avec aucun serveur : il n'y a pas de backend, pas de compte, pas de télémétrie. Toutes les données (crises, médicaments favoris, déclencheurs, préférences) sont stockées dans le `localStorage` du navigateur.

Pour changer d'appareil ou faire une sauvegarde, utilisez l'export JSON dans Réglages → Export, et l'import correspondant sur le nouvel appareil.

## Stack technique

- [Vue 3](https://vuejs.org/) (`<script setup>`) + [TypeScript](https://www.typescriptlang.org/)
- [Pinia](https://pinia.vuejs.org/) pour la gestion d'état
- [Vue Router](https://router.vuejs.org/)
- [Chart.js](https://www.chartjs.org/) via [vue-chartjs](https://vue-chartjs.org/)
- [Vite](https://vitejs.dev/) + [vite-plugin-pwa](https://vite-pwa-org.netlify.app/)
- [Vitest](https://vitest.dev/) pour les tests unitaires

## Installation & lancement

```bash
npm install        # installe les dépendances

npm run dev        # lance le serveur de développement
npm run build       # vérifie les types puis construit la version de production
npm run preview     # prévisualise la version de production construite
npm run test         # lance les tests unitaires (Vitest)
npm run icons        # régénère les icônes de la PWA à partir de l'asset source
```

## Structure du projet

```
src/
├── assets/             # images et icônes sources
├── components/         # composants Vue réutilisables (cartes, champs date/heure, modales...)
│   ├── charts/          # graphiques (fréquence, intensité, efficacité)
│   └── MigraineForm/    # étapes de l'assistant d'ajout/modification
├── router/             # configuration des routes (Accueil, Liste, Réglages)
├── storage/            # accès au localStorage (repository des migraines, helpers JSON)
├── stores/             # stores Pinia (migraines, médicaments favoris, déclencheurs, réglages)
├── styles/             # thème CSS (palettes clair/sombre/migraine), polices, styles partagés du formulaire
├── types/              # types TypeScript partagés
├── utils/              # fonctions pures (dates, statistiques, calendrier, filtres...)
└── views/              # pages de l'application (Accueil, Liste, Réglages)
```
