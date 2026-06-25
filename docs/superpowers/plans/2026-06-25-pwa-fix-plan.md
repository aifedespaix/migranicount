# PWA Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Corriger la stratégie de mise à jour du Service Worker pour que les nouvelles versions soient immédiatement actives sans nécessiter Ctrl+F5.

**Architecture:** 2 changements indépendants — `vite.config.ts` (skipWaiting + clientsClaim) + `src/main.ts` (reload on controllerchange).

---

### Task 1: vite.config.ts — skipWaiting + clientsClaim

**Files:**
- Modify: `vite.config.ts`

- [ ] **Step 1: Modifier `vite.config.ts`**

Trouver dans la section `workbox` :

```ts
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
      },
```

Remplacer par :

```ts
      workbox: {
        skipWaiting: true,
        clientsClaim: true,
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
      },
```

- [ ] **Step 2: Build pour vérifier que la config est valide**

Run: `npm run build`
Expected: clean, `dist/sw.js` généré. Inspecter `dist/sw.js` et vérifier qu'il contient `skipWaiting()` et `clients.claim()`.

```bash
grep -c "skipWaiting\|clients.claim" dist/sw.js
```

Expected: 2 occurrences (ou plus).

- [ ] **Step 3: Commit**

```bash
git add vite.config.ts
git commit -m "fix: enable skipWaiting and clientsClaim in workbox for immediate SW activation"
```

---

### Task 2: main.ts — rechargement automatique sur controllerchange

**Files:**
- Modify: `src/main.ts`

- [ ] **Step 1: Modifier `src/main.ts`**

Trouver la fin du fichier (après `createApp(...).mount('#app')`).

Ajouter :

```ts
if ('serviceWorker' in navigator) {
  let refreshing = false
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshing) return
    refreshing = true
    window.location.reload()
  })
}
```

Le fichier complet devient :

```ts
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { router } from './router'
import App from './App.vue'
import './style.css'
import './styles/theme.css'
import './styles/form.css'
import './styles/fonts.css'

createApp(App).use(createPinia()).use(router).mount('#app')

if ('serviceWorker' in navigator) {
  let refreshing = false
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshing) return
    refreshing = true
    window.location.reload()
  })
}
```

- [ ] **Step 2: Build et tests**

Run: `npm run build && npm test`
Expected: PASS — `main.ts` n'a pas de test direct, mais le build doit être clean et les tests ne doivent pas régresser.

- [ ] **Step 3: Manual check (optionnel mais recommandé)**

Run: `npm run build && npm run preview`

Dans DevTools → Application → Service Workers :
- Cocher "Update on reload" pour simuler une mise à jour.
- Recharger → observer que le nouveau SW prend le contrôle et que la page recharge automatiquement.

- [ ] **Step 4: Commit**

```bash
git add src/main.ts
git commit -m "fix: auto-reload page when new service worker takes control"
```
