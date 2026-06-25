# Correctif Technique — PWA Cache / Service Worker

Domaine 6 sur 6 du lot d'améliorations UI/UX.

## Symptôme

- Rechargement standard → ancienne version servie par le SW cache.
- Ctrl+F5 → nouvelle version (contournement du SW).
- Rechargement après Ctrl+F5 → ancienne version de nouveau.

## Cause

`registerType: 'autoUpdate'` détecte et installe le nouveau SW en arrière-plan, mais celui-ci attend que tous les onglets soient fermés avant de s'activer (`waiting` state). Sans `skipWaiting`, l'ancien SW reste en contrôle indéfiniment tant qu'un onglet est ouvert. Après un Ctrl+F5 (réseau direct, SW bypassé), le nouveau SW s'installe mais ne prend toujours pas le contrôle immédiatement.

## Fix

**Deux changements :**

### 1. `vite.config.ts` — workbox skipWaiting + clientsClaim

```ts
workbox: {
  skipWaiting: true,
  clientsClaim: true,
  globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
}
```

- `skipWaiting: true` : le nouveau SW s'active immédiatement sans attendre la fermeture des onglets.
- `clientsClaim: true` : le nouveau SW prend le contrôle de tous les clients (onglets) existants.

### 2. `src/main.ts` — rechargement automatique à l'activation d'un nouveau SW

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

`controllerchange` est émis quand un nouveau SW prend le contrôle (grâce à `skipWaiting` + `clientsClaim`). Le rechargement garantit que le code JS en mémoire correspond au nouveau bundle. Le flag `refreshing` évite une boucle de rechargements infinie.

## Comportement après le fix

1. App déployée avec une nouvelle version.
2. L'utilisateur ouvre l'app → ancien SW sert la page.
3. Le nouveau SW est détecté, s'installe, puis appelle immédiatement `skipWaiting()`.
4. `clientsClaim()` → le nouveau SW prend le contrôle.
5. `controllerchange` se déclenche → `window.location.reload()`.
6. La page recharge et le nouveau SW sert la nouvelle version.
7. Tous les rechargements ultérieurs → nouvelle version.

## Tests

Pas de test automatisé possible pour le comportement SW en jsdom. Vérification manuelle : `npm run build && npm run preview`, DevTools → Application → Service Workers, simuler une mise à jour.

## Out of scope

- Pas de toast ou d'UI "Mise à jour disponible — cliquer pour recharger" (stratégie `prompt`) — le rechargement automatique est suffisant pour un outil personnel.
- Pas de modification du manifest PWA.
