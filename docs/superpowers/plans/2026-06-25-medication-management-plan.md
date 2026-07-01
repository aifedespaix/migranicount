# Gestion des Médicaments Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Default the médoc time field to crisis start time + 15 minutes, make the quick-add favori pills use that same form time, capitalize médoc names on entry, let the recap step's médoc list expand to show a description on click, and add a global header button to edit favori médoc descriptions.

**Architecture:** Two new pure helper functions (`addMinutesToHHmm` in `date.ts`, `capitalizeFirstLetter` in a new `text.ts`) carry the only real logic and get unit tests, per this codebase's established convention. A new repository function + store action (`updateMedocFavoriDescription`) follow the existing `migraineRepository.ts`/Pinia-store pattern already used for `registerMedocUsage`. The remaining work is Vue SFC wiring (`StepMedocs.vue`, `StepRecap.vue`, `HeaderNav.vue`) plus one new presentational component (`MedocsEditModal.vue`), verified via `npm run build` + `npm test` + manual check, consistent with how Domain 1 (form/modal) was implemented.

**Tech Stack:** Vue 3 `<script setup>`, Pinia, Vitest, `lucide-vue-next` (already a dependency since Domain 1 - no new install needed).

## Global Constraints

- No changes to `MigraineDraft`'s shape, the `Migraine`/`MedocPris` schema, or `saveMigraine`'s logic.
- Editing a favori's description via the new header button does NOT retroactively change `description` on médocs already recorded inside past `Migraine` entries - each `MedocPris` is an independent snapshot, consistent with existing `registerMedocUsage` behavior.
- Favoris already stored with a non-capitalized name before this change are NOT migrated retroactively - only new entries going through `addNew()` are normalized. No migration mechanism exists in this project beyond the static `SCHEMA_VERSION` constant.
- `heureInput` in `StepMedocs.vue` is NOT reset after an add (neither via pill nor via the manual form) - it keeps the last value the user saw/set, so multiple médocs can be added at the same time without re-entering it.
- The "Modifier les médicaments" header button is visible only when `useMedocsFavorisStore().favoris.length > 0`.
- A médoc recap item with no `description` is not clickable (no expand) in `StepRecap.vue`.

---

### Task 1: Pure helpers - `addMinutesToHHmm` and `capitalizeFirstLetter`

**Files:**

- Modify: `src/utils/date.ts`
- Modify: `src/utils/date.test.ts`
- Create: `src/utils/text.ts`
- Create: `src/utils/text.test.ts`

**Interfaces:**

- Produces: `addMinutesToHHmm(hhmm: string, minutes: number): string` (exported from `date.ts`) - used by Task 3 to compute the default médoc time.
- Produces: `capitalizeFirstLetter(s: string): string` (exported from new `text.ts`) - used by Task 3 to normalize médoc names on entry.

- [ ] **Step 1: Write the failing tests for `addMinutesToHHmm`**

In `src/utils/date.test.ts`, change the import line:

```ts
import {
  todayISO,
  nowHHmm,
  formatRelative,
  formatDuration,
  toISODate,
  parseLooseISODate,
  parseLooseTime,
} from "./date";
```

to:

```ts
import {
  todayISO,
  nowHHmm,
  formatRelative,
  formatDuration,
  toISODate,
  parseLooseISODate,
  parseLooseTime,
  addMinutesToHHmm,
} from "./date";
```

Then append this `describe` block at the end of the file:

```ts
describe("addMinutesToHHmm", () => {
  it("adds minutes within the same hour", () => {
    expect(addMinutesToHHmm("08:00", 15)).toBe("08:15");
  });

  it("rolls over to the next hour", () => {
    expect(addMinutesToHHmm("08:50", 15)).toBe("09:05");
  });

  it("rolls over past midnight", () => {
    expect(addMinutesToHHmm("23:50", 15)).toBe("00:05");
  });

  it("handles negative minutes (subtracting)", () => {
    expect(addMinutesToHHmm("00:05", -15)).toBe("23:50");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- date.test.ts`
Expected: FAIL - `addMinutesToHHmm` is not exported from `./date` (TypeScript/import error).

- [ ] **Step 3: Implement `addMinutesToHHmm`**

In `src/utils/date.ts`, add this export (anywhere after the existing exports, before the `pad` helper at the bottom):

```ts
export function addMinutesToHHmm(hhmm: string, minutes: number): string {
  const [h, m] = hhmm.split(":").map(Number);
  const total = (((h * 60 + m + minutes) % 1440) + 1440) % 1440;
  return `${pad(Math.floor(total / 60))}:${pad(total % 60)}`;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- date.test.ts`
Expected: PASS - all `date.test.ts` tests green, including the 4 new ones.

- [ ] **Step 5: Write the failing tests for `capitalizeFirstLetter`**

Create `src/utils/text.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { capitalizeFirstLetter } from "./text";

describe("capitalizeFirstLetter", () => {
  it("capitalizes a lowercase first letter", () => {
    expect(capitalizeFirstLetter("doliprane")).toBe("Doliprane");
  });

  it("capitalizes an accented first letter", () => {
    expect(capitalizeFirstLetter("élézol")).toBe("Élézol");
  });

  it("leaves the rest of the string unchanged", () => {
    expect(capitalizeFirstLetter("ibuprofène 400")).toBe("Ibuprofène 400");
  });

  it("leaves an already-capitalized string unchanged", () => {
    expect(capitalizeFirstLetter("Doliprane")).toBe("Doliprane");
  });

  it("returns an empty string unchanged", () => {
    expect(capitalizeFirstLetter("")).toBe("");
  });
});
```

- [ ] **Step 6: Run the test to verify it fails**

Run: `npm test -- text.test.ts`
Expected: FAIL - cannot find module `./text`.

- [ ] **Step 7: Implement `text.ts`**

Create `src/utils/text.ts`:

```ts
export function capitalizeFirstLetter(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}
```

- [ ] **Step 8: Run the test to verify it passes**

Run: `npm test -- text.test.ts`
Expected: PASS - 5 tests.

- [ ] **Step 9: Run the full test suite to confirm no regressions**

Run: `npm test`
Expected: PASS - all existing + new tests green.

- [ ] **Step 10: Commit**

```bash
git add src/utils/date.ts src/utils/date.test.ts src/utils/text.ts src/utils/text.test.ts
git commit -m "feat: add addMinutesToHHmm and capitalizeFirstLetter helpers"
```

---

### Task 2: Repository + store - `updateMedocFavoriDescription`

**Files:**

- Modify: `src/storage/migraineRepository.ts`
- Modify: `src/storage/migraineRepository.test.ts`
- Modify: `src/stores/medocsFavoris.ts`
- Create: `src/stores/medocsFavoris.test.ts`

**Interfaces:**

- Consumes: nothing from Task 1.
- Produces: `updateMedocFavoriDescription(nom: string, description: string): void` (exported from `migraineRepository.ts`); `updateDescription(nom: string, description: string): void` action on `useMedocsFavorisStore()` - both used by Task 5's `MedocsEditModal.vue`.

- [ ] **Step 1: Write the failing tests for `updateMedocFavoriDescription`**

In `src/storage/migraineRepository.test.ts`, change the import block:

```ts
import {
  listMigraines,
  saveMigraine,
  deleteMigraine,
  getMigraine,
  listMedocsFavoris,
  registerMedocUsage,
  listDeclencheursFavoris,
  registerDeclencheur,
  exportAll,
  importAll,
} from "./migraineRepository";
```

to:

```ts
import {
  listMigraines,
  saveMigraine,
  deleteMigraine,
  getMigraine,
  listMedocsFavoris,
  registerMedocUsage,
  updateMedocFavoriDescription,
  listDeclencheursFavoris,
  registerDeclencheur,
  exportAll,
  importAll,
} from "./migraineRepository";
```

Then append this `describe` block at the end of the file:

```ts
describe("updateMedocFavoriDescription", () => {
  it("updates the description of an existing favori", () => {
    registerMedocUsage("Doliprane", "antidouleur");
    updateMedocFavoriDescription("Doliprane", "nouvelle description");
    expect(listMedocsFavoris()).toEqual([
      { nom: "Doliprane", description: "nouvelle description", usageCount: 1 },
    ]);
  });

  it("clears the description when given an empty string", () => {
    registerMedocUsage("Doliprane", "antidouleur");
    updateMedocFavoriDescription("Doliprane", "");
    expect(listMedocsFavoris()).toEqual([{ nom: "Doliprane", usageCount: 1 }]);
  });

  it("does nothing when the favori does not exist", () => {
    updateMedocFavoriDescription("Inexistant", "description");
    expect(listMedocsFavoris()).toEqual([]);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- migraineRepository.test.ts`
Expected: FAIL - `updateMedocFavoriDescription` is not exported from `./migraineRepository`.

- [ ] **Step 3: Implement `updateMedocFavoriDescription`**

In `src/storage/migraineRepository.ts`, add this export after `registerMedocUsage`:

```ts
export function updateMedocFavoriDescription(
  nom: string,
  description: string,
): void {
  const favoris = listMedocsFavoris();
  const existing = favoris.find((f) => f.nom === nom);
  if (!existing) return;
  existing.description = description || undefined;
  setJSON(MEDOCS_KEY, favoris);
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- migraineRepository.test.ts`
Expected: PASS - all tests green, including the 3 new ones.

- [ ] **Step 5: Write the failing test for the store action**

Create `src/stores/medocsFavoris.test.ts`:

```ts
import { describe, it, expect, beforeEach } from "vitest";
import { setActivePinia, createPinia } from "pinia";
import { useMedocsFavorisStore } from "./medocsFavoris";

beforeEach(() => {
  localStorage.clear();
  setActivePinia(createPinia());
});

describe("useMedocsFavorisStore", () => {
  it("loads existing favoris on creation", () => {
    const store = useMedocsFavorisStore();
    expect(store.favoris).toEqual([]);
  });

  it("registerUsage adds a favori and updates reactive state", () => {
    const store = useMedocsFavorisStore();
    store.registerUsage("Doliprane", "antidouleur");
    expect(store.favoris).toEqual([
      { nom: "Doliprane", description: "antidouleur", usageCount: 1 },
    ]);
  });

  it("updateDescription updates reactive state", () => {
    const store = useMedocsFavorisStore();
    store.registerUsage("Doliprane", "antidouleur");
    store.updateDescription("Doliprane", "nouvelle description");
    expect(store.favoris[0].description).toBe("nouvelle description");
  });
});
```

- [ ] **Step 6: Run the test to verify it fails**

Run: `npm test -- medocsFavoris.test.ts`
Expected: FAIL - `store.updateDescription is not a function`.

- [ ] **Step 7: Implement the store action**

Replace the full contents of `src/stores/medocsFavoris.ts` with:

```ts
import { defineStore } from "pinia";
import { ref } from "vue";
import {
  listMedocsFavoris,
  registerMedocUsage,
  updateMedocFavoriDescription,
} from "../storage/migraineRepository";

export const useMedocsFavorisStore = defineStore("medocsFavoris", () => {
  const favoris = ref(listMedocsFavoris());

  function registerUsage(nom: string, description?: string): void {
    registerMedocUsage(nom, description);
    favoris.value = listMedocsFavoris();
  }

  function updateDescription(nom: string, description: string): void {
    updateMedocFavoriDescription(nom, description);
    favoris.value = listMedocsFavoris();
  }

  return { favoris, registerUsage, updateDescription };
});
```

- [ ] **Step 8: Run the test to verify it passes**

Run: `npm test -- medocsFavoris.test.ts`
Expected: PASS - 3 tests.

- [ ] **Step 9: Run the full test suite**

Run: `npm test`
Expected: PASS - all tests green.

- [ ] **Step 10: Commit**

```bash
git add src/storage/migraineRepository.ts src/storage/migraineRepository.test.ts src/stores/medocsFavoris.ts src/stores/medocsFavoris.test.ts
git commit -m "feat: add updateMedocFavoriDescription repository function and store action"
```

---

### Task 3: `StepMedocs.vue` - default time, quick-add time, capitalize on entry

**Files:**

- Modify: `src/components/MigraineForm/StepMedocs.vue`

**Interfaces:**

- Consumes: `addMinutesToHHmm(hhmm: string, minutes: number): string` and `capitalizeFirstLetter(s: string): string` (Task 1).
- Produces: nothing consumed by later tasks in this plan.

- [ ] **Step 1: Replace the script block**

In `src/components/MigraineForm/StepMedocs.vue`, find the entire `<script setup>` block:

```ts
<script setup lang="ts">
import { ref } from 'vue'
import { newId } from '../../utils/uuid'
import { nowHHmm } from '../../utils/date'
import { useMedocsFavorisStore } from '../../stores/medocsFavoris'
import TimeField from '../TimeField.vue'
import type { MigraineDraft } from './draft'
import type { MedocFavori } from '../../types/migraine'

const model = defineModel<MigraineDraft>({ required: true })
const favoris = useMedocsFavorisStore()

const nomInput = ref('')
const descriptionInput = ref('')
const heureInput = ref(nowHHmm())

function addFromFavori(f: MedocFavori) {
  model.value.medocs.push({ id: newId(), nom: f.nom, description: f.description, heure: nowHHmm() })
  favoris.registerUsage(f.nom, f.description)
}

function addNew() {
  if (!nomInput.value) return
  model.value.medocs.push({ id: newId(), nom: nomInput.value, description: descriptionInput.value || undefined, heure: heureInput.value })
  favoris.registerUsage(nomInput.value, descriptionInput.value || undefined)
  nomInput.value = ''
  descriptionInput.value = ''
  heureInput.value = nowHHmm()
}

function remove(index: number) {
  model.value.medocs.splice(index, 1)
}
</script>
```

Replace it with:

```ts
<script setup lang="ts">
import { ref } from 'vue'
import { newId } from '../../utils/uuid'
import { addMinutesToHHmm } from '../../utils/date'
import { capitalizeFirstLetter } from '../../utils/text'
import { useMedocsFavorisStore } from '../../stores/medocsFavoris'
import TimeField from '../TimeField.vue'
import type { MigraineDraft } from './draft'
import type { MedocFavori } from '../../types/migraine'

const model = defineModel<MigraineDraft>({ required: true })
const favoris = useMedocsFavorisStore()

const nomInput = ref('')
const descriptionInput = ref('')
const heureInput = ref(addMinutesToHHmm(model.value.heureDebut, 15))

function addFromFavori(f: MedocFavori) {
  model.value.medocs.push({ id: newId(), nom: f.nom, description: f.description, heure: heureInput.value })
  favoris.registerUsage(f.nom, f.description)
}

function addNew() {
  if (!nomInput.value) return
  const nom = capitalizeFirstLetter(nomInput.value)
  model.value.medocs.push({ id: newId(), nom, description: descriptionInput.value || undefined, heure: heureInput.value })
  favoris.registerUsage(nom, descriptionInput.value || undefined)
  nomInput.value = ''
  descriptionInput.value = ''
}

function remove(index: number) {
  model.value.medocs.splice(index, 1)
}
</script>
```

Note what changed: `nowHHmm` import removed (no longer used in this file), `addMinutesToHHmm` and `capitalizeFirstLetter` imports added; `heureInput`'s initial value now derives from `model.value.heureDebut`; `addFromFavori` uses `heureInput.value` instead of `nowHHmm()`; `addNew` capitalizes `nomInput.value` into a local `nom` constant used for both the pushed médoc and `registerUsage`; the `heureInput.value = nowHHmm()` reset line at the end of `addNew` is removed entirely (not replaced - `heureInput` keeps its last value after any add).

- [ ] **Step 2: Type-check and build**

Run: `npm run build`
Expected: succeeds with no TypeScript errors.

- [ ] **Step 3: Run the test suite**

Run: `npm test`
Expected: PASS - unaffected (no test imports `StepMedocs.vue` directly).

- [ ] **Step 4: Manual check**

Run: `npm run dev`. Open the form, go to the "Quand ?" step and set "Heure de début" to e.g. `14:00`, then go to the "Médicaments" step:

- Confirm the heure field for a new médoc defaults to `14:15`.
- Click a favori pill: confirm the added médoc's heure is `14:15` (or whatever is currently in the heure field if you changed it).
- Add a médoc manually with a lowercase name like `doliprane`: confirm it's stored/displayed as `Doliprane`.
- Add a second médoc right after: confirm the heure field still shows the same value as before (not reset).

- [ ] **Step 5: Commit**

```bash
git add src/components/MigraineForm/StepMedocs.vue
git commit -m "feat: default médoc time to heureDebut+15min and capitalize médoc names"
```

---

### Task 4: `StepRecap.vue` - expand médoc description on click

**Files:**

- Modify: `src/components/MigraineForm/StepRecap.vue`

**Interfaces:**

- Consumes: nothing from earlier tasks.
- Produces: nothing consumed by later tasks.

- [ ] **Step 1: Update the script block**

In `src/components/MigraineForm/StepRecap.vue`, find:

```ts
<script setup lang="ts">
import { computed } from 'vue'
import { intensityColor, intensityLabel } from '../../utils/intensity'
import { localisationLabel } from '../../utils/localisation'
import type { MigraineDraft } from './draft'

const model = defineModel<MigraineDraft>({ required: true })

const intensityColorValue = computed(() => intensityColor(model.value.intensite))
const intensityLabelValue = computed(() => intensityLabel(model.value.intensite))
const localisationLabelValue = computed(() => localisationLabel(model.value.localisation))
const hasSymptoms = computed(
  () => model.value.avortee || model.value.nausee || model.value.vomissement || model.value.aura
)
</script>
```

Replace with:

```ts
<script setup lang="ts">
import { ref, computed } from 'vue'
import { intensityColor, intensityLabel } from '../../utils/intensity'
import { localisationLabel } from '../../utils/localisation'
import type { MigraineDraft } from './draft'

const model = defineModel<MigraineDraft>({ required: true })

const intensityColorValue = computed(() => intensityColor(model.value.intensite))
const intensityLabelValue = computed(() => intensityLabel(model.value.intensite))
const localisationLabelValue = computed(() => localisationLabel(model.value.localisation))
const hasSymptoms = computed(
  () => model.value.avortee || model.value.nausee || model.value.vomissement || model.value.aura
)

const expandedId = ref<string | null>(null)

function toggleExpanded(id: string) {
  expandedId.value = expandedId.value === id ? null : id
}
</script>
```

- [ ] **Step 2: Update the médicaments recap row template**

Find:

```html
<div class="recap-row" v-if="model.medocs.length">
  <span class="recap-icon">💊</span>
  <div class="recap-content">
    <p class="recap-label">Médicaments</p>
    <p class="recap-value">
      {{ model.medocs.map((m) => `${m.nom} (${m.heure})`).join(', ') }}
    </p>
  </div>
</div>
```

Replace with:

```html
<div class="recap-row" v-if="model.medocs.length">
  <span class="recap-icon">💊</span>
  <div class="recap-content">
    <p class="recap-label">Médicaments</p>
    <ul class="medoc-recap-list">
      <li v-for="m in model.medocs" :key="m.id">
        <button
          type="button"
          class="medoc-recap-item"
          :disabled="!m.description"
          @click="toggleExpanded(m.id)"
        >
          {{ m.nom }} ({{ m.heure }})
        </button>
        <p v-if="expandedId === m.id" class="medoc-recap-description">
          {{ m.description }}
        </p>
      </li>
    </ul>
  </div>
</div>
```

- [ ] **Step 3: Add the recap list CSS**

Find:

```css
<style scoped>
.intensity-badge {
```

Replace with:

```css
<style scoped>
.medoc-recap-list {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  margin: 0;
  padding: 0;
}
.medoc-recap-item {
  background: none;
  border: none;
  padding: 0;
  font: inherit;
  color: var(--color-text);
  text-align: left;
  cursor: pointer;
}
.medoc-recap-item:disabled {
  cursor: default;
  opacity: 0.7;
}
.medoc-recap-description {
  margin: 0.2rem 0 0;
  font-size: 0.85rem;
  color: var(--color-muted);
}
.intensity-badge {
```

- [ ] **Step 4: Type-check and build**

Run: `npm run build`
Expected: succeeds with no errors.

- [ ] **Step 5: Run the test suite**

Run: `npm test`
Expected: PASS.

- [ ] **Step 6: Manual check**

Run: `npm run dev`. Add a migraine with two médocs: one with a description, one without. Reach the Récapitulatif step:

- Confirm the médoc with a description is clickable and toggles its description below it on click, and clicking it again collapses it.
- Confirm clicking the médoc with a description while another's description is expanded collapses the other one (only one open at a time).
- Confirm the médoc without a description has no pointer cursor and clicking it does nothing.

- [ ] **Step 7: Commit**

```bash
git add src/components/MigraineForm/StepRecap.vue
git commit -m "feat: expand médoc description on click in the form recap step"
```

---

### Task 5: `MedocsEditModal.vue` and header button

**Files:**

- Create: `src/components/MedocsEditModal.vue`
- Modify: `src/components/HeaderNav.vue`

**Interfaces:**

- Consumes: `useMedocsFavorisStore()`'s `favoris` (reactive array) and `updateDescription(nom: string, description: string): void` action (Task 2).
- Produces: nothing consumed by later tasks in this plan.

- [ ] **Step 1: Create `MedocsEditModal.vue`**

Create `src/components/MedocsEditModal.vue`:

```vue
<template>
  <div class="medocs-edit-backdrop" @click.self="$emit('close')">
    <div class="medocs-edit-dialog" role="dialog" aria-modal="true">
      <h3>Modifier les médicaments</h3>
      <div v-for="f in favoris.favoris" :key="f.nom" class="medoc-edit-row">
        <p class="medoc-edit-nom">{{ f.nom }}</p>
        <textarea
          v-model="descriptions[f.nom]"
          placeholder="Description (optionnel)"
          rows="2"
        />
      </div>
      <p v-if="favoris.favoris.length === 0" class="medoc-edit-empty">
        Aucun médicament enregistré.
      </p>
      <div class="medocs-edit-actions">
        <button type="button" class="btn-secondary" @click="$emit('close')">
          Annuler
        </button>
        <button type="button" class="btn-primary" @click="save">
          Enregistrer
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive } from "vue";
import { useMedocsFavorisStore } from "../stores/medocsFavoris";

const emit = defineEmits<{ close: [] }>();
const favoris = useMedocsFavorisStore();

const descriptions = reactive<Record<string, string>>(
  Object.fromEntries(favoris.favoris.map((f) => [f.nom, f.description ?? ""])),
);

function save() {
  for (const f of favoris.favoris) {
    favoris.updateDescription(f.nom, descriptions[f.nom]);
  }
  emit("close");
}
</script>

<style scoped>
.medocs-edit-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 60;
}
.medocs-edit-dialog {
  background: var(--color-surface);
  color: var(--color-text);
  border-radius: 0.75rem;
  padding: 1.5rem;
  width: min(90vw, 420px);
  max-height: 80vh;
  overflow-y: auto;
}
.medocs-edit-dialog h3 {
  margin: 0 0 1rem;
  font-size: 1.05rem;
}
.medoc-edit-row {
  margin-bottom: 0.75rem;
}
.medoc-edit-nom {
  margin: 0 0 0.3rem;
  font-weight: 600;
}
.medoc-edit-row textarea {
  width: 100%;
  padding: 0.5rem 0.75rem;
  border-radius: 0.5rem;
  border: 1px solid var(--color-muted);
  background: var(--color-bg);
  color: var(--color-text);
  font: inherit;
  resize: vertical;
  box-sizing: border-box;
}
.medoc-edit-empty {
  color: var(--color-muted);
  font-size: 0.9rem;
}
.medocs-edit-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-top: 1rem;
}
.btn-secondary {
  background: none;
  border: 1px solid var(--color-muted);
  color: var(--color-text);
  border-radius: 0.5rem;
  padding: 0.5rem 1rem;
  cursor: pointer;
}
.btn-primary {
  background: var(--color-accent);
  color: var(--color-accent-contrast);
  border: none;
  border-radius: 0.5rem;
  padding: 0.5rem 1rem;
  cursor: pointer;
}
</style>
```

- [ ] **Step 2: Wire the header button**

In `src/components/HeaderNav.vue`, find the entire file contents:

```vue
<template>
  <header class="header-nav">
    <span class="logo">Migracount</span>
    <nav>
      <RouterLink :to="{ name: 'stats' }">Stats</RouterLink>
      <RouterLink :to="{ name: 'liste' }">Liste</RouterLink>
      <RouterLink :to="{ name: 'settings' }">Réglages</RouterLink>
    </nav>
    <button class="add-btn" @click="$emit('add')">+ Ajouter</button>
  </header>
</template>

<script setup lang="ts">
defineEmits<{ add: [] }>();
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
  padding: 0 1.5rem;
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-muted);
  z-index: 30;
  box-sizing: border-box;
}
.header-nav nav a {
  margin-right: 1.5rem;
  color: var(--color-muted);
  text-decoration: none;
}
.header-nav nav a.router-link-active {
  color: var(--color-accent);
  font-weight: 600;
}
.add-btn {
  background: var(--color-accent);
  color: var(--color-accent-contrast);
  border: none;
  border-radius: 0.5rem;
  padding: 0.5rem 1rem;
  cursor: pointer;
}
</style>
```

Replace it with:

```vue
<template>
  <header class="header-nav">
    <span class="logo">Migracount</span>
    <nav>
      <RouterLink :to="{ name: 'stats' }">Stats</RouterLink>
      <RouterLink :to="{ name: 'liste' }">Liste</RouterLink>
      <RouterLink :to="{ name: 'settings' }">Réglages</RouterLink>
    </nav>
    <button
      v-if="favoris.favoris.length > 0"
      type="button"
      class="edit-medocs-btn"
      title="Modifier les médicaments"
      aria-label="Modifier les médicaments"
      @click="showMedocsEdit = true"
    >
      <Pencil :size="18" />
    </button>
    <button class="add-btn" @click="$emit('add')">+ Ajouter</button>
  </header>
  <MedocsEditModal v-if="showMedocsEdit" @close="showMedocsEdit = false" />
</template>

<script setup lang="ts">
import { ref } from "vue";
import { Pencil } from "lucide-vue-next";
import { useMedocsFavorisStore } from "../stores/medocsFavoris";
import MedocsEditModal from "./MedocsEditModal.vue";

defineEmits<{ add: [] }>();

const favoris = useMedocsFavorisStore();
const showMedocsEdit = ref(false);
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
  padding: 0 1.5rem;
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-muted);
  z-index: 30;
  box-sizing: border-box;
}
.header-nav nav a {
  margin-right: 1.5rem;
  color: var(--color-muted);
  text-decoration: none;
}
.header-nav nav a.router-link-active {
  color: var(--color-accent);
  font-weight: 600;
}
.edit-medocs-btn {
  background: none;
  border: none;
  color: var(--color-muted);
  cursor: pointer;
  padding: 0.5rem;
  margin-right: 0.5rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.add-btn {
  background: var(--color-accent);
  color: var(--color-accent-contrast);
  border: none;
  border-radius: 0.5rem;
  padding: 0.5rem 1rem;
  cursor: pointer;
}
</style>
```

- [ ] **Step 3: Type-check and build**

Run: `npm run build`
Expected: succeeds with no errors.

- [ ] **Step 4: Run the test suite**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Manual check**

Run: `npm run dev`. With no médocs ever recorded, confirm the pencil button is absent from the header. Add a migraine with at least one médoc, save it, then:

- Confirm the pencil button now appears in the header.
- Click it: confirm the modal lists the favori(s) with an editable description textarea.
- Change a description and click "Enregistrer": confirm the modal closes and reopening it shows the updated description.
- Change a description and click "Annuler" (or click the backdrop): confirm the change is discarded.
- Confirm a past migraine's médoc `description` (visible in the form's edit mode or recap) is unaffected by editing the favori description here.

- [ ] **Step 6: Commit**

```bash
git add src/components/MedocsEditModal.vue src/components/HeaderNav.vue
git commit -m "feat: add header button to edit favori médoc descriptions"
```

---

## Self-Review Notes

- **Spec coverage:** default time + quick-add time → Task 3; capitalize → Task 1 (helper) + Task 3 (wiring); recap click-to-expand → Task 4; header edit button → Task 2 (repo/store) + Task 5 (UI). All spec sections have a corresponding task.
- **Type consistency:** `addMinutesToHHmm(hhmm: string, minutes: number): string` (Task 1) is called identically in Task 3 (`addMinutesToHHmm(model.value.heureDebut, 15)`). `capitalizeFirstLetter(s: string): string` (Task 1) is called identically in Task 3. `updateMedocFavoriDescription(nom: string, description: string): void` (Task 2) and the store's `updateDescription` wrapper share the same parameter names and order, consumed identically in Task 5 (`favoris.updateDescription(f.nom, descriptions[f.nom])`).
- **No placeholders:** all steps show full code, no "TBD"/"similar to above".
