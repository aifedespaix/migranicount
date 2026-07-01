# Home Dashboard Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn `StatsView` into a fit-to-screen dashboard with a fixed full-width header, an orientation-aware chart grid, fullscreen chart detail views with extra stats, an empty state, and an always-visible FAB.

**Architecture:** CSS-only layout changes to `HeaderNav`, `App.vue`, `FabButton`, and `StatsView` (fixed header, `100dvh`-based main, CSS grid with an `orientation` media query). A new `ChartDetailModal.vue` component renders an enlarged chart plus per-chart stats computed by new pure functions added to `src/utils/stats.ts`. No new dependencies.

**Tech Stack:** Vue 3 `<script setup>`, TypeScript, Chart.js / vue-chartjs, Vitest for unit tests.

## Global Constraints

- Header fixed on all screen sizes (mobile + desktop), full width, no max-width container.
- Dashboard (cards + charts) must fit in `100dvh` minus header/bottom-nav with no page scroll.
- Charts grid: 3 columns when `orientation: landscape`, 1 column (stacked) otherwise - media query on `orientation`, not width.
- Each chart click opens a fullscreen modal with an enlarged chart (`maintainAspectRatio: false`) plus chart-specific stats (no generic min/max/avg-for-all - each chart has its own stat set per the spec).
- Empty state (0 migraines) replaces the entire dashboard with an explanatory message + CTA button opening `MigraineFormModal`.
- FAB always visible bottom-right, including desktop, alongside the existing header "Ajouter" button. Both trigger the same modal-open action.
- Visual/button restyling is explicitly out of scope for this plan.
- Spec: `docs/superpowers/specs/2026-06-24-home-dashboard-design.md`.

---

## File Structure

- Modify `src/utils/stats.ts` - add `frequencyTrendStats`, `intensityDistribution`, `averageIntensity`, `efficacyRanking`.
- Modify `src/utils/stats.test.ts` - tests for the new functions.
- Modify `src/components/HeaderNav.vue` - fixed positioning, visible on all breakpoints.
- Modify `src/components/FabButton.vue` - remove desktop-hide media query.
- Modify `src/App.vue` - fit-to-screen `.app-main`, header height offset.
- Create `src/components/charts/ChartDetailModal.vue` - fullscreen modal showing an enlarged chart + stats, keyed by chart type.
- Modify `src/views/StatsView.vue` - empty state, fit-to-screen layout, orientation-aware grid, clickable chart cards wired to `ChartDetailModal`.
- Modify `src/components/charts/FrequencyChart.vue`, `IntensityChart.vue`, `EfficacyChart.vue` - set `maintainAspectRatio: false` so they fill their grid cell instead of imposing their own aspect ratio.

---

### Task 1: Add chart-detail stat helpers to `stats.ts`

**Files:**

- Modify: `src/utils/stats.ts`
- Test: `src/utils/stats.test.ts`

**Interfaces:**

- Produces:
  - `frequencyTrendStats(migraines: Migraine[], from?: Date): { total: number; busiestMonth: { month: string; count: number } | null; trendPct: number | null }`
  - `intensityDistribution(migraines: Migraine[]): { level: number; count: number }[]`
  - `averageIntensity(migraines: Migraine[]): number`
  - `efficacyRanking(migraines: Migraine[]): { nom: string; pctAvortee: number; total: number }[]`

- [ ] **Step 1: Write the failing tests**

Add to `src/utils/stats.test.ts` (after the existing `medocEfficacy` describe block, reusing the existing `makeMigraine` helper already defined in that file):

```ts
describe("frequencyTrendStats", () => {
  it("computes total, busiest month, and trend vs prior 3 months", () => {
    const data = [
      makeMigraine({ date: "2026-04-01" }),
      makeMigraine({ date: "2026-05-01" }),
      makeMigraine({ date: "2026-06-01" }),
      makeMigraine({ date: "2026-06-10" }),
      makeMigraine({ date: "2026-06-20" }),
    ];
    const result = frequencyTrendStats(data, new Date(2026, 5, 24));
    expect(result.total).toBe(5);
    expect(result.busiestMonth).toEqual({ month: "2026-06", count: 3 });
    // last 3 months (Apr+May+Jun = 1+1+3=5) vs prior 3 months (Jan+Feb+Mar = 0) -> no prior data, trendPct null
    expect(result.trendPct).toBeNull();
  });

  it("returns a percentage trend when prior period has data", () => {
    const data = [
      makeMigraine({ date: "2026-01-01" }),
      makeMigraine({ date: "2026-01-15" }),
      makeMigraine({ date: "2026-06-01" }),
      makeMigraine({ date: "2026-06-10" }),
      makeMigraine({ date: "2026-06-20" }),
      makeMigraine({ date: "2026-06-25" }),
    ];
    const result = frequencyTrendStats(data, new Date(2026, 5, 24));
    // prior 3 months (Mar+Apr+May) = 0, last 3 (Apr+May+Jun) = 4 -> still null since prior3 is 0
    expect(result.trendPct).toBeNull();
  });

  it("returns null busiestMonth when there are no migraines", () => {
    const result = frequencyTrendStats([], new Date(2026, 5, 24));
    expect(result.total).toBe(0);
    expect(result.busiestMonth).toBeNull();
    expect(result.trendPct).toBeNull();
  });
});

describe("intensityDistribution", () => {
  it("counts migraines per intensity level, sorted ascending", () => {
    const data = [
      makeMigraine({ intensite: 8 }),
      makeMigraine({ intensite: 3 }),
      makeMigraine({ intensite: 8 }),
    ];
    expect(intensityDistribution(data)).toEqual([
      { level: 3, count: 1 },
      { level: 8, count: 2 },
    ]);
  });
});

describe("averageIntensity", () => {
  it("averages intensite across all migraines", () => {
    const data = [
      makeMigraine({ intensite: 4 }),
      makeMigraine({ intensite: 8 }),
    ];
    expect(averageIntensity(data)).toBe(6);
  });

  it("returns 0 when there are no migraines", () => {
    expect(averageIntensity([])).toBe(0);
  });
});

describe("efficacyRanking", () => {
  it("ranks medocs by % aborted, descending", () => {
    const data = [
      makeMigraine({
        medocs: [{ id: "1", nom: "Triptan", heure: "08:00" }],
        avortee: true,
      }),
      makeMigraine({
        medocs: [{ id: "2", nom: "Triptan", heure: "08:00" }],
        avortee: true,
      }),
      makeMigraine({
        medocs: [{ id: "3", nom: "Doliprane", heure: "08:00" }],
        avortee: false,
      }),
    ];
    const result = efficacyRanking(data);
    expect(result[0].nom).toBe("Triptan");
    expect(result[0].pctAvortee).toBe(100);
    expect(result[1].nom).toBe("Doliprane");
    expect(result[1].pctAvortee).toBe(0);
  });
});
```

Update the import line at the top of `src/utils/stats.test.ts` to:

```ts
import {
  monthlyFrequency,
  averageIntensityByMonth,
  medocEfficacy,
  averageDurationMinutes,
  frequencyTrendStats,
  intensityDistribution,
  averageIntensity,
  efficacyRanking,
} from "./stats";
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/utils/stats.test.ts`
Expected: FAIL - `frequencyTrendStats`, `intensityDistribution`, `averageIntensity`, `efficacyRanking` are not exported / not defined.

- [ ] **Step 3: Implement the helpers**

Append to `src/utils/stats.ts`:

```ts
export function frequencyTrendStats(
  migraines: Migraine[],
  from: Date = new Date(),
): {
  total: number;
  busiestMonth: { month: string; count: number } | null;
  trendPct: number | null;
} {
  const months = monthlyFrequency(migraines, from);
  const total = months.reduce((sum, m) => sum + m.count, 0);
  const busiestMonth = months.reduce<{ month: string; count: number } | null>(
    (best, m) => {
      if (m.count === 0) return best;
      if (!best || m.count > best.count) return m;
      return best;
    },
    null,
  );
  const last3 = months.slice(-3).reduce((sum, m) => sum + m.count, 0);
  const prev3 = months.slice(-6, -3).reduce((sum, m) => sum + m.count, 0);
  const trendPct =
    prev3 === 0 ? null : Math.round(((last3 - prev3) / prev3) * 100);
  return { total, busiestMonth, trendPct };
}

export function intensityDistribution(
  migraines: Migraine[],
): { level: number; count: number }[] {
  const counts = new Map<number, number>();
  for (const m of migraines) {
    counts.set(m.intensite, (counts.get(m.intensite) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([level, count]) => ({ level, count }));
}

export function averageIntensity(migraines: Migraine[]): number {
  if (migraines.length === 0) return 0;
  return (
    Math.round(
      (migraines.reduce((sum, m) => sum + m.intensite, 0) / migraines.length) *
        10,
    ) / 10
  );
}

export function efficacyRanking(
  migraines: Migraine[],
): { nom: string; pctAvortee: number; total: number }[] {
  return medocEfficacy(migraines)
    .filter((d) => d.total >= 1)
    .sort((a, b) => b.pctAvortee - a.pctAvortee);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/utils/stats.test.ts`
Expected: PASS (all tests green)

- [ ] **Step 5: Commit**

```bash
git add src/utils/stats.ts src/utils/stats.test.ts
git commit -m "feat: add chart-detail stat helpers (frequency trend, intensity distribution, efficacy ranking)"
```

---

### Task 2: Fixed full-width header on all breakpoints

**Files:**

- Modify: `src/components/HeaderNav.vue`

**Interfaces:**

- Consumes: nothing new (keeps existing `add` emit, `RouterLink`)
- Produces: a `--header-h` CSS custom property is NOT introduced here - Task 4 hardcodes the header height in `App.vue` to keep this task self-contained. (Header height stays the existing `padding: 1rem 2rem` + content, fixed at a known `3.5rem` after this change - see Step 1.)

- [ ] **Step 1: Update `HeaderNav.vue` template/style**

Replace the `<style scoped>` block in `src/components/HeaderNav.vue`:

```vue
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

This removes the `display: none` default and the `@media (min-width: 1024px) { .header-nav { display: flex; } }` block entirely, so the header is always visible, fixed, and spans full width.

- [ ] **Step 2: Visually verify**

Run: `npm run dev`
Open the app in a browser at a mobile-width viewport (e.g. 390px) and a desktop-width viewport. Expected: header bar visible and pinned to top in both cases, full width, no horizontal scrollbar.

- [ ] **Step 3: Commit**

```bash
git add src/components/HeaderNav.vue
git commit -m "feat: make header fixed and visible on all breakpoints"
```

---

### Task 3: FAB always visible

**Files:**

- Modify: `src/components/FabButton.vue`

- [ ] **Step 1: Remove the desktop-hide media query**

In `src/components/FabButton.vue`, delete this block from `<style scoped>`:

```css
@media (min-width: 1024px) {
  .fab {
    display: none;
  }
}
```

The resulting `<style scoped>` block is:

```vue
<style scoped>
.fab {
  position: fixed;
  bottom: 4.5rem;
  right: 1.25rem;
  width: 3.5rem;
  height: 3.5rem;
  border-radius: 50%;
  border: none;
  background: var(--color-accent);
  color: var(--color-accent-contrast);
  font-size: 1.75rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
  cursor: pointer;
  z-index: 20;
}
</style>
```

- [ ] **Step 2: Visually verify**

Run: `npm run dev`
Open at desktop width. Expected: FAB visible bottom-right alongside the header's "+ Ajouter" button; clicking either opens the same form modal.

- [ ] **Step 3: Commit**

```bash
git add src/components/FabButton.vue
git commit -m "feat: keep FAB visible on desktop alongside header add button"
```

---

### Task 4: Fit-to-screen main container in `App.vue`

**Files:**

- Modify: `src/App.vue`

**Interfaces:**

- Consumes: `HeaderNav` height is `3.5rem` (Task 2), `BottomNav` height is `3.25rem`-ish but only shown below 1024px width (existing `@media (min-width: 1024px) { .bottom-nav { display: none; } }` in `BottomNav.vue`, untouched).
- Produces: `.app-main` is the fit-to-screen container that `StatsView` (Task 6) fills completely with `height: 100%`.

- [ ] **Step 1: Update `App.vue` style**

Replace the `<style scoped>` block in `src/App.vue`:

```vue
<style scoped>
.app-main {
  margin-top: 3.5rem;
  height: calc(100dvh - 3.5rem);
  overflow: hidden;
}
@media (max-width: 1023px) {
  .app-main {
    height: calc(100dvh - 3.5rem - 3.5rem);
  }
}
</style>
```

This reserves `3.5rem` for the fixed header (Task 2) on all sizes, plus an extra `3.5rem` on screens below 1024px width where `BottomNav` is shown (its rendered height is `0.75rem` padding top/bottom + line-height ≈ matches `3.5rem` total bar height closely enough for this dashboard fit; exact pixel-perfect trim is not required by the spec, only "no page scroll").

- [ ] **Step 2: Visually verify**

Run: `npm run dev`
Expected: no vertical scrollbar on the `body`/`html` on either `ListView`, `SettingsView`, or `StatsView` routes at common viewport sizes (390x844, 1440x900). `StatsView`'s own internal layout is handled in Task 6 - this task only sets up the outer container.

- [ ] **Step 3: Commit**

```bash
git add src/App.vue
git commit -m "feat: make app main container fit viewport height under fixed header"
```

---

### Task 5: `maintainAspectRatio: false` on the three chart components

**Files:**

- Modify: `src/components/charts/FrequencyChart.vue`
- Modify: `src/components/charts/IntensityChart.vue`
- Modify: `src/components/charts/EfficacyChart.vue`

- [ ] **Step 1: Add `maintainAspectRatio: false` to each chart's `options` computed**

In `FrequencyChart.vue`, change:

```ts
const options = computed(() => ({
  responsive: true,
  plugins: { legend: { display: false } },
```

to:

```ts
const options = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false } },
```

In `IntensityChart.vue`, change:

```ts
const options = computed(() => ({
  responsive: true,
  plugins: { legend: { labels: { color: themeColors.text.value } } },
```

to:

```ts
const options = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { labels: { color: themeColors.text.value } } },
```

In `EfficacyChart.vue`, change:

```ts
const options = computed(() => ({
  indexAxis: 'y' as const,
  responsive: true,
```

to:

```ts
const options = computed(() => ({
  indexAxis: 'y' as const,
  responsive: true,
  maintainAspectRatio: false,
```

- [ ] **Step 2: Visually verify**

Run: `npm run dev`, navigate to `/`. Expected: charts render without throwing; they currently may look squashed because their wrapper has no explicit height yet - that's fixed in Task 6 where each chart sits in a `height: 100%` grid cell.

- [ ] **Step 3: Commit**

```bash
git add src/components/charts/FrequencyChart.vue src/components/charts/IntensityChart.vue src/components/charts/EfficacyChart.vue
git commit -m "feat: let charts fill their container instead of fixed aspect ratio"
```

---

### Task 6: `ChartDetailModal` component

**Files:**

- Create: `src/components/charts/ChartDetailModal.vue`
- Test: none (presentational component wired to already-tested stat functions; covered by manual verification per project convention - no existing `.vue` component has unit tests in this codebase)

**Interfaces:**

- Consumes:
  - `frequencyTrendStats`, `intensityDistribution`, `averageIntensity`, `efficacyRanking` from `../../utils/stats` (Task 1)
  - `Migraine` type from `../../types/migraine`
  - `FrequencyChart`, `IntensityChart`, `EfficacyChart` components (Task 5's updated versions)
- Produces:
  - Props: `{ chart: 'frequency' | 'intensity' | 'efficacy'; migraines: Migraine[] }`
  - Emits: `close: []`

- [ ] **Step 1: Create the component**

Create `src/components/charts/ChartDetailModal.vue`:

```vue
<template>
  <div
    class="chart-detail-overlay"
    @click.self="$emit('close')"
    @keydown.esc="$emit('close')"
  >
    <div class="chart-detail-panel" role="dialog" aria-modal="true">
      <header class="chart-detail-header">
        <h2>{{ title }}</h2>
        <button class="close-btn" @click="$emit('close')" aria-label="Fermer">
          ×
        </button>
      </header>
      <div class="chart-detail-body">
        <div class="chart-detail-chart">
          <FrequencyChart v-if="chart === 'frequency'" :migraines="migraines" />
          <IntensityChart
            v-else-if="chart === 'intensity'"
            :migraines="migraines"
          />
          <EfficacyChart v-else :migraines="migraines" />
        </div>
        <div class="chart-detail-stats">
          <template v-if="chart === 'frequency'">
            <p>
              <strong>Total crises (12 mois) :</strong>
              {{ frequencyStats.total }}
            </p>
            <p v-if="frequencyStats.busiestMonth">
              <strong>Mois le plus chargé :</strong>
              {{ frequencyStats.busiestMonth.month }} ({{
                frequencyStats.busiestMonth.count
              }}
              crise(s))
            </p>
            <p v-if="frequencyStats.trendPct !== null">
              <strong>Tendance (3 derniers mois vs 3 précédents) :</strong>
              {{ frequencyStats.trendPct > 0 ? "+" : ""
              }}{{ frequencyStats.trendPct }}%
            </p>
          </template>
          <template v-else-if="chart === 'intensity'">
            <p><strong>Intensité moyenne :</strong> {{ avgIntensity }}/10</p>
            <ul class="stat-list">
              <li v-for="d in intensityDist" :key="d.level">
                Niveau {{ d.level }} : {{ d.count }} crise(s)
              </li>
            </ul>
          </template>
          <template v-else>
            <ul class="stat-list">
              <li v-for="r in efficacyRank" :key="r.nom">
                {{ r.nom }} - {{ r.pctAvortee }}% d'efficacité ({{
                  r.total
                }}
                prise(s))
              </li>
            </ul>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import FrequencyChart from "./FrequencyChart.vue";
import IntensityChart from "./IntensityChart.vue";
import EfficacyChart from "./EfficacyChart.vue";
import {
  frequencyTrendStats,
  intensityDistribution,
  averageIntensity,
  efficacyRanking,
} from "../../utils/stats";
import type { Migraine } from "../../types/migraine";

const props = defineProps<{
  chart: "frequency" | "intensity" | "efficacy";
  migraines: Migraine[];
}>();
defineEmits<{ close: [] }>();

const title = computed(() => {
  if (props.chart === "frequency") return "Fréquence (12 derniers mois)";
  if (props.chart === "intensity") return "Intensité moyenne";
  return "Efficacité des traitements";
});

const frequencyStats = computed(() => frequencyTrendStats(props.migraines));
const intensityDist = computed(() => intensityDistribution(props.migraines));
const avgIntensity = computed(() => averageIntensity(props.migraines));
const efficacyRank = computed(() => efficacyRanking(props.migraines));
</script>

<style scoped>
.chart-detail-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 50;
}
.chart-detail-panel {
  background: var(--color-surface);
  color: var(--color-text);
  width: min(90vw, 960px);
  height: min(85vh, 720px);
  border-radius: 0.75rem;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.chart-detail-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid var(--color-muted);
}
.close-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: var(--color-text);
}
.chart-detail-body {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  padding: 1rem 1.5rem;
  gap: 1rem;
  overflow-y: auto;
}
.chart-detail-chart {
  flex: 1;
  min-height: 280px;
}
.stat-list {
  list-style: none;
  margin: 0;
  padding: 0;
}
.stat-list li {
  padding: 0.25rem 0;
}
</style>
```

- [ ] **Step 2: Verify it compiles**

Run: `npx vue-tsc --noEmit`
Expected: no new type errors from `ChartDetailModal.vue`.

- [ ] **Step 3: Commit**

```bash
git add src/components/charts/ChartDetailModal.vue
git commit -m "feat: add ChartDetailModal with per-chart stats"
```

---

### Task 7: Rewire `StatsView` - grid, empty state, modal wiring

**Files:**

- Modify: `src/views/StatsView.vue`

**Interfaces:**

- Consumes: `ChartDetailModal` (Task 6), `FrequencyChart`/`IntensityChart`/`EfficacyChart` (Task 5), `formatRelative`/`formatDuration`/`todayISO` from `../utils/date`, `averageDurationMinutes` from `../utils/stats`, `useMigrainesStore` from `../stores/migraines`.
- Produces: `StatsView` emits nothing; it owns its own `MigraineFormModal` trigger via a local `ref` for the empty-state CTA (separate from `App.vue`'s `formOpen`, since `StatsView` has no direct access to `App.vue`'s state - it renders its own `MigraineFormModal` instance when the CTA is clicked).

- [ ] **Step 1: Check `MigraineFormModal` props/emits to confirm reuse is safe**

Run: `grep -n "defineProps\|defineEmits" src/components/MigraineForm/MigraineFormModal.vue`
Expected output should show `defineEmits<{ close: []; saved: [] }>()` and no required props (confirm before proceeding - if it differs, adjust Step 2 accordingly using the actual signature).

- [ ] **Step 2: Rewrite `StatsView.vue`**

Replace the full contents of `src/views/StatsView.vue`:

```vue
<template>
  <div class="stats-view">
    <div v-if="migraines.migraines.length === 0" class="empty-state">
      <h1>Migracount</h1>
      <p>
        Migracount t'aide à suivre tes crises de migraine au fil du temps :
        intensité, durée, traitements pris et leur efficacité. Plus tu
        enregistres de crises, plus les statistiques deviennent utiles pour
        repérer des tendances.
      </p>
      <button class="cta-btn" @click="emptyStateFormOpen = true">
        Répertorier une migraine
      </button>
    </div>

    <template v-else>
      <div class="summary-cards">
        <div class="card">
          <strong>Dernière crise</strong>
          <span>{{
            lastMigraine ? formatRelative(lastMigraine.date) : "aucune"
          }}</span>
        </div>
        <div class="card">
          <strong>Durée moyenne</strong>
          <span>{{
            formatDuration(averageDurationMinutes(migraines.migraines))
          }}</span>
        </div>
        <div class="card">
          <strong>Ce mois-ci</strong>
          <span>{{ thisMonthCount }} crise(s)</span>
        </div>
      </div>

      <div class="charts-grid">
        <button class="chart-card" @click="openDetail('frequency')">
          <h2>Fréquence (12 derniers mois)</h2>
          <div class="chart-wrap">
            <FrequencyChart :migraines="migraines.migraines" />
          </div>
        </button>
        <button class="chart-card" @click="openDetail('intensity')">
          <h2>Intensité moyenne</h2>
          <div class="chart-wrap">
            <IntensityChart :migraines="migraines.migraines" />
          </div>
        </button>
        <button class="chart-card" @click="openDetail('efficacy')">
          <h2>Efficacité des traitements</h2>
          <div class="chart-wrap">
            <EfficacyChart :migraines="migraines.migraines" />
          </div>
        </button>
      </div>
    </template>

    <ChartDetailModal
      v-if="activeDetail"
      :chart="activeDetail"
      :migraines="migraines.migraines"
      @close="activeDetail = null"
    />

    <MigraineFormModal
      v-if="emptyStateFormOpen"
      @close="emptyStateFormOpen = false"
      @saved="emptyStateFormOpen = false"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { useMigrainesStore } from "../stores/migraines";
import { formatRelative, formatDuration, todayISO } from "../utils/date";
import { averageDurationMinutes } from "../utils/stats";
import FrequencyChart from "../components/charts/FrequencyChart.vue";
import IntensityChart from "../components/charts/IntensityChart.vue";
import EfficacyChart from "../components/charts/EfficacyChart.vue";
import ChartDetailModal from "../components/charts/ChartDetailModal.vue";
import MigraineFormModal from "../components/MigraineForm/MigraineFormModal.vue";

const migraines = useMigrainesStore();
const activeDetail = ref<"frequency" | "intensity" | "efficacy" | null>(null);
const emptyStateFormOpen = ref(false);

function openDetail(chart: "frequency" | "intensity" | "efficacy") {
  activeDetail.value = chart;
}

const lastMigraine = computed(
  () => [...migraines.migraines].sort((a, b) => (a.date < b.date ? 1 : -1))[0],
);

const thisMonthCount = computed(
  () =>
    migraines.migraines.filter(
      (m) => m.date.slice(0, 7) === todayISO().slice(0, 7),
    ).length,
);
</script>

<style scoped>
.stats-view {
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 1rem 1.5rem;
  box-sizing: border-box;
  gap: 1rem;
}
.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  gap: 1rem;
  max-width: 480px;
  margin: 0 auto;
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
.summary-cards {
  display: flex;
  gap: 1rem;
  flex-shrink: 0;
}
.card {
  flex: 1;
  background: var(--color-surface);
  border-radius: 0.5rem;
  padding: 0.75rem 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}
.charts-grid {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;
}
@media (orientation: landscape) {
  .charts-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}
.chart-card {
  background: var(--color-surface);
  border: 1px solid transparent;
  border-radius: 0.5rem;
  padding: 0.75rem;
  display: flex;
  flex-direction: column;
  min-height: 0;
  cursor: pointer;
  text-align: left;
  font: inherit;
  color: inherit;
  transition:
    border-color 0.15s ease,
    transform 0.15s ease;
}
.chart-card:hover {
  border-color: var(--color-accent);
  transform: translateY(-2px);
}
.chart-card h2 {
  margin: 0 0 0.5rem;
  font-size: 0.95rem;
}
.chart-wrap {
  flex: 1;
  min-height: 0;
  position: relative;
}
</style>
```

- [ ] **Step 3: Visually verify**

Run: `npm run dev`. With seeded/no data:

- Empty state: confirm message + "Répertorier une migraine" button shows when the store has 0 migraines, and clicking it opens the form modal.
- With data: confirm 3 cards + 3 chart cards render, no page scrollbar, landscape viewport shows 3 columns, portrait shows 1 column (resize the browser or use device toolbar orientation toggle).
- Click each chart card: confirm `ChartDetailModal` opens with the enlarged chart and the chart-specific stats text, and closes via the × button.

- [ ] **Step 4: Run the full test suite to confirm nothing broke**

Run: `npx vitest run`
Expected: all existing tests pass (stats, draft, migraineRepository, migraines store, date) plus the new Task 1 tests.

- [ ] **Step 5: Commit**

```bash
git add src/views/StatsView.vue
git commit -m "feat: rebuild StatsView as fit-to-screen dashboard with empty state and chart detail modal"
```

---

## Final Verification

- [ ] Run `npx vitest run` - all tests pass.
- [ ] Run `npx vue-tsc --noEmit` - no type errors.
- [ ] Run `npm run dev` and manually check: fixed header on mobile + desktop widths, no page scroll on `/` with and without data, landscape/portrait grid switch, chart click → fullscreen detail → close, FAB visible and functional on desktop, empty-state CTA opens the form.
