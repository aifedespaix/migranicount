# Design — Sync multi-device, profil, auth header, filtres

**Date :** 2026-06-27  
**Périmètre :** 7 points d'amélioration groupés

---

## 1. Fix réactivité bouton auth header (points 3, 4, 5)

### Problème
`isLoggedIn = computed(() => pb.authStore.isValid)` lit une propriété non-réactive Vue. Le computed ne se réévalue jamais après connexion/déconnexion sans reload de page.

### Fix
Dans `src/stores/auth.ts`, dériver `isLoggedIn` depuis `user.value` (réactif via `onChange`) :

```ts
const isLoggedIn = computed(() => user.value !== null)
```

### Bouton "Se connecter" (point 4)
Remplacer l'icône nuage neutre (Cloud gris) par un bouton texte **"Se connecter"** stylé avec `color-accent`. Cohérent avec les CTAs existants de l'app.

### Comportement attendu
- Connexion → le header passe immédiatement en mode avatar+menu sans reload
- Déconnexion → le header repasse immédiatement en mode "Se connecter" sans reload

---

## 2. Page Profil — scroll et redesign UI (points 1 et 2)

### Scroll (point 1)
Ajouter `overflow-y: auto` sur `.profile-view`. Le parent `app-main` garde `overflow: hidden`, la vue scrolle elle-même.

### Redesign card-based (point 2)
Via le skill `ui-ux-pro-max`. Structure cible :

- **En-tête** : avatar centré (initiale), nom + email en dessous, date membre en sous-texte muted
- **Section stats** : grille 2×2 de cards, valeur en `color-accent`, label en muted
- **Section sync** : card dédiée "Dernière synchronisation" avec statut + timestamp
- **Zone danger** : en bas, séparée visuellement, boutons outline danger

---

## 3. Sync multi-device complète (point 6)

### Principe général
- **localStorage** = source de vérité locale
- **PocketBase** = source de vérité distante
- Règle de merge en cas de conflit : `localUpdatedAt` (timestamp) gagne

### Collections couvertes
1. `migraines`
2. `medocs_favoris`
3. `symptomes_custom` (nouveau realtime)
4. `declencheurs_favoris` (nouveau realtime)
5. `user_preferences` (thème, police — merge au login uniquement)

### `mergeOnLogin()` — améliorations
- Snapshot avant/après merge sur les 4 collections principales
- Calcul du diff : objets ajoutés, modifiés, supprimés par catégorie
- Passage du diff au système de toasts après merge complet

### `startRealtimeSync()` — extensions
- Ouvre 4 subscriptions PocketBase : `migraines`, `medocs_favoris`, `symptomes_custom`, `declencheurs_favoris`
- À chaque événement `create`/`update`/`delete` :
  - Merge avec le local (timestamp gagne)
  - Mise à jour localStorage + store correspondant
  - Accumulation dans un `syncDiff` accumulateur
- Flush du `syncDiff` après 300ms de silence (debounce) → toasts

### `refreshFromRemote()` — nouveau
- Fetch léger + merge des 4 collections (sans re-login)
- Appelé depuis `App.vue` sur `visibilitychange` quand l'user est connecté

### Logique des toasts de sync
| Cas | Comportement |
|-----|-------------|
| ≤ 3 migraines changées | 1 toast par migraine : "Migraine du JJ/MM ajoutée / modifiée / supprimée" |
| > 3 migraines changées | 1 toast récap : "X migraines synchronisées" |
| ≤ 3 objets catalogue changés | 1 toast par objet : "Ibuprofène ajouté au catalogue" |
| > 3 objets catalogue changés | 1 toast récap : "X éléments du catalogue synchronisés" |

Les objets catalogue regroupent medocs + symptomes + déclencheurs dans un seul compteur pour le seuil.

### `visibilitychange` (App.vue)
Quand l'onglet/app redevient visible et `pb.authStore.isValid` → appel `sync.refreshFromRemote()`.

---

## 4. Filtres ListView — DateField + label recherche (point 7)

### Remplacement des inputs date natifs
- `<input type="date">` remplacé par `<DateField>` custom pour `dateFrom` et `dateTo`
- Labels "Du" / "Au" restent au-dessus, style `.date-range-label`

### Label barre de recherche
- Ajouter un label "Rechercher" au-dessus de l'input keyword
- Même style que les labels "Du"/"Au" (`font-size: 0.7rem`, `color: var(--color-muted)`, `font-weight: 500`)
- Label cliquable via attribut `for` + `id` sur l'input

---

## Ordre d'implémentation suggéré

1. Fix réactivité `isLoggedIn` (auth.ts) — débloque les points 3/4/5
2. Style bouton "Se connecter" (AuthButton.vue)
3. Scroll + redesign profil (ProfileView.vue)
4. Sync realtime étendue + toasts (useSync.ts, App.vue)
5. Filtres ListView (ListView.vue)
