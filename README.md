# Migracount

Application PWA de suivi personnel des crises de migraine. Fonctionne entièrement en local, avec synchronisation serveur optionnelle via compte Google.

## Fonctionnalités

### Accueil / Dashboard
- Résumé : dernière crise, durée moyenne, crises ce mois-ci.
- Graphiques interactifs : fréquence et intensité par jour / semaine / mois.
- Vue détaillée au clic sur chaque graphique.

### Liste des migraines
- Liste chronologique avec recherche par mot-clé et filtre par mois.
- Édition d'une migraine existante en cliquant dessus.

### Formulaire de saisie
- Stepper en 8 étapes : Quand, Intensité, Médicaments, Symptômes, Localisation, Déclencheurs, Notes, Récapitulatif.
- Navigation par boutons ou par swipe gauche/droite.
- Sauvegarde automatique du brouillon en cours de saisie.

### Réglages
- Thème : Clair, Sombre, Auto (système), Mode Migraine (palette douce, animations désactivées).
- Police : Normale, Lexend, OpenDyslexic.
- Export / Import des données au format JSON.

### Synchronisation (optionnelle)
- Connexion via compte Google (OAuth2).
- Les données sont synchronisées sur un serveur PocketBase hébergé (`api-migracount.aifedespaix.com`).
- Fusion intelligente à la connexion : `localStorage` + données serveur, le plus récent gagne.
- Synchronisation temps réel entre appareils tant que la session est active.
- Déconnexion conserve les données locales.

### PWA & Offline
- Installable sur mobile et desktop.
- Fonctionne hors-ligne après le premier chargement.
- Les données sont stockées localement dans `localStorage` (fonctionnement garanti sans connexion).
- Si connecté, les données sont aussi synchronisées côté serveur.

## Stack technique

| Couche | Technologie |
|--------|-------------|
| Framework | Vue 3 (Composition API, `<script setup>`) |
| Bundler | Vite + TypeScript |
| État | Pinia |
| Routing | Vue Router |
| Graphiques | Chart.js + vue-chartjs |
| Icônes | lucide-vue-next |
| Swipe | @vueuse/core (`useSwipe`) |
| PWA | vite-plugin-pwa (Workbox) |
| Backend sync | PocketBase (self-hosted) |
| Auth | Google OAuth2 (via PocketBase) |
| Tests | Vitest |

## Installation & lancement

```bash
npm install        # Installer les dépendances
npm run dev        # Serveur de développement (http://localhost:5173)
npm run build      # Build de production
npm run preview    # Prévisualiser le build
npm run test       # Lancer les tests unitaires
npm run icons      # Regénérer les icônes PWA depuis src/assets/logo.svg
```

## Structure du projet

```
src/
├── main.ts                  # Point d'entrée (Pinia, Router, styles globaux)
├── App.vue                  # Shell : Header, BottomNav, RouterView, Toasts
├── router/index.ts          # 3 routes : /, /liste, /settings
├── types/migraine.ts        # Types partagés (Migraine, MedocPris, MedocFavori)
├── storage/
│   ├── storage.ts           # Wrapper localStorage (getJSON/setJSON)
│   └── migraineRepository.ts # CRUD migraines, favoris médicaments, déclencheurs
├── stores/                  # Stores Pinia (migraines, medocsFavoris, declencheurs, settings, toast)
├── utils/
│   ├── date.ts              # Formatage et manipulation de dates/heures
│   ├── stats.ts             # Calculs statistiques (fréquence, intensité, durée, efficacité)
│   ├── text.ts              # Helpers texte (capitalizeFirstLetter)
│   └── ...                  # Autres utilitaires (uuid, localisation, filtres)
├── components/
│   ├── HeaderNav.vue        # Barre du haut (desktop + mobile)
│   ├── BottomNav.vue        # Navigation bas (mobile uniquement)
│   ├── MigraineForm/        # Formulaire 8 étapes + draft
│   ├── charts/              # FrequencyChart, IntensityChart, ChartDetailModal
│   └── ...                  # Autres composants (MigraineListItem, ToastContainer, …)
├── views/
│   ├── StatsView.vue        # Page dashboard / statistiques
│   ├── ListView.vue         # Page liste des migraines
│   └── SettingsView.vue     # Page réglages
└── styles/                  # CSS global (theme, form, fonts)
```

## Confidentialité des données

Par défaut, Migracount ne transmet aucune donnée. Tout est stocké dans `localStorage` du navigateur, sur l'appareil uniquement.

**Synchronisation optionnelle :** si vous vous connectez avec votre compte Google, vos données sont chiffrées en transit et stockées sur un serveur PocketBase auto-hébergé (`api-migracount.aifedespaix.com`). La connexion est strictement personnelle — chaque utilisateur n'accède qu'à ses propres données. La déconnexion stoppe la sync ; le `localStorage` reste intact.

L'export JSON (page Réglages) génère un fichier local téléchargé sur l'appareil. L'import remplace les données actuelles par le contenu du fichier importé.
