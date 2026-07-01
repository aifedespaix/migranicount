# Améliorations Formulaire / Stats / Paramètres - Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix and improve the form modal (clickable stepper nav, medication inline edit, avortée tri-state, remove duplicate titles, mobile width fix, draft resume dialog), fix stats mobile chart/card overflow, and clean up settings (remove OpenDyslexic, normalize button design).

**Architecture:** Vue 3 SPA. Changes are isolated to Vue SFCs and a few TS utility files. No new dependencies needed.

**Tech Stack:** Vue 3 + Composition API, TypeScript, Pinia, Vitest.

## Global Constraints

- All data in `localStorage` only - no network calls.
- No breaking changes to existing stored migraine data.
- Keep existing test suite passing (`npm run test`).
- `avortee` type change must be backward-compatible with stored `true`/`false` boolean values.
- Mobile breakpoint is `1023px` (below = mobile).

---

## File Structure

```
Modified:
  src/types/migraine.ts                  - widen avortee: boolean → boolean | 'probable'
  src/components/MigraineForm/draft.ts   - add hasSavedDraft, saveDraftStep, loadDraftStep, fix clearDraft
  src/components/MigraineForm/draft.test.ts - add tests for new draft helpers
  src/components/MigraineForm/MigraineFormModal.vue - stepper nav, step restore, save step on navigate
  src/components/MigraineForm/StepWhen.vue      - remove <h2>
  src/components/MigraineForm/StepIntensity.vue - remove <h2>
  src/components/MigraineForm/StepMedocs.vue    - remove <h2>, inline time edit, avortée tri-state
  src/components/MigraineForm/StepSymptoms.vue  - remove <h2> and avortée pill
  src/components/MigraineForm/StepLocation.vue  - remove <h2>
  src/components/MigraineForm/StepTriggers.vue  - remove <h2>
  src/components/MigraineForm/StepNotes.vue     - remove <h2>
  src/components/MigraineForm/StepRecap.vue     - remove <h2>, update avortée display
  src/utils/stats.ts                     - medocEfficacy handles boolean | 'probable'
  src/utils/stats.test.ts               - add 'probable' test case
  src/App.vue                            - replace toast draft with dialog; hasDraft state
  src/components/HeaderNav.vue           - accept hasDraft prop, conditional button label
  src/components/BottomNav.vue           - accept hasDraft prop, visual indicator on FAB
  src/views/StatsView.vue               - overflow-y: auto, card min-width: 0, font clamping
  src/views/SettingsView.vue            - remove OpenDyslexic, normalize export/import design
  src/stores/settings.ts               - reset 'opendyslexic' → 'none' on load
```

---

### Task 1: Remove duplicate step titles + Add clickable stepper navigation

**Files:**

- Modify: `src/components/MigraineForm/MigraineFormModal.vue`
- Modify: `src/components/MigraineForm/StepWhen.vue`
- Modify: `src/components/MigraineForm/StepIntensity.vue`
- Modify: `src/components/MigraineForm/StepMedocs.vue`
- Modify: `src/components/MigraineForm/StepSymptoms.vue`
- Modify: `src/components/MigraineForm/StepLocation.vue`
- Modify: `src/components/MigraineForm/StepTriggers.vue`
- Modify: `src/components/MigraineForm/StepNotes.vue`
- Modify: `src/components/MigraineForm/StepRecap.vue`

**Interfaces:**

- Produces: `goToStep(i: number)` in MigraineFormModal.vue, replaces "Étape X/Y + h1" with a horizontal scrollable clickable stepper row.

- [ ] **Step 1: Replace modal header with clickable stepper bar in `MigraineFormModal.vue`**

In `MigraineFormModal.vue`, replace the entire `<header class="modal-header">` block (lines 4–18) with:

```html
<header class="modal-header">
  <div class="stepper-nav" role="tablist">
    <button
      v-for="(label, i) in stepShortTitles"
      :key="i"
      type="button"
      class="stepper-btn"
      :class="{ active: i === stepIndex, past: i < stepIndex }"
      role="tab"
      :aria-selected="i === stepIndex"
      :aria-label="stepTitles[i]"
      @click="goToStep(i)"
    >
      <span class="stepper-num">{{ i + 1 }}</span>
      <span class="stepper-label">{{ label }}</span>
    </button>
  </div>
  <button
    type="button"
    class="modal-close-btn"
    :title="props.editId ? 'Fermer' : 'Fermer (brouillon conservé)'"
    aria-label="Fermer"
    @click="requestClose"
  >
    ×
  </button>
</header>
```

In the `<script setup>` section, add after the existing `const stepTitles = [...]` line:

```ts
const stepShortTitles = [
  "Quand",
  "Intensité",
  "Médocs",
  "Symptômes",
  "Lieu",
  "Déclencheurs",
  "Notes",
  "Récap",
];

function goToStep(i: number) {
  if (i === stepIndex.value) return;
  transitionName.value = i > stepIndex.value ? "slide-next" : "slide-prev";
  stepIndex.value = i;
}
```

Add CSS in `<style scoped>` (keep existing styles, append these):

```css
.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1rem 0.5rem;
  gap: 0.5rem;
}
.stepper-nav {
  display: flex;
  gap: 0.25rem;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
  flex: 1;
  min-width: 0;
}
.stepper-nav::-webkit-scrollbar {
  display: none;
}
.stepper-btn {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.15rem;
  padding: 0.3rem 0.5rem;
  border-radius: 0.4rem;
  border: 1px solid transparent;
  background: none;
  cursor: pointer;
  color: var(--color-muted);
  scroll-snap-align: start;
  min-width: 2.5rem;
}
.stepper-btn.past {
  color: var(--color-accent);
  opacity: 0.6;
}
.stepper-btn.active {
  color: var(--color-accent);
  border-color: var(--color-accent);
  background: color-mix(in srgb, var(--color-accent) 10%, transparent);
}
.stepper-num {
  font-size: 0.65rem;
  font-weight: 700;
  line-height: 1;
}
.stepper-label {
  font-size: 0.6rem;
  white-space: nowrap;
}
```

Also remove the old `.modal-header-text`, `.modal-progress`, `.modal-title` CSS rules since they're replaced.

- [ ] **Step 2: Remove `<h2>` from all step components**

In each of the following files, remove the `<h2>...</h2>` line (the first child of `<div class="step">`). The stepper navigation now serves as the step title indicator.

Files to edit (remove the `<h2>` line from each):

- `src/components/MigraineForm/StepWhen.vue`: remove `<h2>Quand ?</h2>`
- `src/components/MigraineForm/StepIntensity.vue`: remove `<h2>Intensité</h2>`
- `src/components/MigraineForm/StepMedocs.vue`: remove `<h2>Médicaments</h2>`
- `src/components/MigraineForm/StepSymptoms.vue`: remove `<h2>Symptômes</h2>`
- `src/components/MigraineForm/StepLocation.vue`: remove its `<h2>`
- `src/components/MigraineForm/StepTriggers.vue`: remove its `<h2>`
- `src/components/MigraineForm/StepNotes.vue`: remove its `<h2>Notes</h2>`
- `src/components/MigraineForm/StepRecap.vue`: remove `<h2>Récapitulatif</h2>`

- [ ] **Step 3: Auto-scroll the stepper to show active step**

In `MigraineFormModal.vue`, add a watcher after the existing watchers:

```ts
import { watch, nextTick, ref } from "vue";

const stepperNavRef = ref<HTMLElement | null>(null);

// In template, add ref: <div class="stepper-nav" ref="stepperNavRef" role="tablist">

watch(stepIndex, async (i) => {
  await nextTick();
  const btn = stepperNavRef.value?.querySelectorAll(".stepper-btn")[i] as
    | HTMLElement
    | undefined;
  btn?.scrollIntoView({
    behavior: "smooth",
    block: "nearest",
    inline: "center",
  });
});
```

Update the template to add `ref="stepperNavRef"` on `.stepper-nav`.

- [ ] **Step 4: Manual verification**

```bash
npm run dev
```

Open the form, confirm:

1. The stepper bar shows 8 abbreviated chips (Quand, Intensité, Médocs…)
2. The active step chip is highlighted in accent color
3. Past steps show dimmed accent
4. Clicking any chip navigates directly to that step with the correct slide animation
5. The step titles are NOT duplicated inside the step body (no `<h2>` visible)
6. The modal close button (×) is on the right

- [ ] **Step 5: Commit**

```bash
git add src/components/MigraineForm/
git commit -m "feat: replace step counter with clickable stepper nav, remove duplicate step h2 titles"
```

---

### Task 2: Fix mobile modal width overflow

**Files:**

- Modify: `src/components/MigraineForm/MigraineFormModal.vue` (CSS)

**Interfaces:**

- Produces: modal-sheet never exceeds viewport width on any mobile device.

- [ ] **Step 1: Add overflow constraint to modal-sheet**

In `MigraineFormModal.vue` `<style scoped>`, update the `.modal-sheet` rule:

```css
.modal-sheet {
  background: var(--color-surface);
  width: 100%;
  max-width: 100vw; /* ← add */
  box-sizing: border-box; /* ← add */
  min-height: 66.6667vh;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  border-radius: 1rem 1rem 0 0;
  overflow: hidden;
}
```

Also add `overflow-x: hidden` to `.modal-body`:

```css
.modal-body {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden; /* ← add */
  padding: 1.25rem 1.5rem;
  position: relative;
}
```

- [ ] **Step 2: Manual verification on narrow screen**

In browser DevTools, switch to a 375px (iPhone SE) or 320px (narrow) viewport. Open the form. Verify:

1. The modal does not extend beyond the screen width
2. No horizontal scroll bar appears
3. Inputs wrap correctly

- [ ] **Step 3: Commit**

```bash
git add src/components/MigraineForm/MigraineFormModal.vue
git commit -m "fix: constrain modal width to viewport on mobile (no horizontal overflow)"
```

---

### Task 3: StepMedocs - inline time editing and avortée tri-state

**Files:**

- Modify: `src/types/migraine.ts`
- Modify: `src/components/MigraineForm/StepMedocs.vue`
- Modify: `src/components/MigraineForm/StepSymptoms.vue`
- Modify: `src/components/MigraineForm/StepRecap.vue`
- Modify: `src/utils/stats.ts`
- Modify: `src/utils/stats.test.ts`

**Interfaces:**

- Consumes: `MedocPris.heure` (editable inline), `Migraine.avortee: boolean | 'probable'`.
- Produces: `avortee: boolean | 'probable'` union type (backward-compat: stored `true`/`false` remain valid), inline `<TimeField>` per medoc row, avortée tri-state selector in StepMedocs (visible when medocs > 0).

- [ ] **Step 1: Widen avortee type in `src/types/migraine.ts`**

Change line `avortee: boolean` to:

```ts
avortee: boolean | "probable";
```

Full updated interface for reference:

```ts
export interface Migraine {
  id: string;
  date: string;
  heureDebut: string;
  heureFin: string | null;
  medocs: MedocPris[];
  intensite: number;
  avortee: boolean | "probable"; // ← widened
  nausee: boolean;
  vomissement: boolean;
  aura: boolean;
  localisation: "gauche" | "droite" | "bilaterale" | "nuque" | null;
  declencheurs: string[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
}
```

- [ ] **Step 2: Update `medocEfficacy` in `src/utils/stats.ts`**

In the `medocEfficacy` function, change:

```ts
if (m.avortee) bucket.avortee += 1;
```

to:

```ts
if (m.avortee === true || m.avortee === "probable") bucket.avortee += 1;
```

Same change in `efficacyRanking` (it calls `medocEfficacy`, no direct avortee access needed).

- [ ] **Step 3: Write failing test for 'probable' in `src/utils/stats.test.ts`**

In the `medocEfficacy` describe block, add after the existing test:

```ts
it('counts "probable" as avortee in pctAvortee', () => {
  const data = [
    makeMigraine({
      medocs: [{ id: "1", nom: "Triptan", heure: "08:00" }],
      avortee: "probable",
    }),
    makeMigraine({
      medocs: [{ id: "2", nom: "Triptan", heure: "08:00" }],
      avortee: false,
    }),
  ];
  const result = medocEfficacy(data);
  expect(result.find((r) => r.nom === "Triptan")?.pctAvortee).toBe(50);
});
```

- [ ] **Step 4: Run test, verify it fails**

```bash
npm run test -- src/utils/stats.test.ts
```

Expected: FAIL - `medocEfficacy` does not handle `'probable'` yet (this is the pre-Step-2 state if run before Step 2 changes).

_Note: If you already applied Step 2, this test should pass immediately - skip to Step 5._

- [ ] **Step 5: Run full test suite, verify all pass**

```bash
npm run test
```

Expected: PASS - the new test and all existing tests pass.

- [ ] **Step 6: Update `StepMedocs.vue` - inline time edit + avortée tri-state**

Replace the full template of `src/components/MigraineForm/StepMedocs.vue` with:

```vue
<template>
  <div class="step">
    <div class="pill-group">
      <button
        v-for="f in favoris.favoris"
        :key="f.nom"
        type="button"
        class="pill-btn"
        @click="addFromFavori(f)"
      >
        {{ f.nom }}
      </button>
    </div>

    <div v-for="(p, i) in model.medocs" :key="p.id" class="form-card medoc-row">
      <span class="medoc-nom">{{ p.nom }}</span>
      <TimeField v-model="model.medocs[i].heure" class="medoc-heure-inline" />
      <button
        type="button"
        class="icon-btn"
        @click="remove(i)"
        aria-label="Supprimer"
      >
        ✕
      </button>
    </div>

    <div v-if="model.medocs.length > 0" class="avortee-section">
      <p class="field-label">Migraine avortée par ce traitement ?</p>
      <div class="pill-group">
        <button
          type="button"
          class="pill-btn"
          :class="{ active: model.avortee === true }"
          @click="model.avortee = true"
        >
          Oui
        </button>
        <button
          type="button"
          class="pill-btn"
          :class="{ active: model.avortee === 'probable' }"
          @click="model.avortee = 'probable'"
        >
          Probable
        </button>
        <button
          type="button"
          class="pill-btn"
          :class="{ active: model.avortee === false }"
          @click="model.avortee = false"
        >
          Non
        </button>
      </div>
    </div>

    <form class="medoc-add-form" @submit.prevent="addNew">
      <input v-model="nomInput" placeholder="Nom du médicament" required />
      <input v-model="descriptionInput" placeholder="Description (optionnel)" />
      <TimeField v-model="heureInput" />
      <button type="submit" class="pill-btn">+ Ajouter une prise</button>
    </form>
  </div>
</template>
```

Add to `<style scoped>`:

```css
.medoc-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.medoc-nom {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.medoc-heure-inline {
  flex-shrink: 0;
}
.avortee-section {
  margin-top: 0.75rem;
  padding-top: 0.75rem;
  border-top: 1px solid var(--color-bg);
}
```

- [ ] **Step 7: Remove avortée pill from `StepSymptoms.vue`**

In `src/components/MigraineForm/StepSymptoms.vue`, remove the `<button v-if="model.medocs.length > 0"...>Migraine avortée...</button>` block entirely. The template should only contain the Nausée, Vomissement, Aura pills.

- [ ] **Step 8: Update avortée display in `StepRecap.vue`**

In `src/components/MigraineForm/StepRecap.vue`, find the symptoms `recap-row` and update the avortée span:

Replace:

```html
<span v-if="model.avortee" class="pill-btn active">Avortée</span>
```

With:

```html
<span v-if="model.avortee === true" class="pill-btn active">Avortée ✓</span>
<span
  v-else-if="model.avortee === 'probable'"
  class="pill-btn active"
  style="background: var(--color-muted)"
  >Avortée (probable)</span
>
```

Also update the `hasSymptoms` computed in `StepRecap.vue` `<script setup>`:

```ts
const hasSymptoms = computed(
  () =>
    model.value.avortee ||
    model.value.nausee ||
    model.value.vomissement ||
    model.value.aura,
);
```

This already works correctly: `false` is falsy, `true` and `'probable'` are truthy - no change needed.

- [ ] **Step 9: Manual verification**

```bash
npm run dev
```

Open the form, navigate to step 3 (Médocs). Verify:

1. Adding a medication shows it with its name + an editable time field inline
2. Editing the time in the inline field updates the draft immediately
3. When at least 1 med is added, the "Migraine avortée" selector appears with Oui/Probable/Non pills
4. Selecting an option highlights the pill
5. Navigate to Symptômes step - NO avortée option there anymore
6. Recap shows "Avortée ✓" or "Avortée (probable)" depending on choice

- [ ] **Step 10: Run tests**

```bash
npm run test
```

Expected: all PASS.

- [ ] **Step 11: Commit**

```bash
git add src/types/migraine.ts src/components/MigraineForm/StepMedocs.vue src/components/MigraineForm/StepSymptoms.vue src/components/MigraineForm/StepRecap.vue src/utils/stats.ts src/utils/stats.test.ts
git commit -m "feat: inline medoc time editing + avortée tri-state (oui/probable/non) in medication step"
```

---

### Task 4: Draft resume dialog - replace toast with modal dialog

**Files:**

- Modify: `src/components/MigraineForm/draft.ts`
- Modify: `src/components/MigraineForm/draft.test.ts`
- Modify: `src/components/MigraineForm/MigraineFormModal.vue`
- Modify: `src/App.vue`
- Modify: `src/components/HeaderNav.vue`
- Modify: `src/components/BottomNav.vue`

**Interfaces:**

- Consumes: `hasSavedDraft()`, `saveDraftStep(i)`, `loadDraftStep()` from `draft.ts`.
- Produces: When a non-empty draft exists, the "Ajouter"/"+" button changes to "Reprendre" (visual indicator). Clicking it shows a `ConfirmDialog` asking to resume or start fresh. Resuming restores the form at the saved step. Starting fresh clears the draft and opens step 0.

- [ ] **Step 1: Write failing tests for new draft helpers in `draft.test.ts`**

Add to `src/components/MigraineForm/draft.test.ts` (after existing tests):

```ts
import { hasSavedDraft, saveDraftStep, loadDraftStep } from "./draft";

describe("hasSavedDraft", () => {
  it("returns false when no draft saved", () => {
    expect(hasSavedDraft()).toBe(false);
  });

  it("returns true after saveDraft", () => {
    saveDraft(emptyDraft());
    expect(hasSavedDraft()).toBe(true);
  });

  it("returns false after clearDraft", () => {
    saveDraft(emptyDraft());
    clearDraft();
    expect(hasSavedDraft()).toBe(false);
  });
});

describe("saveDraftStep / loadDraftStep", () => {
  it("loadDraftStep returns 0 when nothing saved", () => {
    expect(loadDraftStep()).toBe(0);
  });

  it("saveDraftStep then loadDraftStep round-trips", () => {
    saveDraftStep(4);
    expect(loadDraftStep()).toBe(4);
  });

  it("clearDraft also resets step to 0", () => {
    saveDraftStep(4);
    clearDraft();
    expect(loadDraftStep()).toBe(0);
  });
});
```

- [ ] **Step 2: Run test, verify it fails**

```bash
npm run test -- src/components/MigraineForm/draft.test.ts
```

Expected: FAIL - `hasSavedDraft`, `saveDraftStep`, `loadDraftStep` not exported from `draft.ts`.

- [ ] **Step 3: Implement new helpers in `draft.ts`**

Replace the full content of `src/components/MigraineForm/draft.ts` with:

```ts
import { getJSON, setJSON } from "../../storage/storage";
import { todayISO, nowHHmm } from "../../utils/date";
import type { Migraine } from "../../types/migraine";

export type MigraineDraft = Omit<Migraine, "id" | "createdAt" | "updatedAt"> & {
  id?: string;
};

const DRAFT_KEY = "draft";
const DRAFT_STEP_KEY = "draft-step";

export function emptyDraft(): MigraineDraft {
  return {
    date: todayISO(),
    heureDebut: nowHHmm(),
    heureFin: null,
    medocs: [],
    intensite: 5,
    avortee: false,
    nausee: false,
    vomissement: false,
    aura: false,
    localisation: null,
    declencheurs: [],
    notes: "",
  };
}

export function loadDraft(): MigraineDraft {
  return getJSON<MigraineDraft>(DRAFT_KEY, emptyDraft());
}

export function saveDraft(d: MigraineDraft): void {
  setJSON(DRAFT_KEY, d);
}

export function clearDraft(): void {
  localStorage.removeItem("migracount:draft");
  localStorage.removeItem("migracount:draft-step");
}

export function hasSavedDraft(): boolean {
  return localStorage.getItem("migracount:draft") !== null;
}

export function saveDraftStep(index: number): void {
  setJSON(DRAFT_STEP_KEY, index);
}

export function loadDraftStep(): number {
  return getJSON<number>(DRAFT_STEP_KEY, 0);
}

export function canSaveDraft(d: MigraineDraft): boolean {
  return Boolean(d.date) && Boolean(d.heureDebut);
}
```

- [ ] **Step 4: Run tests, verify they pass**

```bash
npm run test -- src/components/MigraineForm/draft.test.ts
```

Expected: all PASS.

- [ ] **Step 5: Update `MigraineFormModal.vue` - restore and save step index**

In `MigraineFormModal.vue` `<script setup>`, make these changes:

1. Import the new helpers (add to the draft import line):

```ts
import {
  loadDraft,
  saveDraft,
  clearDraft,
  canSaveDraft,
  loadDraftStep,
  saveDraftStep,
} from "./draft";
```

2. Change `stepIndex` initialization to restore from saved step for new (non-edit) forms:

```ts
const stepIndex = ref(props.editId ? steps.length - 1 : loadDraftStep());
```

3. Update `goNext`, `goPrev`, `goToStep` to save step after navigating. Add after each `stepIndex.value = ...` assignment:

```ts
if (!props.editId) saveDraftStep(stepIndex.value);
```

So `goNext` becomes:

```ts
function goNext() {
  const next = nextStepIndex(stepIndex.value, steps.length);
  if (next === stepIndex.value) return;
  transitionName.value = "slide-next";
  stepIndex.value = next;
  if (!props.editId) saveDraftStep(stepIndex.value);
}
```

`goPrev` becomes:

```ts
function goPrev() {
  const prev = prevStepIndex(stepIndex.value, steps.length);
  if (prev === stepIndex.value) return;
  transitionName.value = "slide-prev";
  stepIndex.value = prev;
  if (!props.editId) saveDraftStep(stepIndex.value);
}
```

`goToStep` becomes:

```ts
function goToStep(i: number) {
  if (i === stepIndex.value) return;
  transitionName.value = i > stepIndex.value ? "slide-next" : "slide-prev";
  stepIndex.value = i;
  if (!props.editId) saveDraftStep(stepIndex.value);
}
```

- [ ] **Step 6: Update `App.vue` - replace toast approach with dialog**

Replace the full `<script setup>` content of `src/App.vue` with:

```ts
import { ref } from "vue";
import { useRouter } from "vue-router";
import { useSwipe } from "@vueuse/core";
import HeaderNav from "./components/HeaderNav.vue";
import BottomNav from "./components/BottomNav.vue";
import MigraineFormModal from "./components/MigraineForm/MigraineFormModal.vue";
import ConfirmDialog from "./components/ConfirmDialog.vue";
import ToastContainer from "./components/ToastContainer.vue";
import { useSettingsStore } from "./stores/settings";
import { useToastStore } from "./stores/toast";
import { hasSavedDraft, clearDraft } from "./components/MigraineForm/draft";

useSettingsStore();

const router = useRouter();
const toastStore = useToastStore();
const formOpen = ref(false);
const showDraftDialog = ref(false);
const hasDraft = ref(hasSavedDraft());
const mainRef = ref<HTMLElement | null>(null);
const pageTransition = ref<"slide-next" | "slide-prev">("slide-next");

const routeOrder: Record<string, number> = { stats: 0, liste: 1 };

function openForm() {
  if (hasDraft.value) {
    showDraftDialog.value = true;
  } else {
    formOpen.value = true;
  }
}

function resumeDraft() {
  showDraftDialog.value = false;
  formOpen.value = true;
}

function startFresh() {
  showDraftDialog.value = false;
  clearDraft();
  hasDraft.value = false;
  formOpen.value = true;
}

function onFormSaved() {
  toastStore.add({
    message: "Migraine enregistrée !",
    type: "success",
    persistent: false,
  });
  formOpen.value = false;
  hasDraft.value = false;
}

function onFormClose() {
  formOpen.value = false;
  hasDraft.value = hasSavedDraft();
}

useSwipe(mainRef, {
  onSwipeEnd(_event, direction) {
    const currentOrder = routeOrder[router.currentRoute.value.name as string];
    if (currentOrder === undefined) return;
    if (direction === "left" && currentOrder < 1) {
      pageTransition.value = "slide-next";
      router.push({ name: "liste" });
    } else if (direction === "right" && currentOrder > 0) {
      pageTransition.value = "slide-prev";
      router.push({ name: "stats" });
    }
  },
});
```

Update the `<template>` in `App.vue` to add the dialog and pass `hasDraft` props:

```html
<template>
  <HeaderNav @add="openForm" :has-draft="hasDraft" />
  <main class="app-main" ref="mainRef">
    <RouterView v-slot="{ Component }">
      <Transition :name="pageTransition">
        <component :is="Component" :key="$route.name" />
      </Transition>
    </RouterView>
  </main>
  <BottomNav @add="openForm" :has-draft="hasDraft" />
  <MigraineFormModal
    v-if="formOpen"
    @close="onFormClose"
    @saved="onFormSaved"
  />
  <ConfirmDialog
    v-if="showDraftDialog"
    title="Saisie en cours"
    message="Vous avez une migraine non enregistrée. Souhaitez-vous reprendre là où vous en étiez, ou commencer une nouvelle saisie ?"
    confirm-label="Reprendre"
    cancel-label="Nouvelle saisie"
    @confirm="resumeDraft"
    @cancel="startFresh"
  />
  <ToastContainer />
</template>
```

- [ ] **Step 7: Update `HeaderNav.vue` - accept hasDraft prop, change button label**

In `src/components/HeaderNav.vue`, add the prop to `<script setup>`:

```ts
const props = defineProps<{ hasDraft?: boolean }>();
```

Update the add button in the template:

```html
<button
  class="add-btn"
  :class="{ 'add-btn--resume': props.hasDraft }"
  @click="$emit('add')"
>
  {{ props.hasDraft ? '↩ Reprendre' : '+ Ajouter' }}
</button>
```

Add CSS in `<style scoped>`:

```css
.add-btn--resume {
  background: var(--color-info);
}
```

- [ ] **Step 8: Update `BottomNav.vue` - accept hasDraft prop, visual indicator**

In `src/components/BottomNav.vue`, add prop and update FAB:

```ts
const props = defineProps<{ hasDraft?: boolean }>();
```

Update the FAB button to show a dot indicator when hasDraft:

```html
<button
  type="button"
  class="fab-center"
  :class="{ 'fab-draft': props.hasDraft }"
  @click="$emit('add')"
  aria-label="Ajouter une migraine"
>
  <Plus :size="24" />
  <span v-if="props.hasDraft" class="draft-dot" aria-hidden="true"></span>
</button>
```

Add CSS:

```css
.fab-center {
  position: relative; /* ← already there, ensure it's present */
}
.draft-dot {
  position: absolute;
  top: 2px;
  right: 2px;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--color-info);
  border: 2px solid var(--color-surface);
}
.fab-draft {
  background: var(--color-info);
}
```

- [ ] **Step 9: Manual verification**

```bash
npm run dev
```

Test the full flow:

1. Open form, fill in some fields, navigate to step 3, close the modal
2. The "+" FAB now shows a blue dot indicator; header "Ajouter" button reads "↩ Reprendre"
3. Clicking either shows a dialog: "Saisie en cours - Reprendre / Nouvelle saisie"
4. Clicking "Reprendre": form opens at step 3 with previous data intact
5. Fill more fields, close again, click again, choose "Nouvelle saisie": form opens fresh at step 1 with empty data
6. Complete a form and save: button reverts to "+ Ajouter" with no blue dot

- [ ] **Step 10: Run tests**

```bash
npm run test
```

Expected: all PASS.

- [ ] **Step 11: Commit**

```bash
git add src/components/MigraineForm/draft.ts src/components/MigraineForm/draft.test.ts src/components/MigraineForm/MigraineFormModal.vue src/App.vue src/components/HeaderNav.vue src/components/BottomNav.vue
git commit -m "feat: replace toast draft with resume dialog; save/restore step index; button label changes to Reprendre when draft exists"
```

---

### Task 5: Stats - Fix mobile chart overflow and summary card text overflow

**Files:**

- Modify: `src/views/StatsView.vue`

**Interfaces:**

- Produces: stats view scrolls vertically instead of overflowing silently; summary cards truncate long text gracefully with any font.

- [ ] **Step 1: Make stats-view scrollable and fix card overflow**

In `src/views/StatsView.vue` `<style scoped>`, update:

```css
.stats-view {
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 1rem 1.5rem;
  box-sizing: border-box;
  gap: 1rem;
  overflow-y: auto; /* ← add: allow scroll instead of overflow */
}

.summary-cards {
  display: flex;
  gap: 0.5rem; /* ← reduce gap on mobile */
  flex-shrink: 0;
}

.card {
  flex: 1;
  min-width: 0; /* ← add: allow flex items to shrink below content size */
  background: var(--color-surface);
  border-radius: 0.5rem;
  padding: 0.6rem 0.75rem; /* ← slightly reduce padding */
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.card strong {
  font-size: 0.7rem;
  color: var(--color-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.card span {
  font-size: 0.875rem;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
```

Also constrain chart-wrap on mobile to ensure Chart.js canvas is contained:

```css
.chart-wrap {
  flex: 1;
  min-height: 0; /* ← change from min-height: 200px to allow shrinking */
  height: 180px; /* ← explicit height so Chart.js knows its bounds */
  position: relative;
}
```

And make the charts-grid scrollable as a fallback on very small viewports:

```css
.charts-grid {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;
}
```

- [ ] **Step 2: Manual verification on mobile viewport**

In DevTools, set viewport to 375×667 (iPhone SE). Navigate to Stats. Verify:

1. The 3 summary cards fit in a single row without overflowing
2. With OpenDys font active (in Settings, choose Lexend or switch `data-font` in DevTools), cards still don't overflow
3. Charts render within their card boundaries - no chart canvas overflows the card border
4. If content is taller than viewport, you can scroll down smoothly

- [ ] **Step 3: Commit**

```bash
git add src/views/StatsView.vue
git commit -m "fix: stats mobile - scrollable view, constrained chart height, card text overflow ellipsis"
```

---

### Task 6: Settings - Remove OpenDyslexic option and normalize export/import buttons

**Files:**

- Modify: `src/views/SettingsView.vue`
- Modify: `src/stores/settings.ts`

**Interfaces:**

- Produces: OpenDyslexic removed from font picker; export button and import flow use normalized styling with `ConfirmDialog`.

- [ ] **Step 1: Reset 'opendyslexic' → 'none' on load in `src/stores/settings.ts`**

In `useSettingsStore`, after `const initial = getJSON<SettingsState>(STORAGE_KEY, DEFAULTS)`, add:

```ts
if (initial.dyslexicFont === "opendyslexic") initial.dyslexicFont = "none";
```

Also remove `'opendyslexic'` from the `FontChoice` union type:

```ts
export type FontChoice = "none" | "lexend";
```

- [ ] **Step 2: Update `SettingsView.vue` - remove OpenDyslexic button, normalize export/import**

Replace the full template of `src/views/SettingsView.vue` with:

```vue
<template>
  <div class="settings-view">
    <h1>Réglages</h1>

    <section>
      <h2>Apparence</h2>

      <p class="field-label">Thème</p>
      <div class="pill-group">
        <button
          type="button"
          class="pill-btn"
          :class="{ active: settings.theme === 'light' }"
          @click="settings.setTheme('light')"
        >
          Clair
        </button>
        <button
          type="button"
          class="pill-btn"
          :class="{ active: settings.theme === 'dark' }"
          @click="settings.setTheme('dark')"
        >
          Sombre
        </button>
        <button
          type="button"
          class="pill-btn"
          :class="{ active: settings.theme === 'auto' }"
          @click="settings.setTheme('auto')"
        >
          Auto
        </button>
        <button
          type="button"
          class="pill-btn"
          :class="{ active: settings.theme === 'migraine' }"
          @click="settings.setTheme('migraine')"
        >
          Migraine
        </button>
      </div>

      <p class="field-label">Police</p>
      <div class="font-options">
        <button
          type="button"
          class="font-option"
          :class="{ active: settings.dyslexicFont === 'none' }"
          @click="settings.setDyslexicFont('none')"
        >
          <span class="font-preview">Aa Bb Cc</span>
          <span class="font-option-label">Normale</span>
        </button>
        <button
          type="button"
          class="font-option"
          :class="{ active: settings.dyslexicFont === 'lexend' }"
          @click="settings.setDyslexicFont('lexend')"
        >
          <span class="font-preview" style="font-family: 'Lexend', sans-serif"
            >Aa Bb Cc</span
          >
          <span class="font-option-label">Lexend</span>
        </button>
      </div>
    </section>

    <section>
      <h2>Données</h2>
      <div class="data-actions">
        <button class="action-btn action-btn-secondary" @click="doExport">
          <span>⬇</span> Exporter mes données (JSON)
        </button>
        <label class="action-btn action-btn-secondary import-label">
          <span>⬆</span> Importer un fichier
          <input
            type="file"
            accept="application/json"
            class="sr-only"
            @change="onFileSelected"
          />
        </label>
      </div>
    </section>

    <ConfirmDialog
      v-if="confirming"
      title="Remplacer les données ?"
      message="Importer ce fichier remplacera toutes vos données actuelles. Cette action est irréversible."
      confirm-label="Oui, remplacer"
      cancel-label="Annuler"
      @confirm="confirmImport"
      @cancel="confirming = false"
    />
  </div>
</template>
```

Update `<script setup>` to import `ConfirmDialog`:

```ts
import { ref } from "vue";
import { exportAll, importAll } from "../storage/migraineRepository";
import { useSettingsStore } from "../stores/settings";
import ConfirmDialog from "../components/ConfirmDialog.vue";

const settings = useSettingsStore();
const confirming = ref(false);
const pendingJson = ref<string | null>(null);

function doExport() {
  const json = exportAll();
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `migracount-export-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function onFileSelected(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    pendingJson.value = reader.result as string;
    confirming.value = true;
  };
  reader.readAsText(file);
}

function confirmImport() {
  if (!pendingJson.value) return;
  importAll(pendingJson.value);
  location.reload();
}
```

Add/update `<style scoped>` (keep existing font-options styles, add data-actions styles):

```css
.data-actions {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  max-width: 24rem;
}
.action-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.65rem 1.25rem;
  border-radius: 0.5rem;
  border: 1px solid var(--color-muted);
  background: var(--color-surface);
  color: var(--color-text);
  font: inherit;
  font-size: 0.9rem;
  cursor: pointer;
  text-align: left;
  transition:
    border-color 0.15s ease,
    background 0.15s ease;
}
.action-btn:hover {
  border-color: var(--color-accent);
  background: color-mix(in srgb, var(--color-accent) 5%, var(--color-surface));
}
.import-label {
  cursor: pointer;
}
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
```

- [ ] **Step 3: Manual verification**

```bash
npm run dev
```

Navigate to Settings. Verify:

1. Font section shows only "Normale" and "Lexend" - no OpenDyslexic option
2. Export button is styled consistently (outlined, matches the app's button style)
3. Import button is styled the same way (it's a `<label>` wrapping hidden `<input type="file">`)
4. Clicking Import triggers the file picker, selecting a file shows the `ConfirmDialog` with proper UX copy
5. Cancelling the dialog doesn't import; confirming triggers import and page reload

- [ ] **Step 4: Run tests**

```bash
npm run test
```

Expected: all PASS (settings.test.ts if it exists should handle 'opendyslexic' being reset to 'none').

- [ ] **Step 5: Commit**

```bash
git add src/views/SettingsView.vue src/stores/settings.ts
git commit -m "feat: remove OpenDyslexic font option, normalize export/import button design with ConfirmDialog"
```

---

## Self-Review

**Spec coverage:**

- Form stepper nav + duplicate title → Task 1 ✓
- Mobile modal width → Task 2 ✓
- Medoc inline time edit → Task 3 ✓
- Avortée tri-state in medocs step → Task 3 ✓
- Draft resume dialog + button label → Task 4 ✓
- Stats chart overflow mobile → Task 5 ✓
- Stats card font overflow → Task 5 ✓
- Remove OpenDyslexic → Task 6 ✓
- Normalize export/import buttons → Task 6 ✓

**Placeholder scan:** None found - every step has concrete code.

**Type consistency:**

- `avortee: boolean | 'probable'` used consistently in `migraine.ts`, `draft.ts` (emptyDraft keeps `false`), `stats.ts` (checks `=== true || === 'probable'`), `StepMedocs.vue`, `StepRecap.vue`.
- `hasSavedDraft()`, `saveDraftStep()`, `loadDraftStep()` defined in `draft.ts` and consumed in `MigraineFormModal.vue` and `App.vue` with consistent names.
- `hasDraft` prop on `HeaderNav` and `BottomNav` is `boolean | undefined` (`hasDraft?: boolean`).

**Backward compat:**

- Existing stored migraines with `avortee: true` or `avortee: false` remain valid since `boolean` is a subset of `boolean | 'probable'`.
- `clearDraft()` now uses `localStorage.removeItem` - the test for "clearDraft resets to emptyDraft" still passes since `loadDraft()` returns `emptyDraft()` when the key is absent.
