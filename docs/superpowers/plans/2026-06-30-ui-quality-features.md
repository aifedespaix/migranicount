# UI Quality Features Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Four independent UI quality improvements: per-treatment stats legend with per-color toggle; undo-toast pattern replacing all confirmation dialogs for deletions; standardized BaseModal with mandatory red X close button and no backdrop-click-to-close; AppButton component in modal footers.

**Architecture:**

- Toast store extended with `type: 'danger' | 'info'`, `duration` field, and per-toast timer tracking; `ToastContainer` gains an animated CSS progress bar and hover/touch pause.
- `buildPerTreatmentTimelines()` returns per-medoc timeline with name; a color palette assigns each treatment a distinct color; a new `TreatmentLegend` component with checkbox toggles lives below each chart.
- `AppModalCloseBtn.vue` is the shared red X atom; `BaseModal.vue` wraps centered/sheet modals with backdrop + X + no-click-outside; full-screen panel modals (MigraineFormModal, CatalogModal) drop `@click.self` and use `AppModalCloseBtn` directly in their existing header.
- `<AppButton>` gets a focus-visible ring and hover box-shadow, then replaces raw `<button>` in both modal footers.

**Tech Stack:** Vue 3 + TypeScript, Chart.js 4 + vue-chartjs 5, Pinia, Lucide icons, pure CSS custom properties, `@vueuse/core`.

## Global Constraints

- No additional npm packages - only existing dependencies.
- CSS uses only existing `--color-*` tokens; new hardcoded colors must be local constants, never added to theme.css.
- All styles scoped to the component.
- Touch events (`touchstart`, `touchend`) must be handled alongside mouse events everywhere interaction is expected.
- Keep all existing toasts that fire on add/edit in sync with the new duration/type API (update callers in all views).

---

## Task 1: Extend Toast Store and Rework ToastContainer

**Files:**

- Modify: `src/stores/toast.ts`
- Modify: `src/components/ToastContainer.vue`
- Modify: `src/views/ListView.vue` (update 3 existing toast callers to new API)
- Modify: `src/views/StatsView.vue` (update 1 existing toast caller)

**Interfaces:**

- Produces: `useToastStore().add({ message, type: 'success'|'danger'|'info'|'pending', duration?: number, persistent?: boolean, action?: { label, handler } }): string`
- Produces: `useToastStore().remove(id: string): void`
- Toast type `'danger'` = red background, `'info'` = blue background, `'success'` = green (existing), `'pending'` = surface/border (existing).
- Callers set `duration` in ms. Default: `success`→3500, `info`→4000, `danger`→8000, `pending`→persistent.

- [ ] **Step 1: Update `src/stores/toast.ts`**

Replace the entire file:

```ts
import { defineStore } from "pinia";
import { ref } from "vue";
import { newId } from "../utils/uuid";

export type ToastType = "success" | "danger" | "info" | "pending";

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration: number; // 0 = persistent
  action?: { label: string; handler: () => void };
}

const DEFAULT_DURATION: Record<ToastType, number> = {
  success: 3500,
  info: 4000,
  danger: 8000,
  pending: 0,
};

export const useToastStore = defineStore("toast", () => {
  const toasts = ref<Toast[]>([]);

  function add(opts: {
    message: string;
    type: ToastType;
    duration?: number;
    persistent?: boolean;
    action?: { label: string; handler: () => void };
  }): string {
    const id = newId();
    const duration = opts.persistent
      ? 0
      : (opts.duration ?? DEFAULT_DURATION[opts.type]);
    toasts.value.push({
      id,
      message: opts.message,
      type: opts.type,
      duration,
      action: opts.action,
    });
    return id;
  }

  function remove(id: string): void {
    toasts.value = toasts.value.filter((t) => t.id !== id);
  }

  return { toasts, add, remove };
});
```

- [ ] **Step 2: Replace `src/components/ToastContainer.vue`**

```vue
<template>
  <Teleport to="body">
    <div class="toast-container" aria-live="polite" aria-atomic="false">
      <TransitionGroup name="toast" tag="ul" class="toast-list">
        <li
          v-for="t in toast.toasts"
          :key="t.id"
          :class="['toast-item', `toast-${t.type}`]"
          @mouseenter="onPause(t.id)"
          @mouseleave="onResume(t.id)"
          @touchstart.passive="onPause(t.id)"
          @touchend.passive="onResume(t.id)"
        >
          <span class="toast-icon">{{ typeIcon(t.type) }}</span>
          <span class="toast-message">{{ t.message }}</span>
          <button
            v-if="t.action"
            type="button"
            class="toast-action-btn"
            @click="t.action!.handler()"
          >
            {{ t.action.label }}
          </button>
          <button
            type="button"
            class="toast-dismiss"
            aria-label="Fermer"
            @click="toast.remove(t.id)"
          >
            ×
          </button>
          <div
            v-if="t.duration > 0"
            class="toast-progress"
            :class="{ paused: paused.has(t.id) }"
            :style="{ '--toast-duration': t.duration + 'ms' }"
          />
        </li>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { onUnmounted, reactive } from "vue";
import { useToastStore, type ToastType } from "../stores/toast";

const toast = useToastStore();
const paused = reactive(new Set<string>());

// Per-toast timer: { startTime, remaining, timeoutId }
const timers = new Map<
  string,
  {
    startTime: number;
    remaining: number;
    timeoutId: ReturnType<typeof setTimeout> | null;
  }
>();

function typeIcon(type: ToastType): string {
  if (type === "success") return "✓";
  if (type === "danger") return "🗑";
  if (type === "info") return "✎";
  return "⏳";
}

// Called when a toast is added (watched via the store)
import { watch } from "vue";
watch(
  () => toast.toasts.map((t) => t.id),
  (newIds, oldIds) => {
    const added = newIds.filter((id) => !oldIds?.includes(id));
    for (const id of added) {
      const t = toast.toasts.find((x) => x.id === id);
      if (!t || t.duration <= 0) continue;
      const info = {
        startTime: Date.now(),
        remaining: t.duration,
        timeoutId: null as ReturnType<typeof setTimeout> | null,
      };
      timers.set(id, info);
      info.timeoutId = setTimeout(() => {
        toast.remove(id);
        timers.delete(id);
      }, t.duration);
    }
    // Clean up timers for removed toasts
    for (const [id, info] of timers) {
      if (!newIds.includes(id)) {
        if (info.timeoutId !== null) clearTimeout(info.timeoutId);
        timers.delete(id);
      }
    }
  },
  { immediate: true },
);

function onPause(id: string) {
  const info = timers.get(id);
  if (!info || info.timeoutId === null) return;
  clearTimeout(info.timeoutId);
  info.remaining = Math.max(0, info.remaining - (Date.now() - info.startTime));
  info.timeoutId = null;
  paused.add(id);
}

function onResume(id: string) {
  const info = timers.get(id);
  if (!info || info.timeoutId !== null) return;
  paused.delete(id);
  info.startTime = Date.now();
  info.timeoutId = setTimeout(() => {
    toast.remove(id);
    timers.delete(id);
  }, info.remaining);
}

onUnmounted(() => {
  for (const info of timers.values()) {
    if (info.timeoutId !== null) clearTimeout(info.timeoutId);
  }
});
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
  padding: 0.65rem 0.9rem 0.85rem;
  border-radius: 0.5rem;
  font-size: 0.9rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  pointer-events: all;
  position: relative;
  overflow: hidden;
}
.toast-success {
  background: var(--color-success);
  color: var(--color-success-contrast);
}
.toast-danger {
  background: var(--color-danger);
  color: white;
}
.toast-info {
  background: var(--color-info);
  color: var(--color-info-contrast);
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
  background: rgba(255, 255, 255, 0.2);
  color: inherit;
  border: 1px solid rgba(255, 255, 255, 0.4);
  border-radius: 0.35rem;
  padding: 0.25rem 0.6rem;
  font-size: 0.85rem;
  cursor: pointer;
  white-space: nowrap;
  font: inherit;
}
.toast-action-btn:hover {
  background: rgba(255, 255, 255, 0.3);
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
.toast-progress {
  position: absolute;
  bottom: 0;
  left: 0;
  height: 3px;
  width: 100%;
  background: rgba(255, 255, 255, 0.5);
  transform-origin: left;
  animation: toast-progress-shrink var(--toast-duration) linear forwards;
}
.toast-pending .toast-progress {
  background: var(--color-muted);
}
.toast-progress.paused {
  animation-play-state: paused;
}
@keyframes toast-progress-shrink {
  from {
    transform: scaleX(1);
  }
  to {
    transform: scaleX(0);
  }
}
.toast-enter-active {
  transition:
    transform 0.2s ease,
    opacity 0.2s ease;
}
.toast-leave-active {
  transition:
    transform 0.18s ease,
    opacity 0.18s ease;
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

- [ ] **Step 3: Update existing toast callers in `src/views/ListView.vue`**

In `onEditSaved`, the deletion branch now handled by undo toast (Task 2 will remove it). Update only the modification branch and the add branch:

Find and replace (the deletion branch will be removed in Task 2):

```ts
// Replace in onEditSaved - only the non-deleted branch:
toastStore.add({
  message: "Migraine mise à jour !",
  type: "success",
  persistent: false,
});
// → becomes:
toastStore.add({ message: "Migraine mise à jour !", type: "info" });

// Replace in onAddSaved:
toastStore.add({
  message: "Migraine enregistrée !",
  type: "success",
  persistent: false,
});
// → becomes:
toastStore.add({ message: "Migraine enregistrée !", type: "success" });
```

- [ ] **Step 4: Update existing toast caller in `src/views/StatsView.vue`**

```ts
// In onEmptyStateSaved:
toastStore.add({
  message: "Migraine enregistrée !",
  type: "success",
  persistent: false,
});
// → becomes:
toastStore.add({ message: "Migraine enregistrée !", type: "success" });
```

- [ ] **Step 5: Manual test**

Open the app. Add a migraine - green toast appears for ~3.5s with animated red progress bar at bottom. Edit a migraine - blue toast appears for ~4s. Hover over a toast - the progress bar pauses, timer pauses. Remove cursor - continues counting down. The × dismiss button still works.

- [ ] **Step 6: Commit**

```bash
git add src/stores/toast.ts src/components/ToastContainer.vue src/views/ListView.vue src/views/StatsView.vue
git commit -m "feat(toast): extend store with typed durations + progress bar + hover-pause"
```

---

## Task 2: Undo-Toast Pattern for All Deletions

**Files:**

- Modify: `src/stores/migraines.ts`
- Modify: `src/stores/medocsFavoris.ts`
- Modify: `src/components/MigraineForm/MigraineFormModal.vue`
- Modify: `src/components/CatalogModal.vue`
- Modify: `src/views/ListView.vue`

**Interfaces:**

- Consumes: `useToastStore().add()` from Task 1 (type `'danger'`, duration `8000`)
- Produces: `migraines.restore(m: Migraine): void` - re-inserts a previously deleted migraine
- Produces: `medocsFavoris.restore(m: MedocFavori): void` - re-inserts a previously deleted medoc with all its fields
- `MigraineFormModal` now emits `deleted: []` in addition to existing `close: []` and `saved: []`

- [ ] **Step 1: Add `restore()` to `src/stores/migraines.ts`**

After the existing `remove` function, add:

```ts
function restore(m: Migraine): void {
  saveMigraine(m as any);
  migraines.value = listMigraines();
  if (pb.authStore.isValid) pushMigraine(m).catch(console.error);
}
```

Add `restore` to the return object:

```ts
return { migraines, save, remove, restore, getById, refresh };
```

- [ ] **Step 2: Add `restore()` to `src/stores/medocsFavoris.ts`**

Read the current file (lines 60+) to confirm the pattern, then after the existing `deleteMedoc` function add:

```ts
function restore(medoc: MedocFavori): void {
  addMedocFavoriWithDetails(medoc.nom, medoc);
  favoris.value = listMedocsFavoris();
  const added = favoris.value.find((f) => f.nom === medoc.nom);
  if (added && pb.authStore.isValid)
    pushMedocFavori(added).catch(console.error);
}
```

Add `restore` to the return object of the store. If `addMedocFavoriWithDetails` does not accept a full `MedocFavori`, check its signature in `src/storage/migraineRepository.ts` and adjust accordingly - the goal is to re-insert the medoc with all its treatmentPeriods, description, etc.

- [ ] **Step 3: Update `MigraineFormModal.vue` - remove ConfirmDialog, add undo toast + `@deleted` emit**

In `<script setup>`:

1. Import `useToastStore` at the top.
2. Add `const toastStore = useToastStore()` below other store imports.
3. Add `deleted: []` to the `defineEmits` list: `const emit = defineEmits<{ close: []; saved: []; deleted: [] }>()`.
4. Remove `const showDeleteConfirm = ref(false)`.
5. Replace `executeDelete()`:

```ts
function executeDelete() {
  if (!props.editId) return;
  const snapshot = migraines.getById(props.editId);
  if (!snapshot) return;
  migraines.remove(props.editId);
  toastStore.add({
    type: "danger",
    message: `Migraine du ${formatMigraineTitleDate(snapshot.date)} supprimée`,
    action: {
      label: "Annuler",
      handler: () => migraines.restore(snapshot),
    },
  });
  emit("deleted");
}
```

In `<template>`:

- Remove `<ConfirmDialog v-if="showDeleteConfirm" ... />`.
- Find `@delete="showDeleteConfirm = true"` on the `<component :is="steps[stepIndex]">` and change to `@delete="executeDelete"`.

- [ ] **Step 4: Update `src/views/ListView.vue` - handle `@deleted` emit**

Change:

```html
<MigraineFormModal
  v-if="editId"
  :edit-id="editId"
  @close="editId = null"
  @saved="onEditSaved"
/>
```

To:

```html
<MigraineFormModal
  v-if="editId"
  :edit-id="editId"
  @close="editId = null"
  @saved="onEditSaved"
  @deleted="onMigraineDeleted"
/>
```

Add function:

```ts
function onMigraineDeleted() {
  editId.value = null;
  // undo toast was already shown by MigraineFormModal
}
```

Update `onEditSaved` - remove the `wasDeleted` branch entirely since deletion now emits `@deleted`:

```ts
function onEditSaved() {
  editId.value = null;
  toastStore.add({ message: "Migraine mise à jour !", type: "info" });
}
```

- [ ] **Step 5: Update `src/components/CatalogModal.vue` - remove ConfirmDialog, add undo toasts**

In `<script setup>`:

1. Import `useToastStore`.
2. Add `const toastStore = useToastStore()` after other stores.
3. Remove `const pendingDelete = ref<DeleteTarget | null>(null)` and `const deleteMessage`.
4. Remove the `confirmDelete()` function.
5. Replace `executeDelete()` with three direct delete functions called from the trash buttons:

```ts
function deleteMedoc(nom: string) {
  const snapshot = medocs.favoris.find((m) => m.nom === nom);
  if (!snapshot) return;
  medocs.deleteMedoc(nom);
  toastStore.add({
    type: "danger",
    message: `Médicament "${nom}" supprimé`,
    action: {
      label: "Annuler",
      handler: () => medocs.restore({ ...snapshot }),
    },
  });
}

function deleteSymptome(nom: string) {
  symptomes.remove(nom);
  toastStore.add({
    type: "danger",
    message: `Symptôme "${nom}" supprimé`,
    action: { label: "Annuler", handler: () => symptomes.add(nom) },
  });
}

function deleteDeclencheur(tag: string) {
  declencheurs.deleteCustom(tag);
  toastStore.add({
    type: "danger",
    message: `Déclencheur "${tag}" supprimé`,
    action: { label: "Annuler", handler: () => declencheurs.register(tag) },
  });
}
```

In `<template>`:

- Replace all `@click="confirmDelete('medoc', item.nom)"` → `@click="deleteMedoc(item.nom)"`.
- Replace all `@click="confirmDelete('symptome', nom)"` → `@click="deleteSymptome(nom)"`.
- Replace all `@click="confirmDelete('declencheur', tag)"` → `@click="deleteDeclencheur(tag)"`.
- Remove `<ConfirmDialog v-if="pendingDelete" ... />` from the template.
- Remove the `ConfirmDialog` import.

Also remove `medocs.removePeriod(item.nom, idx)` direct call (the period delete trash button at line ~329). Period deletion doesn't require the same undo pattern since it's a sub-item - but add a toast for feedback:

```ts
function deletePeriod(medocNom: string, idx: number) {
  medocs.removePeriod(medocNom, idx);
  toastStore.add({ type: "danger", message: "Période supprimée" });
}
```

Replace `@click="medocs.removePeriod(item.nom, idx)"` → `@click="deletePeriod(item.nom, idx)"`.

- [ ] **Step 6: Manual test**

Open the catalog. Delete a medication - no dialog appears; a red toast shows "Médicament X supprimé" with "Annuler" button. The toast shows a countdown bar, stays at least 8s (hover pauses it). Clicking "Annuler" re-inserts the medication. Open the migraine form in edit mode, go to the last step, click the trash icon - the modal closes and a red toast shows "Migraine du … supprimée" with "Annuler". Clicking undo restores the migraine in the list.

- [ ] **Step 7: Commit**

```bash
git add src/stores/migraines.ts src/stores/medocsFavoris.ts src/components/MigraineForm/MigraineFormModal.vue src/components/CatalogModal.vue src/views/ListView.vue
git commit -m "feat(ux): replace confirm dialogs with undo-toast pattern for all deletions"
```

---

## Task 3: AppModalCloseBtn + BaseModal + Remove Backdrop Click-to-Close

**Files:**

- Create: `src/components/AppModalCloseBtn.vue`
- Create: `src/components/BaseModal.vue`
- Modify: `src/components/MigraineForm/MigraineFormModal.vue` (remove `@click.self`)
- Modify: `src/components/charts/ChartDetailModal.vue` (remove `@click.self`, use BaseModal)
- Modify: `src/components/TraitementEfficaciteModal.vue` (use BaseModal)
- Modify: `src/components/AddMedocModal.vue` (add AppModalCloseBtn)
- Modify: `src/components/DefaultCatalogBrowserModal.vue` (add AppModalCloseBtn)
- Modify: `src/components/ConfirmDialog.vue` (add AppModalCloseBtn)
- Modify: `src/components/MedocInfoDialog.vue` (add AppModalCloseBtn)

**Interfaces:**

- `AppModalCloseBtn`: emits `click` natively (it's a `<button>` passthrough). Use as `<AppModalCloseBtn @click="$emit('close')" />`.
- `BaseModal`: props `zIndex?: number` (default `50`). Emits `close`. Provides backdrop (no click-to-close) + positioned close button. Slot for panel content.

- [ ] **Step 1: Create `src/components/AppModalCloseBtn.vue`**

```vue
<template>
  <button class="close-btn" type="button" aria-label="Fermer" v-bind="$attrs">
    ×
  </button>
</template>

<script setup lang="ts">
defineOptions({ inheritAttrs: false });
</script>

<style scoped>
.close-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  line-height: 1;
  cursor: pointer;
  color: var(--color-danger);
  padding: 0.25rem;
  transition: opacity 0.15s ease;
}
.close-btn:hover {
  opacity: 0.7;
}
</style>
```

- [ ] **Step 2: Create `src/components/BaseModal.vue`**

```vue
<template>
  <div
    class="base-backdrop"
    :style="{ '--z': zIndex }"
    @pointerdown.stop
    @touchstart.stop
  >
    <div class="base-panel">
      <AppModalCloseBtn class="base-close" @click="$emit('close')" />
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
import AppModalCloseBtn from "./AppModalCloseBtn.vue";

withDefaults(defineProps<{ zIndex?: number }>(), { zIndex: 50 });
defineEmits<{ close: [] }>();
</script>

<style scoped>
.base-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: var(--z, 50);
}
.base-panel {
  background: var(--color-surface);
  color: var(--color-text);
  border-radius: 0.75rem;
  position: relative;
  overflow: hidden;
  max-height: 90dvh;
  overflow-y: auto;
}
.base-close {
  position: absolute;
  top: 0.5rem;
  right: 0.75rem;
  z-index: 1;
}
</style>
```

- [ ] **Step 3: Fix `MigraineFormModal.vue` - remove backdrop click-to-close**

The modal already has the red X close button in its header using `.modal-close-btn`. Only change needed: remove `@click.self="requestClose"` from the `.modal-backdrop` div on line 2.

Change:

```html
<div
  class="modal-backdrop"
  @click.self="requestClose"
  @pointerdown.stop
  @touchstart.stop
></div>
```

To:

```html
<div class="modal-backdrop" @pointerdown.stop @touchstart.stop></div>
```

Also replace the inline `<button class="modal-close-btn">` with `<AppModalCloseBtn>`:

In `<script setup>`: add `import AppModalCloseBtn from '../AppModalCloseBtn.vue'`

In `<template>`, replace:

```html
<button
  type="button"
  class="modal-close-btn"
  :title="props.editId ? 'Fermer' : 'Fermer (brouillon conservé)'"
  aria-label="Fermer"
  @click="requestClose"
>
  ×
</button>
```

With:

```html
<AppModalCloseBtn
  class="modal-close-btn"
  :title="props.editId ? 'Fermer' : 'Fermer (brouillon conservé)'"
  @click="requestClose"
/>
```

Remove the `.modal-close-btn` scoped style block (styling now comes from `AppModalCloseBtn`). Keep only the `position: absolute; top: 0.5rem; right: 0.75rem;` positioning - add those to the `class="modal-close-btn"` as a scoped style targeting `.modal-close-btn` (the host element, not the inner button):

```css
/* keep only positioning, AppModalCloseBtn provides colors */
:deep(.modal-close-btn) {
  position: absolute;
  top: 0.5rem;
  right: 0.75rem;
}
```

Actually since `$attrs` are passed through to the `<button>` in AppModalCloseBtn, `class="modal-close-btn"` will land on the `<button>`. So keep the `.modal-close-btn` scoped style with only positioning:

```css
.modal-close-btn {
  position: absolute;
  top: 0.5rem;
  right: 0.75rem;
}
```

- [ ] **Step 4: Update `CatalogModal.vue` - same AppModalCloseBtn swap**

CatalogModal already has no `@click.self` on its backdrop. Just replace its `<button class="modal-close-btn">` with `<AppModalCloseBtn class="modal-close-btn" @click="$emit('close')" />`, add the import, and keep `.modal-close-btn { position: absolute; top: 0.5rem; right: 0.75rem; }`.

- [ ] **Step 5: Update `ChartDetailModal.vue` - use BaseModal, remove @click.self**

The current template wraps in `.chart-detail-overlay` with `@click.self="$emit('close')"` and a manually placed `.close-btn` in the header. Replace with `BaseModal`:

In `<script setup>`: add `import BaseModal from '../BaseModal.vue'`

Replace the root `<div class="chart-detail-overlay">` and its child `<div class="chart-detail-panel">` with:

```html
<BaseModal :z-index="50" @close="$emit('close')">
  <div class="chart-detail-panel">
    <header class="chart-detail-header">
      <h2>{{ title }}</h2>
      <!-- close button now comes from BaseModal -->
    </header>
    ... (rest of content unchanged)
  </div>
</BaseModal>
```

Remove the `<button class="close-btn">` from the header. Remove the scoped `.chart-detail-overlay` and `.close-btn` CSS rules. Remove `onMounted`/`onUnmounted` Escape key handler (BaseModal doesn't provide it, re-add it locally if needed):

```ts
function handleKeydown(e: KeyboardEvent) {
  if (e.key === "Escape") emit("close");
}
onMounted(() => document.addEventListener("keydown", handleKeydown));
onUnmounted(() => document.removeEventListener("keydown", handleKeydown));
```

Keep that Escape handler as-is. Add the `.chart-detail-panel` sizing to the scoped styles (previously was inside `.chart-detail-overlay`):

```css
.chart-detail-panel {
  width: min(90vw, 960px);
  height: min(85vh, 720px);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
```

- [ ] **Step 6: Update `TraitementEfficaciteModal.vue` - use BaseModal**

Similar swap: replace the root backdrop div with `<BaseModal :z-index="50" @close="$emit('close')">`, remove the inline close button, keep panel width/height in scoped styles.

- [ ] **Step 7: Update `AddMedocModal.vue` and `DefaultCatalogBrowserModal.vue` - add AppModalCloseBtn**

These are bottom-sheet modals with their own backdrop. Do NOT replace their structure with BaseModal (layout is too different). Just add an `<AppModalCloseBtn>` in their header area.

For each:

1. Import `AppModalCloseBtn`.
2. In the template, find the sheet header (if any) or the top of the sheet panel, and add:

```html
<AppModalCloseBtn
  style="position:absolute; top:0.75rem; right:0.75rem;"
  @click="$emit('close')"
/>
```

3. Ensure the sheet panel has `position: relative` (it should already, but verify).
4. Remove `@click.self` from backdrop if present (verify and remove).

- [ ] **Step 8: Update `ConfirmDialog.vue` and `MedocInfoDialog.vue` - add AppModalCloseBtn**

Both are centered card dialogs. Each currently has a "Annuler" / cancel button. Add the X button at the top-right of the card:

For `ConfirmDialog.vue`: Add `import AppModalCloseBtn from './AppModalCloseBtn.vue'`. In the template, make the `.confirm-card` have `position: relative`, then add `<AppModalCloseBtn style="position:absolute; top:0.5rem; right:0.5rem;" @click="$emit('dismiss')" />` as the first child. Also ensure no `@click.self` on backdrop.

For `MedocInfoDialog.vue`: Same pattern, but emit `close` or whatever its close event is named.

- [ ] **Step 9: Manual test**

Open every modal in the app. Each has a red × button top-right. Clicking outside the modal panel does NOT close it. The × button always closes. Pressing Escape still closes ChartDetailModal.

- [ ] **Step 10: Commit**

```bash
git add src/components/AppModalCloseBtn.vue src/components/BaseModal.vue src/components/MigraineForm/MigraineFormModal.vue src/components/CatalogModal.vue src/components/charts/ChartDetailModal.vue src/components/TraitementEfficaciteModal.vue src/components/AddMedocModal.vue src/components/DefaultCatalogBrowserModal.vue src/components/ConfirmDialog.vue src/components/MedocInfoDialog.vue
git commit -m "feat(modal): standardize red X close button + remove backdrop click-to-close across all modals"
```

---

## Task 4: AppButton in Modal Footers

**Files:**

- Modify: `src/components/AppButton.vue`
- Modify: `src/components/MigraineForm/MigraineFormModal.vue`
- Modify: `src/components/CatalogModal.vue`

**Interfaces:**

- Consumes: `AppButton` props: `variant?: 'primary'|'danger'|'muted'|'info'`, `ghost?: boolean`, `size?: 'sm'|'md'|'lg'`, plus standard button attrs via `$attrs`.

- [ ] **Step 1: Enhance `AppButton.vue`**

Add focus-visible ring and hover box-shadow to the existing styles. In the `.app-btn` base rule, add:

```css
.app-btn {
  /* existing ... */
  outline: none;
}
.app-btn:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
}
```

Add hover shadow for filled variants:

```css
.app-btn--primary:not(.app-btn--ghost):hover,
.app-btn--danger:not(.app-btn--ghost):hover,
.app-btn--info:not(.app-btn--ghost):hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}
```

- [ ] **Step 2: Update `MigraineFormModal.vue` footer buttons**

In `<script setup>`: add `import AppButton from '../AppButton.vue'`

In `<template>`, inside `.modal-actions`, replace the three action buttons:

Replace "Préc." button:

```html
<AppButton
  variant="info"
  ghost
  size="lg"
  style="flex:1"
  :style="prevVisible ? {} : { visibility: 'hidden' }"
  @click="goPrev"
>
  <ArrowLeft :size="16" />
  Préc.
</AppButton>
```

Replace "Fermer" button (last step):

```html
<AppButton variant="danger" ghost size="lg" style="flex:1" @click="closeForm">
  Fermer
</AppButton>
```

Replace "Suiv." button:

```html
<AppButton
  variant="info"
  size="lg"
  style="flex:1"
  :class="{ 'action-btn-next--warning': hasPendingMedoc }"
  @click="goNext"
>
  Suiv.
  <ArrowRight :size="16" />
</AppButton>
```

For the pending medoc warning state, add a variant override in the parent using a class. But `AppButton` applies its own background - the warning override needs to be handled differently. Simplest: add a `warning` variant to AppButton:

In `AppButton.vue`, add to `variant` prop union: `'warning'`. Add the filled and ghost styles:

```css
.app-btn--warning:not(.app-btn--ghost) {
  background: var(--color-warning);
  color: var(--color-warning-contrast);
  border-color: var(--color-warning);
}
.app-btn--warning:not(.app-btn--ghost):hover {
  background: color-mix(in srgb, var(--color-warning) 82%, black);
}
```

Then the "Suiv." button uses `:variant="hasPendingMedoc ? 'warning' : 'info'"`:

```html
<AppButton
  :variant="hasPendingMedoc ? 'warning' : 'info'"
  size="lg"
  style="flex:1"
  @click="goNext"
>
  Suiv.
  <ArrowRight :size="16" />
</AppButton>
```

Remove the now-unused `.action-btn`, `.action-btn-prev`, `.action-btn-next`, `.action-btn-close-form`, `.action-btn-next--warning` scoped style rules. Keep `.modal-actions` and `.modal-actions-spacer`.

- [ ] **Step 3: Update `CatalogModal.vue` footer buttons**

Same approach. Add `import AppButton from './AppButton.vue'` in script.

Footer (inside `.modal-actions`):

```html
<AppButton
  variant="info"
  ghost
  size="lg"
  style="flex:1"
  :style="prevVisible ? {} : { visibility: 'hidden' }"
  @click="goPrev"
>
  <ArrowLeft :size="16" />
  Préc.
</AppButton>
<AppButton
  variant="danger"
  ghost
  size="lg"
  style="flex:1"
  @click="$emit('close')"
>
  Fermer
</AppButton>
<AppButton
  variant="info"
  size="lg"
  style="flex:1"
  :style="nextVisible ? {} : { visibility: 'hidden' }"
  @click="goNext"
>
  Suiv.
  <ArrowRight :size="16" />
</AppButton>
```

Also replace inline edit action buttons (`.catalog-edit-actions`). Find all occurrences of `<button type="button" class="btn-primary btn-sm">` and `<button type="button" class="btn-secondary btn-sm">` in the template and replace:

- `.btn-primary.btn-sm` → `<AppButton variant="primary" size="sm">`
- `.btn-secondary.btn-sm` → `<AppButton variant="muted" ghost size="sm">`

Remove the now-unused `.btn-primary`, `.btn-secondary`, `.btn-sm` scoped style rules (bottom of CatalogModal styles), also remove `.action-btn`, `.action-btn-close`, `.action-btn-next`, `.action-btn-prev` rules.

- [ ] **Step 4: Manual test**

Open MigraineFormModal. Footer buttons have hover effects (box-shadow, color transition, 0.95 scale on click). The "Suiv." button is blue, turns amber when a pending medoc entry exists. "Fermer" on last step is a danger-ghost button. Open CatalogModal - footer buttons match same visual language. In edit forms, "Enregistrer" is purple-filled, "Annuler" is muted-ghost. Focus via Tab key shows a purple outline on all AppButtons.

- [ ] **Step 5: Commit**

```bash
git add src/components/AppButton.vue src/components/MigraineForm/MigraineFormModal.vue src/components/CatalogModal.vue
git commit -m "feat(ui): use AppButton in modal footers and inline edit actions + enhance with focus ring and hover shadow"
```

---

## Task 5: Per-Treatment Legend on All Charts

**Files:**

- Create: `src/utils/treatmentColors.ts`
- Modify: `src/utils/stats.ts`
- Create: `src/components/charts/TreatmentLegend.vue`
- Modify: `src/components/charts/FrequencyChart.vue`
- Modify: `src/components/charts/IntensityChart.vue`
- Modify: `src/views/StatsView.vue`
- Modify: `src/components/charts/ChartDetailModal.vue`

**Interfaces:**

- Produces: `TreatmentEntry { name: string; color: TreatmentColor; periods: { start: string; end: string }[] }` (exported from `treatmentColors.ts`).
- `buildPerTreatmentTimelines(favoris: MedocFavori[]): { name: string; periods: { start: string; end: string }[] }[]` added to `stats.ts`.
- `TreatmentLegend` props: `entries: TreatmentEntry[]`, `selected: string[]` (names). Emits `update:selected`.
- `FrequencyChart` props change: replace `treatmentTimeline?: { start, end|null }[]` → `treatments?: TreatmentEntry[]`.
- `IntensityChart` props add: `treatments?: TreatmentEntry[]`.
- `ChartDetailModal` props change: replace `treatmentTimeline?` → `treatments?: TreatmentEntry[]`.
- `StatsView` new state: `selectedTreatments: Ref<string[]>` (all selected by default).

- [ ] **Step 1: Create `src/utils/treatmentColors.ts`**

```ts
export interface TreatmentColor {
  bg: string; // chart band fill
  border: string; // chart band border / swatch border
  swatch: string; // legend swatch fill (more opaque)
  text: string; // legend label
}

export interface TreatmentEntry {
  name: string;
  color: TreatmentColor;
  periods: { start: string; end: string }[];
}

const PALETTE: TreatmentColor[] = [
  {
    bg: "rgba(16,185,129,0.13)",
    border: "rgba(16,185,129,0.7)",
    swatch: "rgba(16,185,129,0.5)",
    text: "#10b981",
  },
  {
    bg: "rgba(59,130,246,0.13)",
    border: "rgba(59,130,246,0.7)",
    swatch: "rgba(59,130,246,0.5)",
    text: "#3b82f6",
  },
  {
    bg: "rgba(245,158,11,0.13)",
    border: "rgba(245,158,11,0.7)",
    swatch: "rgba(245,158,11,0.5)",
    text: "#f59e0b",
  },
  {
    bg: "rgba(239,68,68,0.13)",
    border: "rgba(239,68,68,0.7)",
    swatch: "rgba(239,68,68,0.5)",
    text: "#ef4444",
  },
  {
    bg: "rgba(168,85,247,0.13)",
    border: "rgba(168,85,247,0.7)",
    swatch: "rgba(168,85,247,0.5)",
    text: "#a855f7",
  },
];

export function colorForIndex(i: number): TreatmentColor {
  return PALETTE[i % PALETTE.length];
}
```

- [ ] **Step 2: Add `buildPerTreatmentTimelines` to `src/utils/stats.ts`**

At the end of the file (after `buildActivePeriodTimeline`), add:

```ts
export function buildPerTreatmentTimelines(
  medocs: MedocFavori[],
): { name: string; periods: { start: string; end: string }[] }[] {
  const today = new Date().toISOString().slice(0, 10);
  return medocs
    .filter((m) => m.isLongTermTreatment && m.treatmentPeriods?.length)
    .map((m) => ({
      name: m.nom,
      periods: m.treatmentPeriods!.map((p) => ({
        start: p.startDate,
        end: p.endDate ?? today,
      })),
    }));
}
```

- [ ] **Step 3: Create `src/components/charts/TreatmentLegend.vue`**

```vue
<template>
  <div v-if="entries.length" class="treatment-legend">
    <label
      v-for="e in entries"
      :key="e.name"
      class="legend-item"
      :class="{ inactive: !selected.includes(e.name) }"
    >
      <input
        type="checkbox"
        :checked="selected.includes(e.name)"
        class="legend-checkbox"
        @change="toggle(e.name)"
      />
      <span
        class="legend-swatch"
        :style="{ background: e.color.swatch, borderColor: e.color.border }"
      />
      <span
        class="legend-name"
        :style="{
          color: selected.includes(e.name)
            ? e.color.text
            : 'var(--color-muted)',
        }"
      >
        {{ e.name }}
      </span>
    </label>
  </div>
</template>

<script setup lang="ts">
import type { TreatmentEntry } from "../../utils/treatmentColors";

const props = defineProps<{ entries: TreatmentEntry[]; selected: string[] }>();
const emit = defineEmits<{ "update:selected": [string[]] }>();

function toggle(name: string) {
  const next = props.selected.includes(name)
    ? props.selected.filter((n) => n !== name)
    : [...props.selected, name];
  emit("update:selected", next);
}
</script>

<style scoped>
.treatment-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  margin-top: 0.5rem;
}
.legend-item {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  cursor: pointer;
  padding: 0.2rem 0.5rem 0.2rem 0.3rem;
  border-radius: 1rem;
  border: 1px solid var(--color-muted);
  background: color-mix(in srgb, var(--color-muted) 6%, transparent);
  font-size: 0.75rem;
  transition:
    opacity 0.15s ease,
    border-color 0.15s ease;
  user-select: none;
}
.legend-item.inactive {
  opacity: 0.45;
}
.legend-checkbox {
  display: none;
}
.legend-swatch {
  display: inline-block;
  width: 0.85rem;
  height: 0.55rem;
  border-radius: 0.2rem;
  border: 1px solid;
  flex-shrink: 0;
}
.legend-name {
  white-space: nowrap;
}
</style>
```

- [ ] **Step 4: Update `src/components/charts/FrequencyChart.vue`**

At the top of `<script setup>`, add the import:

```ts
import type { TreatmentEntry } from "../../utils/treatmentColors";
```

Change the props definition:

```ts
const props = defineProps<{
  migraines: Migraine[];
  period?: Period;
  treatments?: TreatmentEntry[]; // replaces treatmentTimeline
}>();
```

The `treatmentBandPlugin` already supports a single color. Update it to draw multiple treatments in different colors:

```ts
const treatmentBandPlugin: Plugin<"bar"> = {
  id: "treatmentBands",
  beforeDraw(chart) {
    const cfg = (chart.options as any).plugins?.treatmentBands as
      | {
          treatments: {
            bands: { startIdx: number; endIdx: number }[];
            color: string;
          }[];
        }
      | undefined;
    if (!cfg?.treatments?.length) return;
    const { ctx, chartArea } = chart;
    if (!chartArea) return;
    const { top, bottom } = chartArea;
    const meta = chart.getDatasetMeta(0);
    if (!meta?.data?.length) return;
    ctx.save();
    for (const treatment of cfg.treatments) {
      ctx.fillStyle = treatment.color;
      for (const { startIdx, endIdx } of treatment.bands) {
        const startBar = meta.data[startIdx] as any;
        const endBar = meta.data[endIdx] as any;
        if (!startBar || !endBar) continue;
        const hw = (startBar.width ?? 0) / 2;
        const x = startBar.x - hw;
        const w = endBar.x + hw - x;
        ctx.fillRect(x, top, w, bottom - top);
      }
    }
    ctx.restore();
  },
};
```

Replace the `treatmentBandIndices` computed with a per-treatment version:

```ts
const treatmentBandData = computed(() => {
  const treatments = props.treatments;
  if (!treatments?.length) return [];
  const p = props.period ?? "month";
  return treatments.map((t) => {
    const bands: { startIdx: number; endIdx: number }[] = [];
    let current: { startIdx: number; endIdx: number } | null = null;
    barItems.value.forEach((item, i) => {
      let barStart = item.fullDate;
      let barEnd: string;
      if (p === "month") {
        const d = new Date(item.fullDate + "T00:00:00");
        barEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0)
          .toISOString()
          .slice(0, 10);
      } else if (p === "week") {
        const d = new Date(item.fullDate + "T00:00:00");
        barEnd = new Date(d.getTime() + 6 * 86400000)
          .toISOString()
          .slice(0, 10);
      } else {
        barEnd = barStart;
      }
      const inTreatment = t.periods.some(
        (p) => p.start <= barEnd && p.end >= barStart,
      );
      if (inTreatment) {
        if (!current) current = { startIdx: i, endIdx: i };
        else current.endIdx = i;
      } else {
        if (current) {
          bands.push(current);
          current = null;
        }
      }
    });
    if (current) bands.push(current);
    return { bands, color: t.color.bg };
  });
});
```

Update `options`:

```ts
const options = computed(() => ({
  ...
  plugins: {
    legend: { display: false },
    treatmentBands: { treatments: treatmentBandData.value },
  },
  ...
}))
```

- [ ] **Step 5: Update `src/components/charts/IntensityChart.vue`**

Add treatment band plugin to IntensityChart (line chart). Import and register the same plugin type, adapted for line charts (use `chart.scales.x.getPixelForValue(index)` instead of bar meta):

```ts
import type { Plugin } from "chart.js";
import type { TreatmentEntry } from "../../utils/treatmentColors";
import {
  averageIntensityByMonth,
  averageIntensityByDay,
  averageIntensityByWeek,
  type Period,
} from "../../utils/stats";

const treatmentBandPlugin: Plugin<"line"> = {
  id: "treatmentBandsLine",
  beforeDraw(chart) {
    const cfg = (chart.options as any).plugins?.treatmentBands as
      | {
          treatments: {
            bands: { startIdx: number; endIdx: number }[];
            color: string;
          }[];
        }
      | undefined;
    if (!cfg?.treatments?.length) return;
    const { ctx, chartArea, scales } = chart;
    if (!chartArea || !scales.x) return;
    const xScale = scales.x;
    ctx.save();
    for (const treatment of cfg.treatments) {
      ctx.fillStyle = treatment.color;
      for (const { startIdx, endIdx } of treatment.bands) {
        const xStart = xScale.getPixelForValue(startIdx);
        const xEnd = xScale.getPixelForValue(endIdx);
        const halfStep =
          (xScale.getPixelForValue(1) - xScale.getPixelForValue(0)) / 2;
        ctx.fillRect(
          xStart - halfStep,
          chartArea.top,
          xEnd - xStart + halfStep * 2,
          chartArea.bottom - chartArea.top,
        );
      }
    }
    ctx.restore();
  },
};

ChartJS.register(
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
  treatmentBandPlugin,
);
```

Update props to accept `treatments`:

```ts
const props = defineProps<{
  migraines: Migraine[];
  period?: Period;
  treatments?: TreatmentEntry[];
}>();
```

Add a `fullDateItems` computed (analogous to FrequencyChart's `barItems`) so we can compute which indices fall in treatment periods:

```ts
const fullDateItems = computed(() => {
  const p = props.period ?? "month";
  if (p === "day")
    return averageIntensityByDay(props.migraines).map((d) => d.day);
  if (p === "week")
    return averageIntensityByWeek(props.migraines).map((d) => d.week);
  return averageIntensityByMonth(props.migraines).map((d) => d.month + "-01");
});

const treatmentBandData = computed(() => {
  const treatments = props.treatments;
  if (!treatments?.length) return [];
  const p = props.period ?? "month";
  return treatments.map((t) => {
    const bands: { startIdx: number; endIdx: number }[] = [];
    let current: { startIdx: number; endIdx: number } | null = null;
    fullDateItems.value.forEach((fullDate, i) => {
      let barEnd: string;
      if (p === "month") {
        const d = new Date(fullDate + "T00:00:00");
        barEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0)
          .toISOString()
          .slice(0, 10);
      } else if (p === "week") {
        const d = new Date(fullDate + "T00:00:00");
        barEnd = new Date(d.getTime() + 6 * 86400000)
          .toISOString()
          .slice(0, 10);
      } else {
        barEnd = fullDate;
      }
      const inTreatment = t.periods.some(
        (per) => per.start <= barEnd && per.end >= fullDate,
      );
      if (inTreatment) {
        if (!current) current = { startIdx: i, endIdx: i };
        else current.endIdx = i;
      } else {
        if (current) {
          bands.push(current);
          current = null;
        }
      }
    });
    if (current) bands.push(current);
    return { bands, color: t.color.bg };
  });
});
```

Add `treatmentBands: { treatments: treatmentBandData.value }` to `options.plugins`.

- [ ] **Step 6: Update `src/views/StatsView.vue`**

Add imports:

```ts
import { buildPerTreatmentTimelines } from "../utils/stats";
import { colorForIndex, type TreatmentEntry } from "../utils/treatmentColors";
import TreatmentLegend from "../components/charts/TreatmentLegend.vue";
```

Replace the `treatmentTimeline` computed with a `treatments` computed and a `selectedTreatments` ref:

```ts
const allTreatments = computed<TreatmentEntry[]>(() =>
  buildPerTreatmentTimelines(medocsFavoris.favoris).map((t, i) => ({
    name: t.name,
    color: colorForIndex(i),
    periods: t.periods,
  })),
);
const selectedTreatments = ref<string[]>([]);

// Auto-select all treatments when they change
watch(
  allTreatments,
  (entries) => {
    selectedTreatments.value = entries.map((e) => e.name);
  },
  { immediate: true },
);

const activeTreatments = computed(() =>
  allTreatments.value.filter((e) => selectedTreatments.value.includes(e.name)),
);
```

In the template, update the `FrequencyChart` usage and add `TreatmentLegend` below the chart card:

Replace:

```html
<FrequencyChart
  :migraines="migraines.migraines"
  :period="period"
  :treatment-timeline="treatmentTimeline"
/>
...
<div v-if="treatmentTimeline.length" class="treatment-legend">
  <span class="treatment-swatch"></span>
  <span class="treatment-label">Traitement de fond actif</span>
</div>
```

With:

```html
<FrequencyChart
  :migraines="migraines.migraines"
  :period="period"
  :treatments="activeTreatments"
/>
<TreatmentLegend
  v-if="allTreatments.length"
  :entries="allTreatments"
  :selected="selectedTreatments"
  @update:selected="selectedTreatments = $event"
/>
```

Remove the old `.treatment-legend` and `.treatment-swatch` scoped CSS rules (no longer needed).

Update `ChartDetailModal` invocation to pass `treatments` instead of `treatment-timeline`:

```html
<ChartDetailModal
  v-if="activeDetail"
  :chart="activeDetail"
  :migraines="migraines.migraines"
  :initial-period="period"
  :treatments="allTreatments"
  :selected-treatments="selectedTreatments"
  @close="activeDetail = null"
  @update:selected-treatments="selectedTreatments = $event"
/>
```

- [ ] **Step 7: Update `src/components/charts/ChartDetailModal.vue`**

Add imports:

```ts
import TreatmentLegend from "./TreatmentLegend.vue";
import type { TreatmentEntry } from "../../utils/treatmentColors";
```

Update props:

```ts
const props = defineProps<{
  chart: ChartType;
  migraines: Migraine[];
  initialPeriod?: Period;
  treatments?: TreatmentEntry[]; // replaces treatmentTimeline
  selectedTreatments?: string[];
}>();
const emit = defineEmits<{
  close: [];
  "update:selectedTreatments": [string[]];
}>();
```

Add a local selectedTreatments state initialized from prop:

```ts
const localSelected = ref<string[]>(
  props.selectedTreatments ?? props.treatments?.map((t) => t.name) ?? [],
);
watch(
  () => props.selectedTreatments,
  (v) => {
    if (v) localSelected.value = v;
  },
);
function onSelectedChange(v: string[]) {
  localSelected.value = v;
  emit("update:selectedTreatments", v);
}
const activeTreatments = computed(
  () =>
    props.treatments?.filter((t) => localSelected.value.includes(t.name)) ?? [],
);
```

Update `FrequencyChart` and `IntensityChart` in the template to pass `:treatments="activeTreatments"`:

```html
<FrequencyChart
  v-if="chart === 'frequency'"
  :migraines="migraines"
  :period="localPeriod"
  :treatments="activeTreatments"
/>
<IntensityChart
  v-else-if="chart === 'intensity'"
  :migraines="migraines"
  :period="localPeriod"
  :treatments="activeTreatments"
/>
```

Replace the old `.treatment-legend` div in `.chart-detail-stats` with `TreatmentLegend`:

```html
<TreatmentLegend
  v-if="treatments?.length"
  :entries="treatments"
  :selected="localSelected"
  @update:selected="onSelectedChange"
/>
```

Remove the old `.treatment-legend` and `.treatment-swatch` scoped CSS.

- [ ] **Step 8: Manual test**

Open Stats view with at least one long-term treatment that has a period defined. The frequency chart shows a colored band during treatment periods. The `TreatmentLegend` appears below with the treatment name and a colored swatch. If multiple treatments exist, each gets a different color. Uncheck a treatment in the legend - its band disappears from the chart. Open the expanded chart modal - the same legend and toggles appear, bands update when toggling. IntensityChart (expanded via modal) also shows treatment bands.

- [ ] **Step 9: Commit**

```bash
git add src/utils/treatmentColors.ts src/utils/stats.ts src/components/charts/TreatmentLegend.vue src/components/charts/FrequencyChart.vue src/components/charts/IntensityChart.vue src/views/StatsView.vue src/components/charts/ChartDetailModal.vue
git commit -m "feat(stats): per-treatment colored bands + interactive legend on all charts"
```

---

## Self-Review

**Spec coverage:**

- ✓ (a) Per-treatment legend visible on each chart with toggles → Task 5.
- ✓ (a) Multiple treatments get different colors → `treatmentColors.ts` palette.
- ✓ (a) Each chart individually shows the legend → TreatmentLegend in StatsView + ChartDetailModal.
- ✓ (b) No confirmation dialog on delete → Task 2 removes ConfirmDialog from MigraineFormModal and CatalogModal.
- ✓ (b) Red danger toast 8s with undo button → Task 1 (`type:'danger'`, `duration:8000`) + Task 2 (action handler).
- ✓ (b) Hover/touch pauses toast → Task 1 ToastContainer with `onPause`/`onResume`.
- ✓ (b) Animated progress bar at bottom → Task 1 CSS `toast-progress` + `@keyframes toast-progress-shrink`.
- ✓ (b) Addition toasts 3-4s (green) → default `success` = 3500ms in store.
- ✓ (b) Modification toasts blue 4s → `type:'info'` = 4000ms; ListView updated to use `'info'`.
- ✓ (c) All modals have red X from base component → AppModalCloseBtn used everywhere, Task 3.
- ✓ (c) No close on backdrop click → removed `@click.self` from MigraineFormModal + ChartDetailModal; BaseModal has none.
- ✓ (d) Modal footer buttons use AppButton → Task 4 covers MigraineFormModal + CatalogModal footers + inline edit actions.
- ✓ (d) Hover/animation/transitions on AppButton → existing transitions + hover shadow + focus ring in Task 4.

**Placeholder scan:** No TBD/TODO found.

**Type consistency:**

- `TreatmentEntry` defined in `treatmentColors.ts`, imported consistently in FrequencyChart, IntensityChart, TreatmentLegend, StatsView, ChartDetailModal.
- `ToastType` exported from `toast.ts`, used in ToastContainer.
- `AppModalCloseBtn` imported in BaseModal and all modals that use it directly.
