# Migracount - Design Spec

Date: 2026-06-24

## 1. Vue d'ensemble

**Migracount** est une PWA (Progressive Web App) 100% locale pour suivre et analyser les crises de migraine. Aucune donnée n'est envoyée à un serveur : tout est stocké dans le `localStorage` du navigateur. L'app fonctionne hors-ligne après le premier chargement et s'installe comme une app native sur mobile, tablette et desktop.

**Objectif** : permettre une saisie ultra-rapide d'une crise de migraine via un formulaire step-by-step mobile-first, et visualiser des tendances (fréquence, intensité, efficacité des traitements) pour aider l'utilisateur et son médecin à mieux comprendre le pattern des crises.

## 2. Stack technique

- **Framework** : Vue 3 (Composition API) + Vite + TypeScript
- **État global** : Pinia (store `migraines`, store `medocsFavoris`, store `ui`/thème)
- **PWA** : `vite-plugin-pwa` (stratégie `generateSW`, cache-first pour les assets, manifest généré automatiquement)
- **Graphiques** : Chart.js (via `vue-chartjs` ou usage direct), thème clair/sombre synchronisé avec `prefers-color-scheme`
- **Routing** : `vue-router` - 2 routes principales : `/` (Stats) et `/liste` (Liste des crises)
- **Stockage** : couche d'abstraction `storage.ts` au-dessus de `localStorage` (clé namespacée, sérialisation JSON, gestion de version de schéma pour migrations futures)
- **Style** : CSS natif avec variables CSS (custom properties) pilotées par `prefers-color-scheme: dark/light`, pas de framework CSS lourd (Tailwind optionnel si besoin de rapidité - à trancher à l'implémentation)

## 3. Modèle de données

```ts
interface MedocPris {
  id: string; // uuid
  nom: string; // ex: "Doliprane 1000"
  description?: string; // texte libre, ex: "antidouleur", "triptan"
  heure: string; // HH:mm
}

interface Migraine {
  id: string; // uuid
  date: string; // YYYY-MM-DD, date de début de la crise
  heureDebut: string; // HH:mm
  heureFin: string | null; // HH:mm, null si crise en cours
  medocs: MedocPris[]; // 0..n prises de médicaments
  intensite: number; // 1-10
  avortee: boolean; // true si la crise a été stoppée par un médoc
  nausee: boolean;
  vomissement: boolean;
  aura: boolean;
  localisation: "gauche" | "droite" | "bilaterale" | "nuque" | null;
  declencheurs: string[]; // tags libres, ex: ["stress", "sommeil"]
  notes?: string; // texte libre
  createdAt: string; // ISO timestamp, pour tri/debug
  updatedAt: string; // ISO timestamp
}

interface MedocFavori {
  nom: string;
  description?: string;
  usageCount: number; // incrémenté à chaque utilisation, pour trier par fréquence
}
```

### Stockage localStorage

- Clé `migracount:migraines` → `Migraine[]` (JSON)
- Clé `migracount:medocsFavoris` → `MedocFavori[]` (JSON)
- Clé `migracount:declencheursFavoris` → `string[]` (tags custom déjà utilisés, pour autocomplétion)
- Clé `migracount:schemaVersion` → number (pour migrations futures du modèle de données)
- Clé `migracount:draft` → brouillon de formulaire en cours (pour ne pas perdre la saisie si fermeture accidentelle)

### Déclencheurs prédéfinis (liste de départ, extensible)

`stress`, `manque de sommeil`, `règles`, `alcool`, `écrans`, `météo`, `alimentation`, `déshydratation`, `effort physique`, `odeurs fortes`

## 4. Formulaire de saisie (step-by-step)

Déclenché par un bouton flottant "+" (FAB) en bas à droite, visible sur toutes les vues. Ouvre une modale/sheet plein écran avec barre de progression et navigation Précédent/Suivant. Sauvegarde automatique en draft (`migracount:draft`) à chaque changement de champ, pour survivre à une fermeture accidentelle ou un rechargement de page.

**Étape 1 - Quand**

- Date (défaut : aujourd'hui)
- Heure de début (défaut : heure actuelle)
- Heure de fin (optionnelle - bouton "crise en cours", peut être renseignée plus tard via édition)

**Étape 2 - Intensité**

- Slider visuel 1-10, couleur évoluant du jaune (faible) au rouge (sévère)

**Étape 3 - Médicaments**

- Liste de prises ajoutables dynamiquement
- Sélection rapide parmi les médocs favoris (chips triés par `usageCount` décroissant)
- Ou saisie d'un nouveau médoc (nom + description optionnelle) → ajouté aux favoris après la première utilisation
- Chaque prise a sa propre heure
- Bouton "+ ajouter une prise" / suppression d'une prise déjà ajoutée
- Étape skippable si aucun médoc pris

**Étape 4 - Symptômes**

- Toggle nausée (oui/non)
- Toggle vomissement (oui/non)
- Toggle aura visuelle (oui/non)
- Toggle migraine avortée par médoc (oui/non) - désactivé/non pertinent si aucun médoc renseigné à l'étape 3

**Étape 5 - Localisation & déclencheurs**

- Sélection localisation : gauche / droite / bilatérale / nuque / non renseigné (boutons simples)
- Tags déclencheurs : sélection multiple parmi la liste prédéfinie + champ pour ajouter un tag custom (sauvegardé dans `declencheursFavoris` pour réutilisation)

**Étape 6 - Notes**

- Champ texte libre, optionnel, mis en avant (pas caché derrière un "plus d'options")

**Étape 7 - Récapitulatif**

- Résumé de toutes les valeurs saisies
- Bouton "Modifier" rapide vers chaque étape depuis le récap (ou simple bouton retour)
- Bouton "Enregistrer" → écrit dans `migracount:migraines`, vide le draft, ferme la modale

**Règles de validation**

- Champs obligatoires : date, heure de début
- Tous les autres champs sont optionnels (une crise peut être loggée minimalement en 2 étapes si l'utilisateur ferme tôt, mais le flux normal parcourt les 7 étapes)
- Navigation libre entre étapes (pas de blocage), validation finale uniquement à l'enregistrement

## 5. Liste des migraines

- Accessible via la bottom nav bar (mobile/tablette) ou le header (desktop ≥ 1024px)
- Triée par date décroissante (la plus récente en premier)
- Chaque entrée affiche : date, durée, intensité (badge coloré), médocs pris (résumé), icône si avortée
- Clic sur une entrée → vue détail en lecture, avec bouton "Modifier" qui rouvre le formulaire step-by-step pré-rempli sur l'étape 7 (récap) avec accès direct à toutes les étapes
- Édition met à jour `updatedAt`

## 6. Page d'accueil - Statistiques

Vue par défaut au chargement de l'app.

**Cartes résumé (en haut)**

- Dernière crise (ex: "il y a 3 jours")
- Durée moyenne des crises (sur les 3 derniers mois)
- Nombre de crises ce mois-ci

**Graphique 1 - Fréquence des crises**

- Barres : nombre de migraines par mois sur les 12 derniers mois

**Graphique 2 - Évolution de l'intensité moyenne**

- Ligne : intensité moyenne par semaine ou par mois (basculer automatiquement selon la densité de données)

**Graphique 3 - Efficacité des traitements**

- Barres horizontales : pour chaque médoc favori utilisé au moins N fois, % de crises avortées quand ce médoc a été pris
- Aide à identifier quel traitement fonctionne le mieux

Tous les graphiques s'adaptent au thème clair/sombre (couleurs Chart.js pilotées par les variables CSS du thème actif).

## 7. Navigation & responsive

- **Mobile / tablette portrait (< 1024px)** : bottom navigation bar avec 2 entrées (Stats / Liste), swipe horizontal entre les deux vues en complément. Bouton "+" flottant en bas à droite, au-dessus de la bottom bar.
- **Desktop / tablette landscape (≥ 1024px)** : pas de bottom bar. Header avec logo, liens Stats / Liste, bouton export/import, bouton "+" - tous accessibles directement.
- Breakpoint : `1024px`

## 8. Export / Import des données

- Accessible depuis un bouton/menu "Paramètres" (header desktop, ou écran dédié accessible depuis la bottom bar mobile / icône menu)
- **Export** : génère un fichier `.json` téléchargeable contenant `migraines`, `medocsFavoris`, `declencheursFavoris`, `schemaVersion`
- **Import** : sélection d'un fichier `.json`, validation du format, remplacement ou fusion des données existantes (avec confirmation utilisateur avant écrasement)

## 9. Identité visuelle & PWA

- **Nom de l'app** : Migracount
- **Logo** : SVG source - silhouette de tête stylisée avec une onde/spirale de couleur représentant la douleur. Décliné en favicon, icônes PWA (192x192, 512x512, maskable), apple-touch-icon, via un script de build à partir du SVG source.
- **Thème** : variables CSS pilotées par `prefers-color-scheme`. Palette violette/lavande douce en mode clair, déclinaison sombre désaturée en mode sombre (ton apaisant plutôt que clinique).
- **Manifest PWA** : nom "Migracount", `display: standalone`, `theme_color`/`background_color` adaptés à chaque thème.
- **Offline** : `vite-plugin-pwa` avec `generateSW`, cache-first sur tous les assets statiques. Aucune dépendance réseau après le premier chargement - toutes les données et la logique restent locales.

## 10. Hors scope (v1)

- Pas de synchronisation cloud / compte utilisateur
- Pas de notifications/rappels programmés
- Pas d'export PDF formaté pour médecin (peut être une évolution future à partir de l'export JSON)
- Pas de migration vers IndexedDB (localStorage suffisant pour le volume de données attendu, mais la couche d'abstraction `storage.ts` permettra une migration future si besoin)
