# Layout Global — Header, AppBar & Navigation

Domaine 4 sur 6 du lot d'améliorations UI/UX.

## Goals

1. **Header** : icône app + nom, typographie moderne.
2. **Settings dans le Header** : bouton icône-seule (desktop et mobile), retire le lien texte "Réglages" du nav.
3. **Header responsive** : masquer les liens Stats/Liste sur mobile (déjà dans l'AppBar).
4. **Icônes de navigation** : icônes Lucide sur chaque lien du Header (desktop) et de l'AppBar (mobile).
5. **FAB ancré dans l'AppBar** : le bouton "+" se déplace dans la BottomNav (centre), remplace `FabButton.vue` qui est supprimé.
6. **ListView scrollable** : `.list-view` doit être scrollable dans le conteneur `overflow: hidden` de `.app-main`.
7. **Swipe inter-pages** : navigation gauche/droite entre Stats ↔ Liste avec animation slide.

## Architecture

### HeaderNav.vue

**Structure :**
```
[logo-icon img 24px] [logo-text "Migracount"] | nav(desktop only) | [edit-medocs-btn] [settings-btn] [add-btn(desktop only)]
```

- Logo : `<img src="/icons/favicon-32.png" class="logo-icon" />` + `<span class="logo-text">Migracount</span>`. Pas de lien.
- Typographie : `font-size: 1.1rem; font-weight: 700; letter-spacing: -0.02em`.
- Nav (Stats, Liste avec icônes `BarChart2`, `List`) : visible uniquement `@media (min-width: 1024px)`.
- Settings : toujours visible, bouton icône-seule (`Settings` lucide), navigue via `router.push({ name: 'settings' })`.
- "+ Ajouter" : visible uniquement `@media (min-width: 1024px)`.
- Sur mobile : logo + edit-medocs-btn + settings-btn (pas de nav, pas de add-btn).

### BottomNav.vue

**Structure :** 3 items flex sur toute la largeur.
```
[Stats icon+label] | [+ bouton central surélevé] | [Liste icon+label]
```

- Stats : `<RouterLink>` avec `BarChart2` icône + label "Stats".
- + central : `<button class="fab-center">` qui émet `add`. Visuellement : fond `--color-accent`, texte `--color-accent-contrast`, taille légèrement plus grande (2rem), border-radius pill, légèrement surélevé (`box-shadow`). PAS un RouterLink.
- Liste : `<RouterLink>` avec `List` icône + label "Liste".
- `defineEmits<{ add: [] }>()`.

### FabButton.vue

Supprimé. App.vue l'importait via `<FabButton @click="formOpen = true" />` → remplacé par écoute de `<BottomNav @add="openForm" />`.

### App.vue

- Supprimer import + usage de `FabButton`.
- `<BottomNav @add="openForm" />`.
- Ajouter `useSwipe` sur la ref `.app-main` pour la navigation inter-pages.
- Wraper `<RouterView>` dans `<RouterView v-slot="{ Component }"><Transition :name="pageTransition"><component :is="Component" :key="$route.name" /></Transition></RouterView>`.
- `pageTransition: Ref<'slide-next' | 'slide-prev'>` géré par le handler du swipe.
- Routes swipables (ordre) : `{ stats: 0, liste: 1 }`. Settings (index -1) ne participe pas au swipe.
- `.app-main` doit avoir `position: relative` pour contenir la transition absolue des pages.

**CSS de transition de pages** (dans `App.vue` `<style>` non-scoped ou scoped avec `:deep`) :
```css
.slide-next-enter-from { transform: translateX(100%); opacity: 0; }
.slide-next-leave-to   { transform: translateX(-100%); opacity: 0; }
.slide-prev-enter-from { transform: translateX(-100%); opacity: 0; }
.slide-prev-leave-to   { transform: translateX(100%); opacity: 0; }
/* enter-active / leave-active : transition 0.28s ease, position: absolute, width/height: 100% */
```

### ListView.vue

`.list-view` : ajouter `height: 100%; overflow-y: auto; box-sizing: border-box;`.

## Out of scope

- Pas de swipe vers la page Settings.
- Pas de breadcrumb ni d'historique de navigation.
- La navigation par swipe inter-pages est indépendante du swipe de formulaire déjà implémenté.
- Aucun changement aux stores ni à la logique métier.
