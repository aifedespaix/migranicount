# Analytics Umami — Design

## Contexte

Migracount déclare actuellement dans sa politique de confidentialité (`src/content/legal.mjs`, section « Cookies et traceurs ») n'utiliser **aucun** outil d'analytics. On ajoute Umami (self-hosted, `analytics.aifedespaix.com`), qui rend cette section fausse. Il faut :

1. Intégrer le script Umami proprement (perf + SEO).
2. Mettre à jour la politique de confidentialité pour refléter la réalité.
3. Décider si un bandeau cookie est nécessaire, et l'implémenter si oui — de façon non intrusive et cohérente avec le thème clair/sombre/migraine existant.

## Décision légale : pas de bandeau de consentement bloquant

Umami self-hosted, configuré sans cookie, sans identifiant persistant (hash de visiteur salé qui tourne quotidiennement), sans partage à des tiers et sans croisement inter-sites, rentre dans les critères d'exemption de la CNIL pour les outils de mesure d'audience (même logique que Google Analytics « exemption » ou Matomo sans cookie). **Aucun consentement préalable n'est donc légalement requis.**

Cela dit, vu la sensibilité du contexte (application de suivi de santé), on va au-delà du minimum légal : notice de transparence non bloquante + opt-out facile, plutôt qu'un silence total.

## Composants

### 1. `src/lib/analytics.ts` (nouveau)

Module sans dépendance Vue, responsable uniquement d'injecter/retirer le tag `<script>` Umami dans `<head>` :

```html
<script
  defer
  src="https://analytics.aifedespaix.com/script.js"
  data-website-id="f547cada-5c09-478b-9f5a-4df4befe7e48"
  data-domains="migracount.aifedespaix.com"
  data-do-not-track="true"
  data-exclude-search="true"
  id="umami-analytics"
></script>
```

- `data-domains` : la mesure ne tourne que sur le domaine canonique — dev/preview/localhost ne polluent jamais les stats, sans avoir besoin d'un `if (import.meta.env.PROD)`.
- `data-do-not-track` : respecte le réglage navigateur « Ne pas me pister ».
- `data-exclude-search` : les query strings (tokens, paramètres de partage éventuels) ne sont jamais envoyés à Umami.
- Umami gère nativement le SPA tracking (patch de `pushState`/`popState`) — aucun appel manuel de pageview requis pour Vue Router.

Fonctions exposées : `enableAnalytics()` (injecte le tag s'il est absent) et `disableAnalytics()` (le retire s'il est présent). Idempotentes.

### 2. Réglage utilisateur : `useSettingsStore`

Ajout de `analyticsEnabled: boolean` (défaut `true`) à `SettingsState`, avec `setAnalyticsEnabled(v: boolean)` suivant le même pattern de persistance locale que `setTheme`/`setDyslexicFont` (localStorage via `persist()`).

Contrairement à `theme`/`dyslexicFont`, ce réglage n'est **pas** propagé via `enqueue({ type: 'preferences-patch', ... })` : c'est une préférence de mesure d'audience propre à cet appareil/navigateur (on ne veut pas qu'un opt-out sur un appareil réactive le tracking sur un autre via la sync), donc pas touché à `useSync.ts`/`applyFromSync`.

### 3. `useAnalytics()` composable

Appelé une fois depuis `App.vue` (à côté de `useSettingsStore()` déjà présent ligne 42). Un `watchEffect` sur `settings.analyticsEnabled` appelle `enableAnalytics()` ou `disableAnalytics()`.

### 4. Notice de transparence : `AnalyticsNotice.vue` (nouveau composant)

- Affichée une seule fois (flag `localStorage` dédié, ex. `migracount-analytics-notice-seen`), seulement si `settings.analyticsEnabled` est vrai et que le flag est absent.
- Non bloquante : barre fine ancrée en bas de l'écran (au-dessus de `BottomNav` sur mobile / en bas à droite en carte flottante sur desktop), z-index sous les modales.
- Contenu : phrase courte expliquant l'usage de statistiques anonymes sans cookie, un lien « En savoir plus » vers `/confidentialite/`, un bouton « Désactiver » (appelle `setAnalyticsEnabled(false)` + marque la notice vue) et une croix de fermeture (marque juste la notice vue, sans désactiver).
- Style thémé via les variables CSS existantes (`--color-surface`, `--color-accent`, `--color-muted`), transition d'entrée respectant `prefers-reduced-motion`.
- Montée dans `App.vue` à côté de `ToastContainer`.

### 5. `SettingsView.vue`

Nouvelle section « Confidentialité » avec un toggle « Statistiques anonymes » (même style pill/bouton que le thème), décrivant brièvement l'outil et renvoyant vers la politique de confidentialité.

### 6. `src/content/legal.mjs` — section 5 réécrite

Remplace le texte actuel (« aucun outil d'analytics ») par une description honnête : Umami auto-hébergé, aucun cookie, identifiant visiteur haché et renouvelé quotidiennement (non persistant), aucune donnée de santé concernée, aucun partage à des tiers, respect du Do Not Track, et mention de l'endroit où désactiver (Réglages).

## Ce qui ne change pas

- `scripts/prerender.mjs` et `index.html` : pas de tag statique ajouté ici — l'injection se fait en JS après montage de l'app, donc le comportement est identique sur toutes les routes (y compris les pages pré-rendues) une fois l'hydratation Vue effectuée.
- Pas de variable d'environnement pour le website-id : c'est une valeur publique non sensible, cohérente avec les constantes déjà en dur (`SITE_URL` dans `useHead.ts`/`prerender.mjs`).

## Tests

- `settings.test.ts` : ajout de cas pour `analyticsEnabled` (défaut, persist, toggle) suivant les tests existants pour `theme`/`dyslexicFont`.
- Vérification manuelle en dev : notice affichée une fois, toggle Réglages ajoute/retire bien le tag `<script>` du DOM, rendu correct en clair/sombre/migraine.
