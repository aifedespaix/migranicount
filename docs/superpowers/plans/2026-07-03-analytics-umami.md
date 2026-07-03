# Analytics Umami Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add self-hosted Umami analytics to Migracount with a device-local opt-out, a non-intrusive one-time transparency notice, and an honest privacy policy — no blocking cookie-consent gate.

**Architecture:** A framework-agnostic `src/lib/analytics.ts` injects/removes the Umami `<script>` tag. A new `analyticsEnabled` field on the existing `useSettingsStore` (local-only, not synced to PocketBase) drives a `watchEffect` in a `useAnalytics()` composable wired into `App.vue`, exactly like the existing `useSettingsStore()`/`useSync()` calls there. A dismissible `AnalyticsNotice.vue` bar (shown once via a localStorage flag) and a toggle in `SettingsView.vue` both write to that same setting. `src/content/legal.mjs` section 5 is rewritten to describe the real setup.

**Tech Stack:** Vue 3 `<script setup>`, Pinia, Vitest, existing `getJSON`/`setJSON` localStorage helpers (`src/storage/storage.ts`).

## Global Constraints

- Umami script: `https://analytics.aifedespaix.com/script.js`, `data-website-id="f547cada-5c09-478b-9f5a-4df4befe7e48"`.
- Add `data-domains="migracount.aifedespaix.com"`, `data-do-not-track="true"`, `data-exclude-search="true"` to the tag (confirmed valid attributes via Umami docs).
- `analyticsEnabled` defaults to `true` and is **local-only** — never sent through `enqueue({ type: 'preferences-patch', ... })`, never touches `useSync.ts`.
- No env var for the website-id — it's a public, non-secret value; hardcode as a constant, matching `SITE_URL` in `src/composables/useHead.ts`.
- No static `<script>` tag added to `index.html` or `scripts/prerender.mjs` — injection happens client-side after Vue mounts.
- Notice bar: `z-index: 40` (above `BottomNav`'s `10`, below `BaseModal`'s `50` and `ToastContainer`'s `100`).
- All new UI must use the existing CSS custom properties (`--color-surface`, `--color-text`, `--color-muted`, `--color-accent`, etc.) — no hardcoded colors — so it renders correctly in `light`/`dark`/`migraine` themes.
- French copy throughout (matches the rest of the app).

---

### Task 1: `src/lib/analytics.ts` — inject/remove the Umami tracker tag

**Files:**
- Create: `src/lib/analytics.ts`
- Test: `src/lib/analytics.test.ts`

**Interfaces:**
- Produces: `enableAnalytics(): void`, `disableAnalytics(): void` — both idempotent, no params, no return value used by callers.

- [ ] **Step 1: Write the failing test**

Create `src/lib/analytics.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { enableAnalytics, disableAnalytics } from './analytics'

const SCRIPT_ID = 'umami-analytics'

beforeEach(() => {
  document.getElementById(SCRIPT_ID)?.remove()
})

describe('analytics', () => {
  it('enableAnalytics injects the Umami script tag with the expected attributes', () => {
    enableAnalytics()
    const el = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null
    expect(el).not.toBeNull()
    expect(el!.src).toBe('https://analytics.aifedespaix.com/script.js')
    expect(el!.defer).toBe(true)
    expect(el!.dataset.websiteId).toBe('f547cada-5c09-478b-9f5a-4df4befe7e48')
    expect(el!.dataset.domains).toBe('migracount.aifedespaix.com')
    expect(el!.dataset.doNotTrack).toBe('true')
    expect(el!.dataset.excludeSearch).toBe('true')
  })

  it('enableAnalytics is idempotent (does not add a second tag)', () => {
    enableAnalytics()
    enableAnalytics()
    expect(document.querySelectorAll(`#${SCRIPT_ID}`).length).toBe(1)
  })

  it('disableAnalytics removes the tag if present', () => {
    enableAnalytics()
    disableAnalytics()
    expect(document.getElementById(SCRIPT_ID)).toBeNull()
  })

  it('disableAnalytics is a no-op if the tag is absent', () => {
    expect(() => disableAnalytics()).not.toThrow()
    expect(document.getElementById(SCRIPT_ID)).toBeNull()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/analytics.test.ts`
Expected: FAIL with "Failed to resolve import './analytics'" (module doesn't exist yet).

- [ ] **Step 3: Write minimal implementation**

Create `src/lib/analytics.ts`:

```typescript
const SCRIPT_ID = 'umami-analytics'
const SCRIPT_SRC = 'https://analytics.aifedespaix.com/script.js'
const WEBSITE_ID = 'f547cada-5c09-478b-9f5a-4df4befe7e48'
const TRACKED_DOMAIN = 'migracount.aifedespaix.com'

export function enableAnalytics(): void {
  if (document.getElementById(SCRIPT_ID)) return

  const script = document.createElement('script')
  script.id = SCRIPT_ID
  script.defer = true
  script.src = SCRIPT_SRC
  script.dataset.websiteId = WEBSITE_ID
  script.dataset.domains = TRACKED_DOMAIN
  script.dataset.doNotTrack = 'true'
  script.dataset.excludeSearch = 'true'
  document.head.appendChild(script)
}

export function disableAnalytics(): void {
  document.getElementById(SCRIPT_ID)?.remove()
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/analytics.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/analytics.ts src/lib/analytics.test.ts
git commit -m "feat(analytics): add Umami script injection helper"
```

---

### Task 2: `analyticsEnabled` setting on `useSettingsStore`

**Files:**
- Modify: `src/stores/settings.ts`
- Test: `src/stores/settings.test.ts`

**Interfaces:**
- Consumes: none new.
- Produces: `store.analyticsEnabled: Ref<boolean>` (via the store's returned reactive property), `store.setAnalyticsEnabled(v: boolean): void`.

- [ ] **Step 1: Write the failing tests**

Add to `src/stores/settings.test.ts` (inside the existing `describe('useSettingsStore', ...)` block, after the last `it`):

```typescript
  it('defaults analyticsEnabled to true when storage is empty', () => {
    const store = useSettingsStore()
    expect(store.analyticsEnabled).toBe(true)
  })

  it('setAnalyticsEnabled(false) updates the store', () => {
    const store = useSettingsStore()
    store.setAnalyticsEnabled(false)
    expect(store.analyticsEnabled).toBe(false)
  })

  it('persists analyticsEnabled across store instances', () => {
    const store = useSettingsStore()
    store.setAnalyticsEnabled(false)

    setActivePinia(createPinia())
    const reloaded = useSettingsStore()
    expect(reloaded.analyticsEnabled).toBe(false)
  })
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/stores/settings.test.ts`
Expected: FAIL — `store.analyticsEnabled` is `undefined`, `store.setAnalyticsEnabled` is not a function.

- [ ] **Step 3: Implement in `src/stores/settings.ts`**

Update `SettingsState` (around line 10-13):

```typescript
interface SettingsState {
  theme: ThemeChoice
  dyslexicFont: FontChoice
  analyticsEnabled: boolean
}
```

Update `DEFAULTS` (line 16):

```typescript
const DEFAULTS: SettingsState = { theme: 'auto', dyslexicFont: 'none', analyticsEnabled: true }
```

After `const dyslexicFont = ref<FontChoice>(initial.dyslexicFont)` (line 22), add:

```typescript
  const analyticsEnabled = ref<boolean>(initial.analyticsEnabled ?? true)
```

Update `persist()` (line 54-56) to include the new field:

```typescript
  function persist(): void {
    setJSON(STORAGE_KEY, { theme: theme.value, dyslexicFont: dyslexicFont.value, analyticsEnabled: analyticsEnabled.value })
  }
```

After `setDyslexicFont` (after line 72), add:

```typescript
  function setAnalyticsEnabled(v: boolean): void {
    analyticsEnabled.value = v
    persist()
  }
```

Update the final `return` (line 80):

```typescript
  return { theme, dyslexicFont, analyticsEnabled, resolvedTheme, setTheme, setDyslexicFont, setAnalyticsEnabled, applyFromSync }
```

Note: `analyticsEnabled` is intentionally **not** part of `applyFromSync` and **not** enqueued via `preferences-patch` — see Global Constraints.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/stores/settings.test.ts`
Expected: PASS (all tests, including the 3 new ones)

- [ ] **Step 5: Commit**

```bash
git add src/stores/settings.ts src/stores/settings.test.ts
git commit -m "feat(settings): add local-only analyticsEnabled preference"
```

---

### Task 3: `useAnalytics()` composable wiring the setting to the script

**Files:**
- Create: `src/composables/useAnalytics.ts`
- Modify: `src/App.vue`
- Test: `src/composables/useAnalytics.test.ts`

**Interfaces:**
- Consumes: `useSettingsStore().analyticsEnabled` (Task 2), `enableAnalytics`/`disableAnalytics` (Task 1).
- Produces: `useAnalytics(): void` — call it once from a component `setup()` with an active Pinia instance; no return value.

- [ ] **Step 1: Write the failing test**

Create `src/composables/useAnalytics.test.ts`:

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { effectScope } from 'vue'
import { useSettingsStore } from '../stores/settings'
import { useAnalytics } from './useAnalytics'

const SCRIPT_ID = 'umami-analytics'

beforeEach(() => {
  localStorage.clear()
  document.getElementById(SCRIPT_ID)?.remove()
  setActivePinia(createPinia())
})

describe('useAnalytics', () => {
  it('injects the script immediately when analyticsEnabled is true', () => {
    const scope = effectScope()
    scope.run(() => useAnalytics())
    expect(document.getElementById(SCRIPT_ID)).not.toBeNull()
    scope.stop()
  })

  it('does not inject the script when analyticsEnabled is false', () => {
    localStorage.setItem('migracount:settings', JSON.stringify({ theme: 'auto', dyslexicFont: 'none', analyticsEnabled: false }))
    setActivePinia(createPinia())
    const scope = effectScope()
    scope.run(() => useAnalytics())
    expect(document.getElementById(SCRIPT_ID)).toBeNull()
    scope.stop()
  })

  it('removes the script reactively when the setting is toggled off', () => {
    const scope = effectScope()
    const settings = scope.run(() => {
      useAnalytics()
      return useSettingsStore()
    })!
    expect(document.getElementById(SCRIPT_ID)).not.toBeNull()
    settings.setAnalyticsEnabled(false)
    expect(document.getElementById(SCRIPT_ID)).toBeNull()
    scope.stop()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/composables/useAnalytics.test.ts`
Expected: FAIL with "Failed to resolve import './useAnalytics'"

- [ ] **Step 3: Write minimal implementation**

Create `src/composables/useAnalytics.ts`:

```typescript
import { watchEffect } from 'vue'
import { useSettingsStore } from '../stores/settings'
import { enableAnalytics, disableAnalytics } from '../lib/analytics'

export function useAnalytics(): void {
  const settings = useSettingsStore()

  watchEffect(() => {
    if (settings.analyticsEnabled) {
      enableAnalytics()
    } else {
      disableAnalytics()
    }
  })
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/composables/useAnalytics.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Wire it into `App.vue`**

In `src/App.vue`, add the import next to the other composable imports (near line 40):

```typescript
import { useAnalytics } from './composables/useAnalytics'
```

Add the call right after `useSettingsStore()` (line 42):

```typescript
useSettingsStore()
useAnalytics()
```

- [ ] **Step 6: Run the full test suite to confirm nothing broke**

Run: `npx vitest run`
Expected: PASS (all existing + new tests)

- [ ] **Step 7: Commit**

```bash
git add src/composables/useAnalytics.ts src/composables/useAnalytics.test.ts src/App.vue
git commit -m "feat(analytics): wire analyticsEnabled setting to script injection"
```

---

### Task 4: Privacy policy update — `src/content/legal.mjs`

**Files:**
- Modify: `src/content/legal.mjs:41-45`

**Interfaces:**
- Consumes: none (static content).
- Produces: none consumed by later tasks — this is content-only.

- [ ] **Step 1: Replace section 5 of `confidentialite.sections`**

Replace the object at `src/content/legal.mjs:41-45`:

```javascript
    {
      heading: '5. Cookies et traceurs',
      paragraphs: [
        "Migracount n'utilise <strong>aucun cookie</strong>, aucun outil d'analytics, aucun traceur publicitaire et n'affiche aucune publicité. Le seul stockage utilisé est le <code>localStorage</code> de votre navigateur, strictement nécessaire au fonctionnement de l'application (et, si vous êtes connecté, le maintien de votre session).",
      ],
    },
```

with:

```javascript
    {
      heading: '5. Statistiques de fréquentation et cookies',
      paragraphs: [
        "Migracount n'affiche aucune publicité et n'utilise <strong>aucun traceur publicitaire</strong>. Pour comprendre l'usage global de l'application (nombre de visites, pages consultées, pays, type d'appareil) et l'améliorer, j'utilise <strong>Umami</strong>, un outil de mesure d'audience open source que j'héberge moi-même.",
        "Cet outil ne dépose <strong>aucun cookie</strong> : il identifie une visite via un identifiant technique haché et renouvelé chaque jour, qui ne permet pas de vous suivre d'un jour à l'autre ni d'un site à l'autre. Il respecte le réglage « Ne pas me pister » (Do Not Track) de votre navigateur. Aucune donnée de santé (crises, symptômes, traitements) ne transite par cet outil, et aucune donnée n'est partagée avec un tiers.",
        "Vous pouvez désactiver ces statistiques à tout moment depuis la page <strong>Réglages</strong> de l'application. Le seul stockage utilisé par ailleurs est le <code>localStorage</code> de votre navigateur, strictement nécessaire au fonctionnement de l'application (et, si vous êtes connecté, au maintien de votre session).",
      ],
    },
```

- [ ] **Step 2: Verify the app still builds and the page renders**

Run: `npx vue-tsc -b --noEmit`
Expected: no new type errors (this file has no types affected, but confirms nothing else broke).

Run: `npm run dev` and visit `/confidentialite/` locally, confirm section 5's new heading and three paragraphs render correctly (manual check, no automated test — content is exercised by the existing `ConfidentialiteView.vue` template, no test file targets this content).

- [ ] **Step 3: Commit**

```bash
git add src/content/legal.mjs
git commit -m "docs(legal): disclose Umami analytics usage in privacy policy"
```

---

### Task 5: Settings toggle — `SettingsView.vue`

**Files:**
- Modify: `src/views/SettingsView.vue`

**Interfaces:**
- Consumes: `settings.analyticsEnabled`, `settings.setAnalyticsEnabled` (Task 2).
- Produces: none.

- [ ] **Step 1: Add a "Confidentialité" section to the template**

In `src/views/SettingsView.vue`, insert this new `<section>` right after the closing `</section>` of "Apparence" (after line 65, before the "Données" section):

```html
    <section>
      <h2>Confidentialité</h2>
      <p class="field-label">Statistiques anonymes</p>
      <p class="field-hint">
        Migracount utilise Umami, un outil de mesure d'audience auto-hébergé, sans cookie ni
        donnée personnelle. <RouterLink to="/confidentialite/">En savoir plus</RouterLink>.
      </p>
      <div class="pill-group">
        <button
          type="button"
          class="pill-btn"
          :class="{ active: settings.analyticsEnabled }"
          @click="settings.setAnalyticsEnabled(true)"
        >
          Activées
        </button>
        <button
          type="button"
          class="pill-btn"
          :class="{ active: !settings.analyticsEnabled }"
          @click="settings.setAnalyticsEnabled(false)"
        >
          Désactivées
        </button>
      </div>
    </section>
```

- [ ] **Step 2: Import `RouterLink`**

`RouterLink` is a global component registered by `vue-router` (already used the same way in `Footer.vue` without a local import), so no new import is needed. Verify by checking `src/components/Footer.vue:4` uses `<RouterLink>` with no explicit import in its `<script setup>` — same applies here.

- [ ] **Step 3: Add the `.field-hint` style**

In the `<style scoped>` block of `src/views/SettingsView.vue`, add after `.field-label` usage (there's currently no `.field-label` style rule defined explicitly — it's inherited from `p` defaults; add a small hint style near `.font-option-label`, e.g. after the `.data-actions` rule, line 174):

```css
.field-hint {
  font-size: 0.82rem;
  color: var(--color-muted);
  margin: -0.25rem 0 0.75rem;
  line-height: 1.4;
}
.field-hint a {
  color: var(--color-accent);
}
```

- [ ] **Step 4: Manual verification**

Run: `npm run dev`, navigate to `/reglages/` (or the app's settings route), confirm:
- The "Confidentialité" section appears between "Apparence" and "Données".
- Toggling "Désactivées" removes `<script id="umami-analytics">` from the DOM (check via browser devtools Elements panel).
- Toggling back to "Activées" re-adds it.
- Looks correct in light, dark, and migraine themes (use the theme pills above it to switch).

- [ ] **Step 5: Commit**

```bash
git add src/views/SettingsView.vue
git commit -m "feat(settings): add analytics opt-out toggle to Réglages"
```

---

### Task 6: One-time transparency notice — `AnalyticsNotice.vue`

**Files:**
- Create: `src/components/AnalyticsNotice.vue`
- Modify: `src/App.vue`

**Interfaces:**
- Consumes: `settings.analyticsEnabled`, `settings.setAnalyticsEnabled` (Task 2), `getJSON`/`setJSON` (`src/storage/storage.ts`).
- Produces: none — leaf UI component.

- [ ] **Step 1: Create the component**

Create `src/components/AnalyticsNotice.vue`:

```html
<template>
  <Transition name="notice-slide">
    <div v-if="visible" class="analytics-notice" role="status" aria-live="polite">
      <p class="notice-text">
        Migracount utilise des statistiques anonymes, sans cookie, pour m'aider à améliorer
        l'app. <RouterLink to="/confidentialite/" @click="dismiss">En savoir plus</RouterLink>.
      </p>
      <div class="notice-actions">
        <button type="button" class="notice-btn notice-btn-secondary" @click="disable">
          Désactiver
        </button>
        <button type="button" class="notice-btn notice-btn-primary" @click="dismiss">
          Ok
        </button>
      </div>
      <button type="button" class="notice-close" aria-label="Fermer" @click="dismiss">×</button>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useSettingsStore } from '../stores/settings'
import { getJSON, setJSON } from '../storage/storage'

const SEEN_KEY = 'analytics-notice-seen'

const settings = useSettingsStore()
const seen = ref(getJSON<boolean>(SEEN_KEY, false))
const visible = ref(!seen.value && settings.analyticsEnabled)

function markSeen() {
  seen.value = true
  setJSON(SEEN_KEY, true)
  visible.value = false
}

function dismiss() {
  markSeen()
}

function disable() {
  settings.setAnalyticsEnabled(false)
  markSeen()
}
</script>

<style scoped>
.analytics-notice {
  position: fixed;
  left: 50%;
  bottom: calc(3.5rem + 0.75rem);
  transform: translateX(-50%);
  z-index: 40;
  width: min(92vw, 460px);
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem 0.75rem;
  padding: 0.85rem 2.25rem 0.85rem 1rem;
  border-radius: 0.75rem;
  background: var(--color-surface);
  color: var(--color-text);
  border: 1px solid color-mix(in srgb, var(--color-muted) 25%, transparent);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.18);
}
@media (min-width: 1024px) {
  .analytics-notice {
    left: auto;
    right: 1.5rem;
    bottom: 1.5rem;
    transform: none;
  }
}
.notice-text {
  flex: 1 1 100%;
  margin: 0;
  font-size: 0.85rem;
  line-height: 1.45;
}
.notice-text a {
  color: var(--color-accent);
}
.notice-actions {
  display: flex;
  gap: 0.5rem;
  margin-left: auto;
}
.notice-btn {
  font: inherit;
  font-size: 0.82rem;
  padding: 0.4rem 0.85rem;
  border-radius: 0.5rem;
  cursor: pointer;
}
.notice-btn-secondary {
  background: none;
  border: 1px solid var(--color-muted);
  color: var(--color-text);
}
.notice-btn-primary {
  background: var(--color-accent);
  border: 1px solid var(--color-accent);
  color: var(--color-accent-contrast);
}
.notice-close {
  position: absolute;
  top: 0.4rem;
  right: 0.5rem;
  background: none;
  border: none;
  font-size: 1.15rem;
  line-height: 1;
  color: var(--color-muted);
  cursor: pointer;
  padding: 0.25rem;
}
.notice-close:hover {
  color: var(--color-text);
}
.notice-slide-enter-active,
.notice-slide-leave-active {
  transition: transform 0.25s ease, opacity 0.25s ease;
}
.notice-slide-enter-from,
.notice-slide-leave-to {
  transform: translateX(-50%) translateY(1rem);
  opacity: 0;
}
@media (min-width: 1024px) {
  .notice-slide-enter-from,
  .notice-slide-leave-to {
    transform: translateY(1rem);
  }
}
@media (prefers-reduced-motion: reduce) {
  .notice-slide-enter-active,
  .notice-slide-leave-active {
    transition: opacity 0.15s ease;
  }
  .notice-slide-enter-from,
  .notice-slide-leave-to {
    transform: none;
  }
}
</style>
```

- [ ] **Step 2: Mount it in `App.vue`**

In `src/App.vue`, import it next to `ToastContainer` (near line 35):

```typescript
import AnalyticsNotice from './components/AnalyticsNotice.vue'
```

Add it in the template next to `<ToastContainer />` (line 23):

```html
  <ToastContainer />
  <AnalyticsNotice />
```

- [ ] **Step 3: Manual verification**

Run: `npm run dev`. Clear localStorage (devtools → Application → Local Storage → clear `migracount:analytics-notice-seen`), reload:
- Confirm the notice appears once, positioned above `BottomNav` on mobile widths (< 1024px) and as a floating card bottom-right on desktop widths.
- Confirm it does not block clicks on the rest of the UI (try tapping a nav item behind/around it).
- Click "Ok" — notice disappears; reload the page — it stays gone (check `localStorage.getItem('migracount:analytics-notice-seen')` is `"true"`).
- Clear the flag again, reload, click "Désactiver" — confirm `<script id="umami-analytics">` is removed from the DOM and the Réglages toggle now shows "Désactivées".
- Check appearance in light, dark, and migraine themes.
- Check on a narrow (< 1024px) viewport and a wide (≥ 1024px) viewport via devtools responsive mode.

- [ ] **Step 4: Commit**

```bash
git add src/components/AnalyticsNotice.vue src/App.vue
git commit -m "feat(analytics): add one-time non-intrusive transparency notice"
```

---

### Task 7: Full verification pass

**Files:** none (verification only)

- [ ] **Step 1: Run the full test suite**

Run: `npx vitest run`
Expected: PASS, no regressions.

- [ ] **Step 2: Type-check**

Run: `npx vue-tsc -b --noEmit`
Expected: no errors.

- [ ] **Step 3: Production build**

Run: `npm run build`
Expected: build succeeds, including the `scripts/prerender.mjs` step (unaffected by these changes, but confirms `legal.mjs`'s new content doesn't break the prerender's HTML escaping).

- [ ] **Step 4: Manual smoke test of the built app**

Run: `npm run preview`, open the served URL:
- Confirm `<script id="umami-analytics">` is present in `<head>` after the app mounts (devtools → Elements), with all five `data-*` attributes from Task 1.
- Navigate between routes (e.g. Liste ↔ Stats) and confirm no console errors (Umami's SPA auto-tracking patches History API silently; there is nothing to assert visually without live network access to the analytics server, but there should be no thrown errors).
- Confirm `/confidentialite/` shows the rewritten section 5.

No commit for this task — it's a verification checkpoint only.
