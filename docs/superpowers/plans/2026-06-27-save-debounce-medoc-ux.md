# Save Debounce & UX Médocs Pending Entry - Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sauvegarder vers PocketBase après 1.5s d'inactivité (au lieu d'uniquement sur changement de step), et avertir l'utilisateur s'il navigue hors du step médocs avec un champ en cours de saisie.

**Architecture:** Deux features indépendantes. Le debounce est un second `watch` sur `draft` dans `MigraineFormModal`. L'UX médocs passe par `defineExpose` dans `StepMedocs` (expose `hasPendingEntry()` et `submitPending()`) et un nouveau composant `PendingMedocDialog` à 3 options, câblé dans `MigraineFormModal`.

**Tech Stack:** Vue 3 (Composition API), TypeScript, Vitest pour les tests unitaires (les composants Vue n'ont pas de tests composants dans ce projet - vérification manuelle via `npm run dev`).

## Global Constraints

- Pas de nouveaux packages
- Suivre le style CSS existant (CSS scoped, variables CSS du thème)
- Le step index de StepMedocs est `2` (ordre : StepWhen=0, StepIntensity=1, StepMedocs=2, …)
- `canSaveDraft(draft)` est la seule condition de save - ne pas contourner
- Tous les boutons de dialog: `type="button"` pour éviter les submit accidentels

---

## Fichiers touchés

| Action | Fichier                                             | Rôle                                             |
| ------ | --------------------------------------------------- | ------------------------------------------------ |
| Modify | `src/styles/theme.css`                              | Ajouter `--color-warning` aux 3 thèmes           |
| Modify | `src/components/MigraineForm/MigraineFormModal.vue` | Debounce save + wiring dialog pending medoc      |
| Modify | `src/components/MigraineForm/StepMedocs.vue`        | Exposer `hasPendingEntry()` et `submitPending()` |
| Create | `src/components/PendingMedocDialog.vue`             | Dialog 3-options pour prise en cours             |

---

## Task 1: Ajouter `--color-warning` aux thèmes

**Files:**

- Modify: `src/styles/theme.css`

**Interfaces:**

- Produces: variable CSS `--color-warning` et `--color-warning-contrast` disponibles dans tous les composants

- [ ] **Step 1: Ajouter la variable warning dans les 3 thèmes**

Dans `src/styles/theme.css`, ajouter après `--color-info-contrast` dans chaque bloc :

Bloc `:root` (light) - après `--color-info-contrast: #ffffff;` :

```css
--color-warning: #f59e0b;
--color-warning-contrast: #ffffff;
```

Bloc `[data-theme="dark"]` - après `--color-info-contrast: #1c1726;` :

```css
--color-warning: #fbbf24;
--color-warning-contrast: #1c1726;
```

Bloc `[data-theme="migraine"]` - après `--color-info-contrast: #1c2117;` :

```css
--color-warning: #d4a847;
--color-warning-contrast: #1c2117;
```

- [ ] **Step 2: Vérifier visuellement**

Lancer `npm run dev`, ouvrir les devtools, vérifier que `--color-warning` est résolu sur `<html>` en light et dark.

- [ ] **Step 3: Commit**

```bash
git add src/styles/theme.css
git commit -m "style: add --color-warning CSS variable to all themes"
```

---

## Task 2: Save debounce dans MigraineFormModal

**Files:**

- Modify: `src/components/MigraineForm/MigraineFormModal.vue`

**Interfaces:**

- Consumes: `saveIfPossible()` (définie dans le même fichier, ligne ~164)
- Produces: `saveIfPossible()` est maintenant appelé 1.5s après le dernier changement du draft, en plus des appels existants sur navigation

- [ ] **Step 1: Ajouter `onUnmounted` à l'import Vue**

Dans le `<script setup>`, la ligne d'import Vue est actuellement :

```ts
import { ref, computed, watch, nextTick } from "vue";
```

La remplacer par :

```ts
import { ref, computed, watch, nextTick, onUnmounted } from "vue";
```

- [ ] **Step 2: Ajouter le timer de debounce et le watcher**

Après la ligne `watch(draft, (d) => { if (!props.editId) saveDraft(d) }, { deep: true })` (ligne ~210), ajouter :

```ts
let _saveDebounceTimer: ReturnType<typeof setTimeout> | null = null;

watch(
  draft,
  () => {
    if (_saveDebounceTimer) clearTimeout(_saveDebounceTimer);
    _saveDebounceTimer = setTimeout(() => {
      saveIfPossible();
      _saveDebounceTimer = null;
    }, 1500);
  },
  { deep: true },
);

onUnmounted(() => {
  if (_saveDebounceTimer) {
    clearTimeout(_saveDebounceTimer);
    _saveDebounceTimer = null;
  }
});
```

- [ ] **Step 3: Vérifier manuellement**

Lancer `npm run dev`. Ouvrir le formulaire migraine, modifier l'intensité, attendre 1.5s sans naviguer. Vérifier dans les devtools Network (ou PocketBase admin) qu'un appel PATCH/POST part vers PocketBase (seulement si connecté). En mode édition, idem : modifier un champ, attendre 1.5s, l'appel part.

- [ ] **Step 4: Commit**

```bash
git add src/components/MigraineForm/MigraineFormModal.vue
git commit -m "feat: debounce-save draft to PocketBase 1.5s after last change"
```

---

## Task 3: Exposer l'état pending dans StepMedocs

**Files:**

- Modify: `src/components/MigraineForm/StepMedocs.vue`

**Interfaces:**

- Produces: méthodes exposées via `defineExpose` :
  - `hasPendingEntry(): boolean` - `true` si `nomInput.value.trim() !== ''`
  - `submitPending(): void` - appelle `addNew()` si nomInput non vide

- [ ] **Step 1: Ajouter les fonctions exposées**

À la fin du `<script setup>`, avant la balise fermante `</script>`, ajouter :

```ts
function hasPendingEntry(): boolean {
  return nomInput.value.trim() !== "";
}

function submitPending(): void {
  addNew();
}

defineExpose({ hasPendingEntry, submitPending });
```

- [ ] **Step 2: Vérifier que `addNew` est bien accessible**

`addNew` est définie à la ligne ~153 dans `StepMedocs.vue` - elle est dans le même scope, donc accessible directement. Aucun changement de signature nécessaire.

- [ ] **Step 3: Commit**

```bash
git add src/components/MigraineForm/StepMedocs.vue
git commit -m "feat: expose hasPendingEntry and submitPending from StepMedocs"
```

---

## Task 4: Créer PendingMedocDialog

**Files:**

- Create: `src/components/PendingMedocDialog.vue`

**Interfaces:**

- Produces: composant `PendingMedocDialog` avec :
  - Props: aucune (contenu fixe)
  - Emits: `stay` | `skip` | `add-and-continue`

- [ ] **Step 1: Créer le composant**

Créer `src/components/PendingMedocDialog.vue` :

```vue
<template>
  <div class="pending-backdrop" @click.self="$emit('stay')">
    <div class="pending-dialog" role="alertdialog" aria-modal="true">
      <h3>Prise non ajoutée</h3>
      <p>Tu as saisi un médicament sans cliquer sur « Ajouter cette prise ».</p>
      <div class="pending-actions">
        <button type="button" class="btn-stay" @click="$emit('stay')">
          Compléter la saisie
        </button>
        <button
          type="button"
          class="btn-add"
          @click="$emit('add-and-continue')"
        >
          Ajouter et continuer
        </button>
        <button type="button" class="btn-skip" @click="$emit('skip')">
          Passer sans ajouter
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineEmits<{ stay: []; skip: []; "add-and-continue": [] }>();
</script>

<style scoped>
.pending-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 60;
}
.pending-dialog {
  background: var(--color-surface);
  color: var(--color-text);
  border-radius: 0.75rem;
  padding: 1.5rem;
  width: min(90vw, 360px);
}
.pending-dialog h3 {
  margin: 0 0 0.5rem;
  font-size: 1.05rem;
}
.pending-dialog p {
  margin: 0 0 1.25rem;
  color: var(--color-muted);
  font-size: 0.9rem;
}
.pending-actions {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.btn-stay {
  background: var(--color-accent);
  color: var(--color-accent-contrast);
  border: none;
  border-radius: 0.5rem;
  padding: 0.6rem 1rem;
  cursor: pointer;
  font-size: 0.9rem;
}
.btn-add {
  background: none;
  border: 1px solid var(--color-accent);
  color: var(--color-accent);
  border-radius: 0.5rem;
  padding: 0.6rem 1rem;
  cursor: pointer;
  font-size: 0.9rem;
}
.btn-skip {
  background: none;
  border: 1px solid var(--color-muted);
  color: var(--color-muted);
  border-radius: 0.5rem;
  padding: 0.6rem 1rem;
  cursor: pointer;
  font-size: 0.9rem;
}
</style>
```

- [ ] **Step 2: Commit**

```bash
git add src/components/PendingMedocDialog.vue
git commit -m "feat: add PendingMedocDialog with 3-option pending-entry warning"
```

---

## Task 5: Câbler PendingMedocDialog dans MigraineFormModal

**Files:**

- Modify: `src/components/MigraineForm/MigraineFormModal.vue`

**Interfaces:**

- Consumes (Task 3): `activeStepRef.value.hasPendingEntry()` → boolean, `activeStepRef.value.submitPending()` → void
- Consumes (Task 4): `PendingMedocDialog` - emits `stay`, `skip`, `add-and-continue`

- [ ] **Step 1: Importer PendingMedocDialog**

Dans le `<script setup>`, ajouter après les autres imports de composants :

```ts
import PendingMedocDialog from "../PendingMedocDialog.vue";
```

- [ ] **Step 2: Ajouter le ref sur le composant actif et l'état du dialog**

Après `const showDeleteConfirm = ref(false)`, ajouter :

```ts
const activeStepRef = ref<{
  hasPendingEntry?: () => boolean;
  submitPending?: () => void;
} | null>(null);
const showPendingMedocDialog = ref(false);

const MEDOCS_STEP_INDEX = 2;

const hasPendingMedoc = computed(() => {
  if (stepIndex.value !== MEDOCS_STEP_INDEX) return false;
  return activeStepRef.value?.hasPendingEntry?.() ?? false;
});
```

- [ ] **Step 3: Ajouter `ref="activeStepRef"` sur le composant dynamique**

Dans le `<template>`, modifier la ligne du `<component>` :

```html
<component
  :is="steps[stepIndex]"
  ref="activeStepRef"
  v-model="draft"
  :key="stepIndex"
  :edit-id="props.editId"
  @delete="showDeleteConfirm = true"
/>
```

- [ ] **Step 4: Extraire la navigation réelle dans `_performGoNext()`**

`goNext()` doit maintenant avoir deux comportements (naviguer ou afficher le dialog). Extraire la navigation dans une fonction interne. Remplacer la fonction `goNext()` existante par :

```ts
function _performGoNext() {
  saveIfPossible();
  const next = nextStepIndex(stepIndex.value, steps.length);
  if (next === stepIndex.value) return;
  transitionName.value = "slide-next";
  stepIndex.value = next;
  if (!props.editId) saveDraftStep(stepIndex.value);
}

function goNext() {
  if (hasPendingMedoc.value) {
    showPendingMedocDialog.value = true;
    return;
  }
  _performGoNext();
}
```

- [ ] **Step 5: Ajouter les handlers du dialog**

Après `goNext()` et `_performGoNext()`, ajouter :

```ts
function onPendingStay() {
  showPendingMedocDialog.value = false;
}

function onPendingSkip() {
  showPendingMedocDialog.value = false;
  _performGoNext();
}

function onPendingAddAndContinue() {
  activeStepRef.value?.submitPending?.();
  showPendingMedocDialog.value = false;
  _performGoNext();
}
```

- [ ] **Step 6: Ajouter le style warning sur le bouton Suiv.**

Dans le `<template>`, modifier le bouton "Suiv." pour ajouter la classe conditionnelle :

```html
<button
  v-else
  type="button"
  class="action-btn action-btn-next"
  :class="{ 'action-btn-next--warning': hasPendingMedoc }"
  @click="goNext"
>
  Suiv.
  <ArrowRight :size="16" />
</button>
```

Dans `<style scoped>`, ajouter après `.action-btn-next` :

```css
.action-btn-next--warning {
  background: var(--color-warning);
  color: var(--color-warning-contrast);
  border-color: var(--color-warning);
}
```

- [ ] **Step 7: Ajouter PendingMedocDialog dans le template**

Dans le `<template>`, après `<ConfirmDialog ... />`, ajouter :

```html
<PendingMedocDialog
  v-if="showPendingMedocDialog"
  @stay="onPendingStay"
  @skip="onPendingSkip"
  @add-and-continue="onPendingAddAndContinue"
/>
```

- [ ] **Step 8: Vérifier manuellement**

Lancer `npm run dev`. Aller sur le step Médocs (index 2). Taper un nom dans le champ médicament sans cliquer "Ajouter cette prise". Vérifier :

- Le bouton "Suiv." passe en couleur warning (amber)
- Cliquer "Suiv." ouvre le dialog "Prise non ajoutée"
- "Compléter la saisie" → ferme le dialog, reste sur le step
- "Passer sans ajouter" → navigue au step suivant, champs perdus
- "Ajouter et continuer" → la prise apparaît dans "Prises enregistrées", puis navigue

Vérifier aussi qu'avec le champ vide le bouton "Suiv." est bleu normal et navigue sans dialog.

- [ ] **Step 9: Commit**

```bash
git add src/components/MigraineForm/MigraineFormModal.vue
git commit -m "feat: warn user when navigating away from medocs step with pending entry"
```
