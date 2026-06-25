# Toasts (Feedbacks Utilisateur) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Toast de succès à la sauvegarde, toast persistant "Brouillon en attente" avec bouton "Reprendre" quand l'utilisateur ferme la modale sans enregistrer.

**Architecture:** `src/stores/toast.ts` (Pinia, TDD) + `src/components/ToastContainer.vue` (présentationnel) + câblage dans `src/App.vue`, `src/views/ListView.vue`, `src/views/StatsView.vue`.

---

### Task 1: Toast store — `useToastStore`

**Files:**
- Create: `src/stores/toast.ts`
- Create: `src/stores/toast.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/stores/toast.test.ts`:

```ts
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useToastStore } from './toast'

beforeEach(() => {
  vi.useFakeTimers()
  setActivePinia(createPinia())
})

afterEach(() => {
  vi.useRealTimers()
})

describe('useToastStore', () => {
  it('starts empty', () => {
    const store = useToastStore()
    expect(store.toasts).toEqual([])
  })

  it('add returns an id and the toast is visible', () => {
    const store = useToastStore()
    const id = store.add({ message: 'OK', type: 'success', persistent: false })
    expect(typeof id).toBe('string')
    expect(store.toasts).toHaveLength(1)
    expect(store.toasts[0].message).toBe('OK')
  })

  it('non-persistent toast is removed after 3000ms', () => {
    const store = useToastStore()
    store.add({ message: 'OK', type: 'success', persistent: false })
    expect(store.toasts).toHaveLength(1)
    vi.advanceTimersByTime(3000)
    expect(store.toasts).toHaveLength(0)
  })

  it('persistent toast is not removed automatically', () => {
    const store = useToastStore()
    store.add({ message: 'Brouillon', type: 'pending', persistent: true })
    vi.advanceTimersByTime(10000)
    expect(store.toasts).toHaveLength(1)
  })

  it('remove deletes the toast by id', () => {
    const store = useToastStore()
    const id = store.add({ message: 'OK', type: 'success', persistent: true })
    store.remove(id)
    expect(store.toasts).toHaveLength(0)
  })

  it('remove a non-existent id is a no-op', () => {
    const store = useToastStore()
    expect(() => store.remove('unknown-id')).not.toThrow()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- toast.test.ts`
Expected: FAIL — `toast.ts` does not exist.

- [ ] **Step 3: Implement `src/stores/toast.ts`**

```ts
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { newId } from '../utils/uuid'

export interface Toast {
  id: string
  message: string
  type: 'success' | 'pending'
  persistent: boolean
  action?: { label: string; handler: () => void }
}

export const useToastStore = defineStore('toast', () => {
  const toasts = ref<Toast[]>([])

  function add(opts: Omit<Toast, 'id'>): string {
    const id = newId()
    toasts.value.push({ ...opts, id })
    if (!opts.persistent) {
      setTimeout(() => remove(id), 3000)
    }
    return id
  }

  function remove(id: string): void {
    toasts.value = toasts.value.filter((t) => t.id !== id)
  }

  return { toasts, add, remove }
})
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- toast.test.ts`
Expected: PASS — 6 tests.

- [ ] **Step 5: Run full suite**

Run: `npm test`
Expected: PASS — all tests green.

- [ ] **Step 6: Commit**

```bash
git add src/stores/toast.ts src/stores/toast.test.ts
git commit -m "feat: add toast store with auto-dismiss and persistent toasts"
```

---

### Task 2: ToastContainer.vue

**Files:**
- Create: `src/components/ToastContainer.vue`

- [ ] **Step 1: Create `src/components/ToastContainer.vue`**

```vue
<template>
  <Teleport to="body">
    <div class="toast-container" aria-live="polite" aria-atomic="false">
      <TransitionGroup name="toast" tag="ul" class="toast-list">
        <li v-for="t in toast.toasts" :key="t.id" :class="['toast-item', `toast-${t.type}`]">
          <span class="toast-icon">{{ t.type === 'success' ? '✓' : '⏳' }}</span>
          <span class="toast-message">{{ t.message }}</span>
          <button
            v-if="t.action"
            type="button"
            class="toast-action-btn"
            @click="t.action!.handler()"
          >{{ t.action.label }}</button>
          <button
            type="button"
            class="toast-dismiss"
            aria-label="Fermer"
            @click="toast.remove(t.id)"
          >×</button>
        </li>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { useToastStore } from '../stores/toast'

const toast = useToastStore()
</script>

<style scoped>
.toast-container {
  position: fixed;
  top: 4.5rem;
  left: 50%;
  transform: translateX(-50%);
  z-index: 100;
  width: min(92vw, 400px);
  pointer-events: none;
}
.toast-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.toast-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.65rem 0.9rem;
  border-radius: 0.5rem;
  font-size: 0.9rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  pointer-events: all;
}
.toast-success {
  background: var(--color-success);
  color: var(--color-success-contrast);
}
.toast-pending {
  background: var(--color-surface);
  color: var(--color-text);
  border: 1px solid var(--color-muted);
}
.toast-icon {
  flex-shrink: 0;
  font-size: 1rem;
}
.toast-message {
  flex: 1;
}
.toast-action-btn {
  background: var(--color-accent);
  color: var(--color-accent-contrast);
  border: none;
  border-radius: 0.35rem;
  padding: 0.25rem 0.6rem;
  font-size: 0.85rem;
  cursor: pointer;
  white-space: nowrap;
}
.toast-dismiss {
  background: none;
  border: none;
  font-size: 1.1rem;
  cursor: pointer;
  color: inherit;
  opacity: 0.6;
  padding: 0 0.15rem;
  flex-shrink: 0;
}
.toast-dismiss:hover {
  opacity: 1;
}
.toast-enter-active {
  transition: transform 0.2s ease, opacity 0.2s ease;
}
.toast-leave-active {
  transition: transform 0.18s ease, opacity 0.18s ease;
}
.toast-enter-from {
  transform: translateY(-1rem);
  opacity: 0;
}
.toast-leave-to {
  transform: translateY(-0.5rem);
  opacity: 0;
}
@media (min-width: 1024px) {
  .toast-container {
    left: auto;
    right: 1.5rem;
    transform: none;
  }
}
</style>
```

- [ ] **Step 2: Type-check and build**

Run: `npm run build`
Expected: clean.

- [ ] **Step 3: Run test suite**

Run: `npm test`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/components/ToastContainer.vue
git commit -m "feat: add ToastContainer component with slide-down animation"
```

---

### Task 3: Wiring dans App.vue, ListView.vue, StatsView.vue

**Files:**
- Modify: `src/App.vue`
- Modify: `src/views/ListView.vue`
- Modify: `src/views/StatsView.vue`

- [ ] **Step 1: Modifier `src/App.vue`**

Dans `<template>`, ajouter `<ToastContainer />` juste avant `</template>` (hors du flux normal, téléporté de toute façon).

Remplacer le `<script setup>` entièrement :

```ts
import { ref } from 'vue'
import HeaderNav from './components/HeaderNav.vue'
import BottomNav from './components/BottomNav.vue'
import FabButton from './components/FabButton.vue'
import MigraineFormModal from './components/MigraineForm/MigraineFormModal.vue'
import ToastContainer from './components/ToastContainer.vue'
import { useSettingsStore } from './stores/settings'
import { useToastStore } from './stores/toast'

useSettingsStore()

const toastStore = useToastStore()
const formOpen = ref(false)
const pendingDraftToastId = ref<string | null>(null)

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
```

Dans `<template>`, mettre à jour :
```html
<HeaderNav @add="openForm" />
...
<FabButton @click="openForm" />
<MigraineFormModal v-if="formOpen" @close="onFormClose" @saved="onFormSaved" />
<ToastContainer />
```

- [ ] **Step 2: Modifier `src/views/ListView.vue`**

Dans `<script setup>`, ajouter :
```ts
import { useToastStore } from '../stores/toast'
const toastStore = useToastStore()
```

Remplacer `@saved="editId = null"` par `@saved="onEditSaved"` et `@saved="addFormOpen = false"` par `@saved="onAddSaved"`.

Ajouter les handlers :
```ts
function onEditSaved() {
  editId.value = null
  toastStore.add({ message: 'Migraine mise à jour !', type: 'success', persistent: false })
}

function onAddSaved() {
  addFormOpen.value = false
  toastStore.add({ message: 'Migraine enregistrée !', type: 'success', persistent: false })
}
```

- [ ] **Step 3: Modifier `src/views/StatsView.vue`**

Dans `<script setup>`, ajouter :
```ts
import { useToastStore } from '../stores/toast'
const toastStore = useToastStore()
```

Remplacer `@saved="emptyStateFormOpen = false"` par `@saved="onEmptyStateSaved"`.

Ajouter :
```ts
function onEmptyStateSaved() {
  emptyStateFormOpen.value = false
  toastStore.add({ message: 'Migraine enregistrée !', type: 'success', persistent: false })
}
```

- [ ] **Step 4: Type-check and build**

Run: `npm run build`
Expected: clean.

- [ ] **Step 5: Run test suite**

Run: `npm test`
Expected: PASS.

- [ ] **Step 6: Manual check**

Run: `npm run dev`.
- Ouvrir la modale, remplir des champs, cliquer "×" → toast "Brouillon en attente" avec bouton "Reprendre" apparaît.
- Cliquer "Reprendre" → toast disparaît, modale rouvre.
- Enregistrer → toast "Migraine enregistrée !" apparaît 3 secondes puis disparaît automatiquement.
- Toast pending peut être fermé manuellement via ×.

- [ ] **Step 7: Commit**

```bash
git add src/App.vue src/views/ListView.vue src/views/StatsView.vue
git commit -m "feat: wire toast feedback on save and draft-pending close"
```
