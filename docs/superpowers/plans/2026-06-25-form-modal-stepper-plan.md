# Formulaire & Modale de Saisie — Stepper, Ergonomie, Boutons, Swipe — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split the Localisation/Déclencheurs step in two, make the mobile modal occupy ≥2/3 of the screen with a stable footer, restyle the three action buttons (Enregistrer/Suivant/Précédent) with color + icon + conditional enable logic, and add swipe-left/right navigation between steps with a directional slide animation.

**Architecture:** Two new tiny pure-logic modules (`canSaveDraft` in `draft.ts`, `nextStepIndex`/`prevStepIndex` in a new `stepNav.ts`) carry the only real branching logic and get unit tests, following this codebase's existing convention of testing logic in plain `.ts` files rather than mounting Vue components (no `@vue/test-utils` usage exists anywhere in `src/`, despite it being a devDependency). The Vue SFC changes (step split, button styling, swipe wiring, CSS) are presentation/wiring with no branching of their own, verified via `npm run build` (type-check) and manual browser check (no existing component-test pattern to follow).

**Tech Stack:** Vue 3 `<script setup>`, Vitest, `lucide-vue-next` (icons, new dependency), `@vueuse/core` (`useSwipe`, new dependency).

## Global Constraints

- No changes to `MigraineDraft`'s shape, validation rules, or storage layer (`migraineRepository.ts`, `storage.ts`) — presentation/interaction only.
- `Enregistrer` button: enabled only when `stepIndex === steps.length - 1 && Boolean(draft.date) && Boolean(draft.heureDebut)`.
- New CSS variables `--color-success`, `--color-success-contrast`, `--color-info`, `--color-info-contrast` added to all three theme blocks in `src/styles/theme.css` (`:root`, `[data-theme="dark"]`, `[data-theme="migraine"]`).
- `[data-theme="migraine"]` already disables all transitions/animations globally (`* { transition: none !important }` in `theme.css:31-36`) — no special-casing needed for the new slide transition, it's automatically neutralized there.
- Desktop modal (`@media (min-width: 1024px)` in `MigraineFormModal.vue`) keeps its current sizing (`width: 480px; max-height: 85vh`) — the 2/3-screen `min-height` rule applies to the mobile (default) rule only.

---

### Task 1: Pure helpers — `canSaveDraft` and step-index bounds

**Files:**
- Modify: `src/components/MigraineForm/draft.ts`
- Modify: `src/components/MigraineForm/draft.test.ts`
- Create: `src/components/MigraineForm/stepNav.ts`
- Create: `src/components/MigraineForm/stepNav.test.ts`

**Interfaces:**
- Produces: `canSaveDraft(d: MigraineDraft): boolean` (exported from `draft.ts`) — used by Task 3 to gate the Enregistrer button.
- Produces: `nextStepIndex(current: number, length: number): number` and `prevStepIndex(current: number, length: number): number` (exported from `stepNav.ts`) — used by Task 4 for swipe/button navigation. Both clamp: return `current` unchanged if already at the relevant boundary.

- [ ] **Step 1: Write the failing tests for `canSaveDraft`**

Open `src/components/MigraineForm/draft.test.ts` and replace its entire contents with:

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { emptyDraft, loadDraft, saveDraft, clearDraft, canSaveDraft } from './draft'

beforeEach(() => localStorage.clear())

describe('draft persistence', () => {
  it('loadDraft returns emptyDraft shape when nothing saved', () => {
    const loaded = loadDraft()
    expect(loaded.intensite).toBe(emptyDraft().intensite)
    expect(loaded.medocs).toEqual([])
  })

  it('saveDraft then loadDraft round-trips', () => {
    const d = emptyDraft()
    d.intensite = 7
    saveDraft(d)
    expect(loadDraft().intensite).toBe(7)
  })

  it('clearDraft resets to emptyDraft', () => {
    const d = emptyDraft()
    d.intensite = 7
    saveDraft(d)
    clearDraft()
    expect(loadDraft().intensite).toBe(emptyDraft().intensite)
  })
})

describe('canSaveDraft', () => {
  it('returns true when date and heureDebut are both set', () => {
    expect(canSaveDraft(emptyDraft())).toBe(true)
  })

  it('returns false when date is empty', () => {
    expect(canSaveDraft({ ...emptyDraft(), date: '' })).toBe(false)
  })

  it('returns false when heureDebut is empty', () => {
    expect(canSaveDraft({ ...emptyDraft(), heureDebut: '' })).toBe(false)
  })

  it('returns false when both date and heureDebut are empty', () => {
    expect(canSaveDraft({ ...emptyDraft(), date: '', heureDebut: '' })).toBe(false)
  })
})
```

- [ ] **Step 2: Run the tests to verify the new ones fail**

Run: `npm test -- draft.test.ts`
Expected: FAIL — `canSaveDraft` is not exported from `./draft` (TypeScript/import error).

- [ ] **Step 3: Implement `canSaveDraft`**

In `src/components/MigraineForm/draft.ts`, add this export after `clearDraft`:

```ts
export function canSaveDraft(d: MigraineDraft): boolean {
  return Boolean(d.date) && Boolean(d.heureDebut)
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- draft.test.ts`
Expected: PASS — 7 tests (3 existing + 4 new).

- [ ] **Step 5: Write the failing tests for step bounds**

Create `src/components/MigraineForm/stepNav.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { nextStepIndex, prevStepIndex } from './stepNav'

describe('nextStepIndex', () => {
  it('advances by one when not at the last step', () => {
    expect(nextStepIndex(0, 8)).toBe(1)
    expect(nextStepIndex(3, 8)).toBe(4)
  })

  it('clamps at the last step', () => {
    expect(nextStepIndex(7, 8)).toBe(7)
  })
})

describe('prevStepIndex', () => {
  it('goes back by one when not at the first step', () => {
    expect(prevStepIndex(7, 8)).toBe(6)
    expect(prevStepIndex(1, 8)).toBe(0)
  })

  it('clamps at the first step', () => {
    expect(prevStepIndex(0, 8)).toBe(0)
  })
})
```

- [ ] **Step 6: Run the test to verify it fails**

Run: `npm test -- stepNav.test.ts`
Expected: FAIL — cannot find module `./stepNav`.

- [ ] **Step 7: Implement `stepNav.ts`**

Create `src/components/MigraineForm/stepNav.ts`:

```ts
export function nextStepIndex(current: number, length: number): number {
  return current >= length - 1 ? current : current + 1
}

export function prevStepIndex(current: number, length: number): number {
  return current <= 0 ? current : current - 1
}
```

- [ ] **Step 8: Run the test to verify it passes**

Run: `npm test -- stepNav.test.ts`
Expected: PASS — 4 tests.

- [ ] **Step 9: Run the full test suite to confirm no regressions**

Run: `npm test`
Expected: PASS — all existing + new tests green.

- [ ] **Step 10: Commit**

```bash
git add src/components/MigraineForm/draft.ts src/components/MigraineForm/draft.test.ts src/components/MigraineForm/stepNav.ts src/components/MigraineForm/stepNav.test.ts
git commit -m "feat: add canSaveDraft and step-index bound helpers"
```

---

### Task 2: Split `StepLocationTriggers.vue` into `StepLocation.vue` + `StepTriggers.vue`

**Files:**
- Create: `src/components/MigraineForm/StepLocation.vue`
- Create: `src/components/MigraineForm/StepTriggers.vue`
- Delete: `src/components/MigraineForm/StepLocationTriggers.vue`
- Modify: `src/components/MigraineForm/MigraineFormModal.vue`

**Interfaces:**
- Consumes: nothing from Task 1.
- Produces: `steps` array now has 8 entries (was 7); `stepTitles` now has 8 entries matching. Task 3 and Task 4 will further edit `MigraineFormModal.vue`'s `<script setup>` and `<style scoped>` blocks, but not the `steps`/`stepTitles` declarations.

- [ ] **Step 1: Create `StepLocation.vue`**

Create `src/components/MigraineForm/StepLocation.vue`:

```vue
<template>
  <div class="step">
    <h2>Localisation</h2>
    <div class="pill-group">
      <button
        v-for="opt in localisations"
        :key="opt"
        type="button"
        class="pill-btn"
        :class="{ active: model.localisation === opt }"
        @click="model.localisation = opt"
      >
        {{ labels[opt] }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { MigraineDraft } from './draft'

const model = defineModel<MigraineDraft>({ required: true })

const localisations = ['gauche', 'droite', 'bilaterale', 'nuque'] as const
const labels: Record<typeof localisations[number], string> = {
  gauche: 'Gauche', droite: 'Droite', bilaterale: 'Bilatérale', nuque: 'Nuque',
}
</script>
```

- [ ] **Step 2: Create `StepTriggers.vue`**

Create `src/components/MigraineForm/StepTriggers.vue`:

```vue
<template>
  <div class="step">
    <h2>Déclencheurs</h2>
    <div class="pill-group">
      <button
        v-for="tag in declencheurs.tags()"
        :key="tag"
        type="button"
        class="pill-btn"
        :class="{ active: model.declencheurs.includes(tag) }"
        @click="toggleTag(tag)"
      >
        {{ tag }}
      </button>
    </div>
    <form class="trigger-add-form" @submit.prevent="addCustomTag">
      <input v-model="customTag" placeholder="Ajouter un déclencheur" />
      <button type="submit" class="pill-btn">Ajouter</button>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useDeclencheursStore } from '../../stores/declencheurs'
import type { MigraineDraft } from './draft'

const model = defineModel<MigraineDraft>({ required: true })
const declencheurs = useDeclencheursStore()
const customTag = ref('')

function toggleTag(tag: string) {
  const i = model.value.declencheurs.indexOf(tag)
  if (i >= 0) model.value.declencheurs.splice(i, 1)
  else model.value.declencheurs.push(tag)
}

function addCustomTag() {
  if (!customTag.value) return
  declencheurs.register(customTag.value)
  model.value.declencheurs.push(customTag.value)
  customTag.value = ''
}
</script>

<style scoped>
.trigger-add-form {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.5rem;
}
.trigger-add-form input {
  padding: 0.5rem 0.75rem;
  border-radius: 0.5rem;
  border: 1px solid var(--color-muted);
  background: var(--color-surface);
  color: var(--color-text);
  flex: 1;
}
</style>
```

- [ ] **Step 3: Delete the old combined step**

```bash
git rm src/components/MigraineForm/StepLocationTriggers.vue
```

- [ ] **Step 4: Update imports and arrays in `MigraineFormModal.vue`**

In `src/components/MigraineForm/MigraineFormModal.vue`, find:

```ts
import StepWhen from './StepWhen.vue'
import StepIntensity from './StepIntensity.vue'
import StepMedocs from './StepMedocs.vue'
import StepSymptoms from './StepSymptoms.vue'
import StepLocationTriggers from './StepLocationTriggers.vue'
import StepNotes from './StepNotes.vue'
import StepRecap from './StepRecap.vue'
```

Replace with:

```ts
import StepWhen from './StepWhen.vue'
import StepIntensity from './StepIntensity.vue'
import StepMedocs from './StepMedocs.vue'
import StepSymptoms from './StepSymptoms.vue'
import StepLocation from './StepLocation.vue'
import StepTriggers from './StepTriggers.vue'
import StepNotes from './StepNotes.vue'
import StepRecap from './StepRecap.vue'
```

Then find:

```ts
const steps = [StepWhen, StepIntensity, StepMedocs, StepSymptoms, StepLocationTriggers, StepNotes, StepRecap]
const stepTitles = ['Quand ?', 'Intensité', 'Médicaments', 'Symptômes', 'Localisation & déclencheurs', 'Notes', 'Récapitulatif']
```

Replace with:

```ts
const steps = [StepWhen, StepIntensity, StepMedocs, StepSymptoms, StepLocation, StepTriggers, StepNotes, StepRecap]
const stepTitles = ['Quand ?', 'Intensité', 'Médicaments', 'Symptômes', 'Localisation', 'Déclencheurs', 'Notes', 'Récapitulatif']
```

- [ ] **Step 5: Type-check and build**

Run: `npm run build`
Expected: succeeds with no TypeScript errors (no references to `StepLocationTriggers` remain).

- [ ] **Step 6: Run the test suite**

Run: `npm test`
Expected: PASS — unaffected by this change (no test imports `StepLocationTriggers` or the new step components).

- [ ] **Step 7: Manual check**

Run: `npm run dev`, open the migraine form, step through to confirm "Localisation" and "Déclencheurs" now appear as two separate steps with working pill buttons and custom-trigger input.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: split Localisation and Déclencheurs into separate form steps"
```

---

### Task 3: Restyle action buttons (Enregistrer/Suivant/Précédent) with color, icon, and validation

**Files:**
- Modify: `package.json` / `package-lock.json` (via `npm install`)
- Modify: `src/styles/theme.css`
- Modify: `src/components/MigraineForm/MigraineFormModal.vue`

**Interfaces:**
- Consumes: `canSaveDraft` from `draft.ts` (Task 1).
- Produces: CSS classes `.action-btn-save`, `.action-btn-next`, `.action-btn-prev` and CSS variables `--color-success`, `--color-success-contrast`, `--color-info`, `--color-info-contrast` — Task 4 does not touch these, only adds slide/transition CSS alongside them.

- [ ] **Step 1: Install the icon library**

```bash
npm install lucide-vue-next
```

- [ ] **Step 2: Add success/info color variables to all three themes**

In `src/styles/theme.css`, find:

```css
:root {
  --color-bg: #faf8fc;
  --color-surface: #ffffff;
  --color-text: #2a2333;
  --color-accent: #8b5cf6;
  --color-accent-contrast: #ffffff;
  --color-muted: #6b6275;
  --color-danger: #d64545;
}
```

Replace with:

```css
:root {
  --color-bg: #faf8fc;
  --color-surface: #ffffff;
  --color-text: #2a2333;
  --color-accent: #8b5cf6;
  --color-accent-contrast: #ffffff;
  --color-muted: #6b6275;
  --color-danger: #d64545;
  --color-success: #2f9e58;
  --color-success-contrast: #ffffff;
  --color-info: #3b82f6;
  --color-info-contrast: #ffffff;
}
```

Find:

```css
[data-theme="dark"] {
  --color-bg: #1c1726;
  --color-surface: #271f33;
  --color-text: #ece8f0;
  --color-accent: #a78bfa;
  --color-accent-contrast: #1c1726;
  --color-muted: #a39db0;
  --color-danger: #f08a8a;
}
```

Replace with:

```css
[data-theme="dark"] {
  --color-bg: #1c1726;
  --color-surface: #271f33;
  --color-text: #ece8f0;
  --color-accent: #a78bfa;
  --color-accent-contrast: #1c1726;
  --color-muted: #a39db0;
  --color-danger: #f08a8a;
  --color-success: #4ade80;
  --color-success-contrast: #1c1726;
  --color-info: #60a5fa;
  --color-info-contrast: #1c1726;
}
```

Find:

```css
[data-theme="migraine"] {
  --color-bg: #2b2420;
  --color-surface: #3a322b;
  --color-text: #ddd4c8;
  --color-accent: #8fa876;
  --color-accent-contrast: #1c2117;
  --color-muted: #a89b8a;
  --color-danger: #c97b5f;
}
```

Replace with:

```css
[data-theme="migraine"] {
  --color-bg: #2b2420;
  --color-surface: #3a322b;
  --color-text: #ddd4c8;
  --color-accent: #8fa876;
  --color-accent-contrast: #1c2117;
  --color-muted: #a89b8a;
  --color-danger: #c97b5f;
  --color-success: #7c9a5e;
  --color-success-contrast: #1c2117;
  --color-info: #6f8fae;
  --color-info-contrast: #1c2117;
}
```

- [ ] **Step 3: Wire `canSave` and import icons in `MigraineFormModal.vue`**

In `src/components/MigraineForm/MigraineFormModal.vue`, find:

```ts
import { ref, computed, watch } from 'vue'
```

Replace with:

```ts
import { ref, computed, watch } from 'vue'
import { Save, ArrowRight, ArrowLeft } from 'lucide-vue-next'
```

Find:

```ts
import { loadDraft, saveDraft, clearDraft } from './draft'
```

Replace with:

```ts
import { loadDraft, saveDraft, clearDraft, canSaveDraft } from './draft'
```

Find:

```ts
const progressPercent = computed(() => ((stepIndex.value + 1) / steps.length) * 100)
```

Replace with:

```ts
const progressPercent = computed(() => ((stepIndex.value + 1) / steps.length) * 100)
const canSave = computed(() => canSaveDraft(draft.value))
```

- [ ] **Step 4: Update the action buttons template**

Find:

```html
      <div class="modal-actions">
        <button type="button" class="action-btn" :disabled="stepIndex === 0" @click="stepIndex--">
          Précédent
        </button>
        <button
          type="button"
          class="action-btn action-btn-primary"
          :disabled="stepIndex !== steps.length - 1"
          @click="submit"
        >
          Enregistrer
        </button>
        <button
          type="button"
          class="action-btn"
          :disabled="stepIndex === steps.length - 1"
          @click="stepIndex++"
        >
          Suivant
        </button>
      </div>
```

Replace with:

```html
      <div class="modal-actions">
        <button
          type="button"
          class="action-btn action-btn-prev"
          :disabled="stepIndex === 0"
          @click="stepIndex--"
        >
          <ArrowLeft :size="18" />
          Précédent
        </button>
        <button
          type="button"
          class="action-btn action-btn-save"
          :disabled="stepIndex !== steps.length - 1 || !canSave"
          @click="submit"
        >
          <Save :size="18" />
          Enregistrer
        </button>
        <button
          type="button"
          class="action-btn action-btn-next"
          :disabled="stepIndex === steps.length - 1"
          @click="stepIndex++"
        >
          Suivant
          <ArrowRight :size="18" />
        </button>
      </div>
```

- [ ] **Step 5: Update the button CSS**

Find:

```css
.action-btn {
  flex: 1;
  padding: 0.65rem 1rem;
  border-radius: 0.5rem;
  border: 1px solid var(--color-muted);
  background: var(--color-surface);
  color: var(--color-text);
  font-size: 0.9rem;
  cursor: pointer;
}
.action-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.action-btn-primary {
  background: var(--color-accent);
  color: var(--color-accent-contrast);
  border-color: var(--color-accent);
}
.action-btn-primary:disabled {
  background: var(--color-muted);
  border-color: var(--color-muted);
  color: var(--color-surface);
  opacity: 0.6;
}
```

Replace with:

```css
.action-btn {
  flex: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  padding: 0.65rem 1rem;
  border-radius: 0.5rem;
  border: 1px solid var(--color-muted);
  background: var(--color-surface);
  color: var(--color-text);
  font-size: 0.9rem;
  cursor: pointer;
}
.action-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.action-btn-save {
  background: var(--color-success);
  color: var(--color-success-contrast);
  border-color: var(--color-success);
}
.action-btn-save:disabled {
  background: var(--color-muted);
  border-color: var(--color-muted);
  color: var(--color-surface);
  opacity: 0.6;
}
.action-btn-next {
  background: var(--color-info);
  color: var(--color-info-contrast);
  border-color: var(--color-info);
}
.action-btn-next:disabled {
  background: var(--color-muted);
  border-color: var(--color-muted);
  color: var(--color-surface);
  opacity: 0.6;
}
.action-btn-prev {
  background: transparent;
  color: var(--color-info);
  border-color: var(--color-info);
}
.action-btn-prev:disabled {
  color: var(--color-muted);
  border-color: var(--color-muted);
  opacity: 0.6;
}
```

- [ ] **Step 6: Type-check and build**

Run: `npm run build`
Expected: succeeds with no errors.

- [ ] **Step 7: Run the test suite**

Run: `npm test`
Expected: PASS.

- [ ] **Step 8: Manual check**

Run: `npm run dev`. Open the form:
- Confirm "Précédent" is a blue ghost button with a left arrow, disabled on step 1.
- Confirm "Suivant" is a solid blue button with a right arrow, disabled on the last step.
- Confirm "Enregistrer" is a solid green button with a save icon, disabled until the Récapitulatif step AND date/heureDebut are non-empty (try clearing the date on step "Quand ?" via `DateField`, then reach Récapitulatif — Enregistrer should stay disabled).
- Switch theme to dark and to migraine (Settings) and confirm the green/blue tones still look coherent.

- [ ] **Step 9: Commit**

```bash
git add package.json package-lock.json src/styles/theme.css src/components/MigraineForm/MigraineFormModal.vue
git commit -m "feat: restyle form action buttons with color, icons and save validation"
```

---

### Task 4: Swipe navigation, directional transition, and mobile modal sizing

**Files:**
- Modify: `package.json` / `package-lock.json` (via `npm install`)
- Modify: `src/components/MigraineForm/MigraineFormModal.vue`

**Interfaces:**
- Consumes: `nextStepIndex`, `prevStepIndex` from `stepNav.ts` (Task 1).
- Produces: final state of `MigraineFormModal.vue` for this domain — no further tasks in this plan touch it.

- [ ] **Step 1: Install the gesture library**

```bash
npm install @vueuse/core
```

- [ ] **Step 2: Replace direct step-index mutation with bounds-checked navigation**

In `src/components/MigraineForm/MigraineFormModal.vue`, find:

```ts
import { ref, computed, watch } from 'vue'
import { Save, ArrowRight, ArrowLeft } from 'lucide-vue-next'
```

Replace with:

```ts
import { ref, computed, watch } from 'vue'
import { useSwipe } from '@vueuse/core'
import { Save, ArrowRight, ArrowLeft } from 'lucide-vue-next'
import { nextStepIndex, prevStepIndex } from './stepNav'
```

Find:

```ts
const progressPercent = computed(() => ((stepIndex.value + 1) / steps.length) * 100)
const canSave = computed(() => canSaveDraft(draft.value))
```

Replace with:

```ts
const progressPercent = computed(() => ((stepIndex.value + 1) / steps.length) * 100)
const canSave = computed(() => canSaveDraft(draft.value))

const modalBodyRef = ref<HTMLElement | null>(null)
const transitionName = ref<'slide-next' | 'slide-prev'>('slide-next')

function goNext() {
  const next = nextStepIndex(stepIndex.value, steps.length)
  if (next === stepIndex.value) return
  transitionName.value = 'slide-next'
  stepIndex.value = next
}

function goPrev() {
  const prev = prevStepIndex(stepIndex.value, steps.length)
  if (prev === stepIndex.value) return
  transitionName.value = 'slide-prev'
  stepIndex.value = prev
}

useSwipe(modalBodyRef, {
  onSwipeEnd(_event, direction) {
    if (direction === 'left') goNext()
    else if (direction === 'right') goPrev()
  },
})
```

- [ ] **Step 3: Wire the buttons to `goNext`/`goPrev` and wrap the step in a `<Transition>`**

Find:

```html
      <div class="modal-body">
        <component :is="steps[stepIndex]" v-model="draft" />
      </div>
```

Replace with:

```html
      <div class="modal-body" ref="modalBodyRef">
        <Transition :name="transitionName">
          <component :is="steps[stepIndex]" v-model="draft" :key="stepIndex" />
        </Transition>
      </div>
```

Find:

```html
        <button
          type="button"
          class="action-btn action-btn-prev"
          :disabled="stepIndex === 0"
          @click="stepIndex--"
        >
          <ArrowLeft :size="18" />
          Précédent
        </button>
```

Replace with:

```html
        <button
          type="button"
          class="action-btn action-btn-prev"
          :disabled="stepIndex === 0"
          @click="goPrev"
        >
          <ArrowLeft :size="18" />
          Précédent
        </button>
```

Find:

```html
        <button
          type="button"
          class="action-btn action-btn-next"
          :disabled="stepIndex === steps.length - 1"
          @click="stepIndex++"
        >
          Suivant
          <ArrowRight :size="18" />
        </button>
```

Replace with:

```html
        <button
          type="button"
          class="action-btn action-btn-next"
          :disabled="stepIndex === steps.length - 1"
          @click="goNext"
        >
          Suivant
          <ArrowRight :size="18" />
        </button>
```

- [ ] **Step 4: Add the slide transition CSS, mobile modal min-height, and modal-body containment**

Find:

```css
.modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 1.25rem 1.5rem;
}
```

Replace with:

```css
.modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 1.25rem 1.5rem;
  position: relative;
}
.slide-next-enter-active,
.slide-next-leave-active,
.slide-prev-enter-active,
.slide-prev-leave-active {
  transition: transform 0.22s ease, opacity 0.22s ease;
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  padding: 1.25rem 1.5rem;
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
```

Find:

```css
.modal-sheet {
  background: var(--color-surface);
  width: 100%;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  border-radius: 1rem 1rem 0 0;
  overflow: hidden;
}
```

Replace with:

```css
.modal-sheet {
  background: var(--color-surface);
  width: 100%;
  min-height: 66.6667vh;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  border-radius: 1rem 1rem 0 0;
  overflow: hidden;
}
```

`min-height` is inherited by the desktop media-query block unless explicitly overridden there, so add `min-height: 0;` to the desktop rule to avoid forcing 2/3-viewport height on desktop, where the constraint doesn't apply.

Find:

```css
@media (min-width: 1024px) {
  .modal-backdrop {
    align-items: center;
    justify-content: center;
  }
  .modal-sheet {
    width: 480px;
    max-height: 85vh;
    border-radius: 1rem;
  }
}
```

Replace with:

```css
@media (min-width: 1024px) {
  .modal-backdrop {
    align-items: center;
    justify-content: center;
  }
  .modal-sheet {
    width: 480px;
    min-height: 0;
    max-height: 85vh;
    border-radius: 1rem;
  }
}
```

- [ ] **Step 5: Type-check and build**

Run: `npm run build`
Expected: succeeds with no errors.

- [ ] **Step 6: Run the test suite**

Run: `npm test`
Expected: PASS — `stepNav.test.ts` from Task 1 already covers the boundary logic that `goNext`/`goPrev` depend on.

- [ ] **Step 7: Manual check**

Run: `npm run dev`, open the form on a mobile-width viewport (browser devtools device toolbar with touch emulation, or an actual phone):
- Confirm the modal sheet visually fills at least 2/3 of the screen height even on the short "Localisation" step, and the footer buttons don't shift position when switching steps.
- Swipe left on the form body: confirm it advances to the next step with content sliding in from the right.
- Swipe right: confirm it goes back with content sliding in from the left.
- Swipe left repeatedly past the last step (Récapitulatif): confirm it stays on Récapitulatif (no crash, no over-advance).
- Click "Suivant"/"Précédent" buttons: confirm the same directional slide plays as with swipe.
- Switch to the "migraine" theme in Settings and confirm step changes are instant (no slide animation), consistent with that theme's global `transition: none !important`.

- [ ] **Step 8: Commit**

```bash
git add package.json package-lock.json src/components/MigraineForm/MigraineFormModal.vue
git commit -m "feat: add swipe navigation with directional slide animation to the form"
```

---

## Self-Review Notes

- **Spec coverage:** stepper split → Task 2; modal 2/3-height + stable footer → Task 4 Step 4 (footer stability already came for free from the existing flexbox layout, documented in the spec); conditional/styled buttons → Task 3; swipe + directional animation → Task 4. All spec sections have a corresponding task.
- **Type consistency:** `canSaveDraft(d: MigraineDraft): boolean` (Task 1) is imported and called identically in Task 3 (`canSaveDraft(draft.value)`). `nextStepIndex`/`prevStepIndex` signatures `(current: number, length: number): number` (Task 1) match their call sites in Task 4 (`nextStepIndex(stepIndex.value, steps.length)`).
- **No placeholders:** all steps show full code, no "TBD"/"similar to above".
