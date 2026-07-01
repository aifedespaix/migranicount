# Migraine List Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the bare bulleted migraine list with a modern card grid, add a CSS reset for lists, and add combinable keyword + month filters with two distinct empty states.

**Architecture:** A pure, unit-tested filter helper (`src/utils/migraineFilters.ts`) computes the visible subset; `ListView.vue` owns the filter inputs and the two empty-state branches; `MigraineListItem.vue` becomes a richer card. A small global CSS reset goes into `src/styles/theme.css`.

**Tech Stack:** Vue 3 `<script setup>`, TypeScript, Vitest.

## Global Constraints

- `ul`/`ol` get a CSS reset (`list-style: none; margin: 0; padding: 0;`) in `src/styles/theme.css` - global, not view-scoped.
- Migraine card shows: relative date, intensity badge (existing), duration, médocs (existing), "Avortée" badge (existing), plus conditionally: nausée/vomissement/aura indicators (only when `true`) and localisation label (only when not `null`).
- Card hover: `border-color: var(--color-accent)` + `transform: translateY(-2px)`, matching the Home dashboard's `.chart-card` hover treatment.
- Grid: 1 column by default, 2 columns at `min-width: 768px`, 3 columns at `min-width: 1280px`.
- List view scrolls normally (NOT fit-to-screen like Home).
- Keyword search matches médoc names, notes, déclencheurs, and localisation label, case- and accent-insensitive.
- Month filter (`<input type="month">`) matches migraines whose `date` starts with the selected `YYYY-MM`.
- Filters combine with AND.
- Two distinct empty states: (a) zero migraines ever recorded → onboarding message + "Ajouter une migraine" CTA opening `MigraineFormModal`; (b) migraines exist but filters match none → "Aucun résultat pour ces filtres" + "Réinitialiser les filtres" button.
- Spec: `docs/superpowers/specs/2026-06-24-migraine-list-design.md`.

---

## File Structure

- Modify `src/styles/theme.css` - add the list reset.
- Create `src/utils/migraineFilters.ts` - pure `filterMigraines` function.
- Create `src/utils/migraineFilters.test.ts` - its tests.
- Modify `src/components/MigraineListItem.vue` - card markup/styles, new conditional badges.
- Modify `src/views/ListView.vue` - filter inputs, two empty states, grid layout.

---

### Task 1: CSS reset for lists

**Files:**

- Modify: `src/styles/theme.css`

- [ ] **Step 1: Add the reset**

Append to the end of `src/styles/theme.css`:

```css
ul,
ol {
  list-style: none;
  margin: 0;
  padding: 0;
}
```

- [ ] **Step 2: Visually verify**

Run: `npm run dev`, open `/liste`. Expected: no bullet markers or default left-padding on the migraine list (the list will still look unstyled until Task 4/5 land - just confirm no bullets/indentation).

- [ ] **Step 3: Commit**

```bash
git add src/styles/theme.css
git commit -m "feat: reset default list styles globally"
```

---

### Task 2: `filterMigraines` helper

**Files:**

- Create: `src/utils/migraineFilters.ts`
- Test: `src/utils/migraineFilters.test.ts`

**Interfaces:**

- Produces: `filterMigraines(migraines: Migraine[], opts: { keyword?: string; month?: string }): Migraine[]`

- [ ] **Step 1: Write the failing tests**

Create `src/utils/migraineFilters.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { filterMigraines } from "./migraineFilters";
import type { Migraine } from "../types/migraine";

function makeMigraine(overrides: Partial<Migraine>): Migraine {
  return {
    id: "x",
    date: "2026-06-01",
    heureDebut: "08:00",
    heureFin: "10:00",
    medocs: [],
    intensite: 5,
    avortee: false,
    nausee: false,
    vomissement: false,
    aura: false,
    localisation: null,
    declencheurs: [],
    createdAt: "",
    updatedAt: "",
    ...overrides,
  };
}

describe("filterMigraines", () => {
  it("returns all migraines when no filters are given", () => {
    const data = [makeMigraine({ id: "a" }), makeMigraine({ id: "b" })];
    expect(filterMigraines(data, {})).toHaveLength(2);
  });

  it("filters by keyword matching a médoc name", () => {
    const data = [
      makeMigraine({
        id: "a",
        medocs: [{ id: "1", nom: "Triptan", heure: "08:00" }],
      }),
      makeMigraine({
        id: "b",
        medocs: [{ id: "2", nom: "Doliprane", heure: "08:00" }],
      }),
    ];
    const result = filterMigraines(data, { keyword: "triptan" });
    expect(result.map((m) => m.id)).toEqual(["a"]);
  });

  it("filters by keyword matching notes, case- and accent-insensitive", () => {
    const data = [
      makeMigraine({ id: "a", notes: "Crise après café" }),
      makeMigraine({ id: "b", notes: "Sans rapport" }),
    ];
    const result = filterMigraines(data, { keyword: "CAFE" });
    expect(result.map((m) => m.id)).toEqual(["a"]);
  });

  it("filters by keyword matching a déclencheur", () => {
    const data = [
      makeMigraine({ id: "a", declencheurs: ["stress", "fatigue"] }),
      makeMigraine({ id: "b", declencheurs: ["alcool"] }),
    ];
    const result = filterMigraines(data, { keyword: "fatigue" });
    expect(result.map((m) => m.id)).toEqual(["a"]);
  });

  it("filters by keyword matching the localisation label", () => {
    const data = [
      makeMigraine({ id: "a", localisation: "bilaterale" }),
      makeMigraine({ id: "b", localisation: "nuque" }),
    ];
    const result = filterMigraines(data, { keyword: "bilat" });
    expect(result.map((m) => m.id)).toEqual(["a"]);
  });

  it("filters by month", () => {
    const data = [
      makeMigraine({ id: "a", date: "2026-06-15" }),
      makeMigraine({ id: "b", date: "2026-05-15" }),
    ];
    const result = filterMigraines(data, { month: "2026-06" });
    expect(result.map((m) => m.id)).toEqual(["a"]);
  });

  it("combines keyword and month with AND", () => {
    const data = [
      makeMigraine({ id: "a", date: "2026-06-15", notes: "café" }),
      makeMigraine({ id: "b", date: "2026-05-15", notes: "café" }),
      makeMigraine({ id: "c", date: "2026-06-15", notes: "rien" }),
    ];
    const result = filterMigraines(data, { keyword: "café", month: "2026-06" });
    expect(result.map((m) => m.id)).toEqual(["a"]);
  });

  it("treats empty-string keyword/month as no filter", () => {
    const data = [makeMigraine({ id: "a" }), makeMigraine({ id: "b" })];
    expect(filterMigraines(data, { keyword: "", month: "" })).toHaveLength(2);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/utils/migraineFilters.test.ts`
Expected: FAIL - `Cannot find module './migraineFilters'`

- [ ] **Step 3: Implement the helper**

Create `src/utils/migraineFilters.ts`:

```ts
import type { Migraine } from "../types/migraine";

const LOCALISATION_LABELS: Record<
  NonNullable<Migraine["localisation"]>,
  string
> = {
  gauche: "Gauche",
  droite: "Droite",
  bilaterale: "Bilatérale",
  nuque: "Nuque",
};

function normalize(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function matchesKeyword(migraine: Migraine, keyword: string): boolean {
  const needle = normalize(keyword);
  const haystacks = [
    ...migraine.medocs.map((m) => m.nom),
    migraine.notes ?? "",
    ...migraine.declencheurs,
    migraine.localisation ? LOCALISATION_LABELS[migraine.localisation] : "",
  ];
  return haystacks.some((h) => normalize(h).includes(needle));
}

export function filterMigraines(
  migraines: Migraine[],
  opts: { keyword?: string; month?: string },
): Migraine[] {
  const keyword = opts.keyword?.trim();
  const month = opts.month?.trim();
  return migraines.filter((m) => {
    if (keyword && !matchesKeyword(m, keyword)) return false;
    if (month && !m.date.startsWith(month)) return false;
    return true;
  });
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/utils/migraineFilters.test.ts`
Expected: PASS (8 tests)

- [ ] **Step 5: Commit**

```bash
git add src/utils/migraineFilters.ts src/utils/migraineFilters.test.ts
git commit -m "feat: add filterMigraines helper for keyword/month list filtering"
```

---

### Task 3: Enrich `MigraineListItem` into a card

**Files:**

- Modify: `src/components/MigraineListItem.vue`

**Interfaces:**

- Consumes: `Migraine` type (unchanged props shape: `{ migraine: Migraine }`, emit `click: []`).

- [ ] **Step 1: Replace the file**

Replace the full contents of `src/components/MigraineListItem.vue`:

```vue
<template>
  <li class="migraine-card" @click="$emit('click')">
    <div class="row header-row">
      <span class="date">{{ formatRelative(migraine.date) }}</span>
      <span class="intensity" :style="{ background: intensityColor }">{{
        migraine.intensite
      }}</span>
    </div>
    <div class="row detail-row muted">
      <span>{{ durationLabel }}</span>
      <span v-if="migraine.medocs.length">{{
        migraine.medocs.map((m) => m.nom).join(", ")
      }}</span>
    </div>
    <div class="row badges-row" v-if="hasBadges">
      <span v-if="migraine.avortee" class="badge">Avortée</span>
      <span v-if="migraine.nausee" class="badge subtle">🤢 Nausée</span>
      <span v-if="migraine.vomissement" class="badge subtle"
        >🤮 Vomissement</span
      >
      <span v-if="migraine.aura" class="badge subtle">✨ Aura</span>
      <span v-if="localisationLabel" class="badge subtle"
        >📍 {{ localisationLabel }}</span
      >
    </div>
  </li>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { formatRelative, formatDuration } from "../utils/date";
import type { Migraine } from "../types/migraine";

const props = defineProps<{ migraine: Migraine }>();
defineEmits<{ click: [] }>();

const LOCALISATION_LABELS: Record<
  NonNullable<Migraine["localisation"]>,
  string
> = {
  gauche: "Gauche",
  droite: "Droite",
  bilaterale: "Bilatérale",
  nuque: "Nuque",
};

const durationLabel = computed(() => {
  if (!props.migraine.heureFin) return "en cours";
  const [h1, m1] = props.migraine.heureDebut.split(":").map(Number);
  const [h2, m2] = props.migraine.heureFin.split(":").map(Number);
  return formatDuration(h2 * 60 + m2 - (h1 * 60 + m1));
});

const intensityColor = computed(() => {
  const hue = 50 - (props.migraine.intensite / 10) * 50;
  return `hsl(${hue}, 80%, 50%)`;
});

const localisationLabel = computed(() =>
  props.migraine.localisation
    ? LOCALISATION_LABELS[props.migraine.localisation]
    : null,
);

const hasBadges = computed(
  () =>
    props.migraine.avortee ||
    props.migraine.nausee ||
    props.migraine.vomissement ||
    props.migraine.aura ||
    localisationLabel.value !== null,
);
</script>

<style scoped>
.migraine-card {
  background: var(--color-surface);
  border: 1px solid transparent;
  border-radius: 0.75rem;
  padding: 1rem;
  cursor: pointer;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
  transition:
    border-color 0.15s ease,
    transform 0.15s ease;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.migraine-card:hover {
  border-color: var(--color-accent);
  transform: translateY(-2px);
}
.row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}
.header-row .date {
  font-weight: 600;
}
.intensity {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1.75rem;
  height: 1.75rem;
  border-radius: 50%;
  color: #1c1726;
  font-weight: 700;
  font-size: 0.85rem;
}
.detail-row {
  font-size: 0.9rem;
  justify-content: flex-start;
  gap: 1rem;
}
.muted {
  color: var(--color-muted);
}
.badges-row {
  justify-content: flex-start;
  flex-wrap: wrap;
  gap: 0.4rem;
}
.badge {
  font-size: 0.75rem;
  padding: 0.2rem 0.5rem;
  border-radius: 1rem;
  background: var(--color-danger);
  color: white;
}
.badge.subtle {
  background: var(--color-bg);
  color: var(--color-muted);
  border: 1px solid var(--color-muted);
}
</style>
```

- [ ] **Step 2: Visually verify**

Run: `npm run dev`, open `/liste` with at least one migraine that has `nausee: true`, `localisation: 'gauche'`, and `avortee: true` set (use the existing form to create one if needed). Expected: card shows the "Avortée" badge, a "🤢 Nausée" subtle badge, and a "📍 Gauche" subtle badge; hover lifts the card and tints its border.

- [ ] **Step 3: Commit**

```bash
git add src/components/MigraineListItem.vue
git commit -m "feat: redesign MigraineListItem as an info-rich hoverable card"
```

---

### Task 4: Rewire `ListView` - filters, grid, dual empty states

**Files:**

- Modify: `src/views/ListView.vue`

**Interfaces:**

- Consumes: `filterMigraines` from `../utils/migraineFilters` (Task 2), `MigraineListItem` (Task 3, unchanged props/emit), `MigraineFormModal` (existing, props `{ editId?: string }`, emits `close: []; saved: []`).

- [ ] **Step 1: Replace the file**

Replace the full contents of `src/views/ListView.vue`:

```vue
<template>
  <div class="list-view">
    <h1>Mes migraines</h1>

    <div v-if="migraines.migraines.length === 0" class="empty-state">
      <p>
        Aucune migraine enregistrée pour le moment. Note ta première crise pour
        commencer à suivre tes statistiques.
      </p>
      <button class="cta-btn" @click="addFormOpen = true">
        Ajouter une migraine
      </button>
    </div>

    <template v-else>
      <div class="filters">
        <input
          v-model="keyword"
          type="search"
          class="filter-input"
          placeholder="Rechercher (médoc, note, déclencheur, localisation)"
        />
        <input v-model="month" type="month" class="filter-input" />
      </div>

      <div v-if="filtered.length === 0" class="empty-state">
        <p>Aucun résultat pour ces filtres.</p>
        <button class="cta-btn" @click="resetFilters">
          Réinitialiser les filtres
        </button>
      </div>

      <ul v-else class="migraine-grid">
        <MigraineListItem
          v-for="m in filtered"
          :key="m.id"
          :migraine="m"
          @click="editId = m.id"
        />
      </ul>
    </template>

    <MigraineFormModal
      v-if="editId"
      :edit-id="editId"
      @close="editId = null"
      @saved="editId = null"
    />
    <MigraineFormModal
      v-if="addFormOpen"
      @close="addFormOpen = false"
      @saved="addFormOpen = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import { useMigrainesStore } from "../stores/migraines";
import { filterMigraines } from "../utils/migraineFilters";
import MigraineListItem from "../components/MigraineListItem.vue";
import MigraineFormModal from "../components/MigraineForm/MigraineFormModal.vue";

const migraines = useMigrainesStore();
const editId = ref<string | null>(null);
const addFormOpen = ref(false);
const keyword = ref("");
const month = ref("");

const sorted = computed(() =>
  [...migraines.migraines].sort((a, b) =>
    a.date + a.heureDebut < b.date + b.heureDebut ? 1 : -1,
  ),
);

const filtered = computed(() =>
  filterMigraines(sorted.value, { keyword: keyword.value, month: month.value }),
);

function resetFilters() {
  keyword.value = "";
  month.value = "";
}
</script>

<style scoped>
.list-view {
  padding: 1rem 1.5rem;
}
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  gap: 1rem;
  max-width: 480px;
  margin: 3rem auto;
}
.cta-btn {
  background: var(--color-accent);
  color: var(--color-accent-contrast);
  border: none;
  border-radius: 0.5rem;
  padding: 0.75rem 1.5rem;
  font-size: 1rem;
  cursor: pointer;
}
.filters {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-bottom: 1rem;
}
.filter-input {
  flex: 1;
  min-width: 200px;
  padding: 0.5rem 0.75rem;
  border-radius: 0.5rem;
  border: 1px solid var(--color-muted);
  background: var(--color-surface);
  color: var(--color-text);
  font-size: 0.95rem;
}
.migraine-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;
}
@media (min-width: 768px) {
  .migraine-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
@media (min-width: 1280px) {
  .migraine-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}
</style>
```

- [ ] **Step 2: Check `MigraineFormModal`'s prop/emit signature still matches**

Run: `grep -n "defineProps\|defineEmits" src/components/MigraineForm/MigraineFormModal.vue`
Expected: `defineProps<{ editId?: string }>()` and `defineEmits<{ close: []; saved: [] }>()` - both already used correctly above (the no-`editId` instance creates a new migraine; the `editId`-bound instance edits an existing one).

- [ ] **Step 3: Visually verify**

Run: `npm run dev`, open `/liste`:

- With 0 migraines: confirm onboarding message + "Ajouter une migraine" button, which opens the form.
- With migraines: confirm search box + month picker render, grid shows 1/2/3 columns depending on window width, typing a keyword that matches nothing shows "Aucun résultat pour ces filtres" + reset button, and resetting restores the full grid.
- Click a card: confirm it still opens the edit form for that migraine (existing `editId` behavior unchanged).

- [ ] **Step 4: Run the full test suite**

Run: `npx vitest run`
Expected: all tests pass (existing suite + the new `migraineFilters.test.ts` from Task 2).

- [ ] **Step 5: Commit**

```bash
git add src/views/ListView.vue
git commit -m "feat: add search/month filters and dual empty states to ListView"
```

---

## Final Verification

- [ ] Run `npx vitest run` - all tests pass.
- [ ] Run `npx vue-tsc --noEmit` - no type errors.
- [ ] Run `npm run dev` and manually check `/liste`: no bullet markers, card hover effect, responsive column count, keyword search across médocs/notes/déclencheurs/localisation, month filter, AND-combination of both filters, both empty states, click-to-edit still works.
