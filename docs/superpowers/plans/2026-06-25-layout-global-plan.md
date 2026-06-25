# Layout Global Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign HeaderNav (icône app, typo, settings icon, responsive mobile), BottomNav avec FAB central, ListView scrollable, swipe inter-pages Stats ↔ Liste.

**Architecture:** 4 tâches indépendantes — HeaderNav → BottomNav (+ suppression FabButton) → ListView scroll + App.vue swipe → commit final.

**Dépendances :** `lucide-vue-next` déjà installé. `@vueuse/core` déjà installé (utilisé par le formulaire).

---

### Task 1: HeaderNav redesign

**Files:**
- Modify: `src/components/HeaderNav.vue`

- [ ] **Step 1: Remplacer le contenu complet de `src/components/HeaderNav.vue`**

```vue
<template>
  <header class="header-nav">
    <div class="header-brand">
      <img src="/icons/favicon-32.png" alt="" class="brand-icon" aria-hidden="true" />
      <span class="brand-name">Migracount</span>
    </div>

    <nav class="header-links">
      <RouterLink :to="{ name: 'stats' }" class="nav-link">
        <BarChart2 :size="16" />
        Stats
      </RouterLink>
      <RouterLink :to="{ name: 'liste' }" class="nav-link">
        <List :size="16" />
        Liste
      </RouterLink>
    </nav>

    <div class="header-actions">
      <button
        v-if="favoris.favoris.length > 0"
        type="button"
        class="icon-btn"
        title="Modifier les médicaments"
        aria-label="Modifier les médicaments"
        @click="showMedocsEdit = true"
      >
        <Pencil :size="18" />
      </button>
      <button
        type="button"
        class="icon-btn"
        title="Réglages"
        aria-label="Réglages"
        @click="router.push({ name: 'settings' })"
      >
        <SettingsIcon :size="18" />
      </button>
      <button class="add-btn" @click="$emit('add')">+ Ajouter</button>
    </div>
  </header>
  <MedocsEditModal v-if="showMedocsEdit" @close="showMedocsEdit = false" />
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { Pencil, BarChart2, List, Settings as SettingsIcon } from 'lucide-vue-next'
import { useMedocsFavorisStore } from '../stores/medocsFavoris'
import MedocsEditModal from './MedocsEditModal.vue'

defineEmits<{ add: [] }>()

const router = useRouter()
const favoris = useMedocsFavorisStore()
const showMedocsEdit = ref(false)
</script>

<style scoped>
.header-nav {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  width: 100%;
  height: 3.5rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 1rem;
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-muted);
  z-index: 30;
  box-sizing: border-box;
  gap: 0.75rem;
}
.header-brand {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-shrink: 0;
}
.brand-icon {
  width: 24px;
  height: 24px;
  border-radius: 5px;
}
.brand-name {
  font-size: 1.1rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--color-text);
}
.header-links {
  display: none;
  align-items: center;
  gap: 0.25rem;
}
.nav-link {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.4rem 0.75rem;
  border-radius: 0.4rem;
  color: var(--color-muted);
  text-decoration: none;
  font-size: 0.9rem;
}
.nav-link.router-link-active {
  color: var(--color-accent);
  font-weight: 600;
  background: color-mix(in srgb, var(--color-accent) 10%, transparent);
}
.header-actions {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}
.icon-btn {
  background: none;
  border: none;
  color: var(--color-muted);
  cursor: pointer;
  padding: 0.5rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 0.4rem;
}
.icon-btn:hover {
  color: var(--color-text);
  background: color-mix(in srgb, var(--color-muted) 12%, transparent);
}
.add-btn {
  display: none;
  background: var(--color-accent);
  color: var(--color-accent-contrast);
  border: none;
  border-radius: 0.5rem;
  padding: 0.5rem 1rem;
  cursor: pointer;
  font-size: 0.9rem;
}
@media (min-width: 1024px) {
  .header-links { display: flex; }
  .add-btn { display: inline-block; }
  .header-nav { padding: 0 1.5rem; }
}
</style>
```

- [ ] **Step 2: Type-check et build**

Run: `npm run build`
Expected: clean.

- [ ] **Step 3: Run tests**

Run: `npm test`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/components/HeaderNav.vue
git commit -m "feat: redesign header with app icon, modern typo, settings icon and responsive nav"
```

---

### Task 2: BottomNav avec FAB central + suppression FabButton

**Files:**
- Modify: `src/components/BottomNav.vue`
- Delete: `src/components/FabButton.vue` (suppression physique)

Note: `FabButton.vue` est encore importé dans `App.vue` — ce sera corrigé dans Task 3.

- [ ] **Step 1: Remplacer le contenu de `src/components/BottomNav.vue`**

```vue
<template>
  <nav class="bottom-nav">
    <RouterLink :to="{ name: 'stats' }" class="nav-item">
      <BarChart2 :size="20" />
      <span>Stats</span>
    </RouterLink>
    <button type="button" class="fab-center" @click="$emit('add')" aria-label="Ajouter une migraine">
      <Plus :size="24" />
    </button>
    <RouterLink :to="{ name: 'liste' }" class="nav-item">
      <List :size="20" />
      <span>Liste</span>
    </RouterLink>
  </nav>
</template>

<script setup lang="ts">
import { BarChart2, List, Plus } from 'lucide-vue-next'

defineEmits<{ add: [] }>()
</script>

<style scoped>
.bottom-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  align-items: center;
  background: var(--color-surface);
  border-top: 1px solid var(--color-muted);
  z-index: 10;
  height: 3.5rem;
}
.nav-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.15rem;
  padding: 0.4rem 0;
  color: var(--color-muted);
  text-decoration: none;
  font-size: 0.7rem;
}
.nav-item.router-link-active {
  color: var(--color-accent);
}
.fab-center {
  flex-shrink: 0;
  width: 3rem;
  height: 3rem;
  border-radius: 50%;
  border: none;
  background: var(--color-accent);
  color: var(--color-accent-contrast);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.25);
  margin: 0 1rem;
  flex: 0 0 auto;
}
@media (min-width: 1024px) {
  .bottom-nav { display: none; }
}
</style>
```

- [ ] **Step 2: Supprimer `src/components/FabButton.vue`**

```bash
git rm src/components/FabButton.vue
```

- [ ] **Step 3: Type-check et build**

Run: `npm run build`
Expected: FAIL — `App.vue` importe encore `FabButton`. C'est attendu à ce stade. Continuer à Task 3.

- [ ] **Step 4: Commit**

```bash
git add src/components/BottomNav.vue
git commit -m "feat: add FAB and icons to BottomNav, remove standalone FabButton"
```

---

### Task 3: App.vue swipe inter-pages + fix ListView scroll

**Files:**
- Modify: `src/App.vue`
- Modify: `src/views/ListView.vue`

- [ ] **Step 1: Remplacer le contenu de `src/App.vue`**

```vue
<template>
  <HeaderNav @add="openForm" />
  <main class="app-main" ref="mainRef">
    <RouterView v-slot="{ Component }">
      <Transition :name="pageTransition">
        <component :is="Component" :key="$route.name" />
      </Transition>
    </RouterView>
  </main>
  <BottomNav @add="openForm" />
  <MigraineFormModal v-if="formOpen" @close="onFormClose" @saved="onFormSaved" />
  <ToastContainer />
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useSwipe } from '@vueuse/core'
import HeaderNav from './components/HeaderNav.vue'
import BottomNav from './components/BottomNav.vue'
import MigraineFormModal from './components/MigraineForm/MigraineFormModal.vue'
import ToastContainer from './components/ToastContainer.vue'
import { useSettingsStore } from './stores/settings'
import { useToastStore } from './stores/toast'

useSettingsStore()

const router = useRouter()
const toastStore = useToastStore()
const formOpen = ref(false)
const pendingDraftToastId = ref<string | null>(null)
const mainRef = ref<HTMLElement | null>(null)
const pageTransition = ref<'slide-next' | 'slide-prev'>('slide-next')

const routeOrder: Record<string, number> = { stats: 0, liste: 1 }

function openForm() {
  if (pendingDraftToastId.value) {
    toastStore.remove(pendingDraftToastId.value)
    pendingDraftToastId.value = null
  }
  formOpen.value = true
}

function onFormSaved() {
  if (pendingDraftToastId.value) {
    toastStore.remove(pendingDraftToastId.value)
    pendingDraftToastId.value = null
  }
  toastStore.add({ message: 'Migraine enregistrée !', type: 'success', persistent: false })
  formOpen.value = false
}

function onFormClose() {
  formOpen.value = false
  if (pendingDraftToastId.value) {
    toastStore.remove(pendingDraftToastId.value)
  }
  pendingDraftToastId.value = toastStore.add({
    message: 'Brouillon en attente',
    type: 'pending',
    persistent: true,
    action: { label: 'Reprendre', handler: openForm },
  })
}

useSwipe(mainRef, {
  onSwipeEnd(_event, direction) {
    const currentOrder = routeOrder[router.currentRoute.value.name as string]
    if (currentOrder === undefined) return
    if (direction === 'left' && currentOrder < 1) {
      pageTransition.value = 'slide-next'
      router.push({ name: 'liste' })
    } else if (direction === 'right' && currentOrder > 0) {
      pageTransition.value = 'slide-prev'
      router.push({ name: 'stats' })
    }
  },
})
</script>

<style scoped>
.app-main {
  margin-top: 3.5rem;
  height: calc(100dvh - 3.5rem);
  overflow: hidden;
  position: relative;
}
@media (max-width: 1023px) {
  .app-main {
    height: calc(100dvh - 3.5rem - 3.5rem);
  }
}
</style>

<style>
.slide-next-enter-active,
.slide-next-leave-active,
.slide-prev-enter-active,
.slide-prev-leave-active {
  transition: transform 0.28s ease, opacity 0.28s ease;
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}
.slide-next-enter-from {
  transform: translateX(100%);
  opacity: 0;
}
.slide-next-leave-to {
  transform: translateX(-100%);
  opacity: 0;
}
.slide-prev-enter-from {
  transform: translateX(-100%);
  opacity: 0;
}
.slide-prev-leave-to {
  transform: translateX(100%);
  opacity: 0;
}
</style>
```

Note: les classes de transition de page sont dans un `<style>` non-scoped (sans `scoped`) pour qu'elles s'appliquent aux composants enfants absolument positionnés.

- [ ] **Step 2: Fixer le scroll de ListView**

Dans `src/views/ListView.vue`, dans `<style scoped>`, trouver :

```css
.list-view {
  padding: 1rem 1.5rem;
}
```

Remplacer par :

```css
.list-view {
  padding: 1rem 1.5rem;
  height: 100%;
  overflow-y: auto;
  box-sizing: border-box;
}
```

- [ ] **Step 3: Type-check et build**

Run: `npm run build`
Expected: clean — FabButton n'est plus importé.

- [ ] **Step 4: Run tests**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Manual check**

Run: `npm run dev`.
- Sur mobile (< 1024px) : header visible (logo + settings icon), BottomNav visible (Stats | + | Liste), + ouvre la modale.
- Sur desktop (≥ 1024px) : header avec nav Stats/Liste, + Ajouter visible, BottomNav masqué.
- Swipe gauche sur Stats → animation slide → page Liste.
- Swipe droit sur Liste → animation slide → page Stats.
- Swipe sur page Réglages → rien (Settings hors du routeOrder).
- Page Liste : scroll fonctionne avec beaucoup d'entrées.

- [ ] **Step 6: Commit**

```bash
git add src/App.vue src/views/ListView.vue
git commit -m "feat: add inter-page swipe animation and fix ListView scroll"
```
