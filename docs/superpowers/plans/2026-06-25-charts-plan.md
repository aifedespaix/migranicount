# Graphiques & Data Viz Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Supprimer EfficacyChart de la vue principale, ajouter un sélecteur de période (Jour/Semaine/Mois) avec échelle dynamique par défaut, corriger le responsive des graphiques.

**Architecture:** Nouvelles fonctions stats TDD → FrequencyChart + IntensityChart avec prop period → StatsView + ChartDetailModal mis à jour.

---

### Task 1: Nouvelles fonctions stats — daily, weekly, defaultPeriod

**Files:**
- Modify: `src/utils/stats.ts`
- Modify: `src/utils/stats.test.ts`

- [ ] **Step 1: Write failing tests**

Dans `src/utils/stats.test.ts`, changer l'import :

```ts
import {
  monthlyFrequency, averageIntensityByMonth, medocEfficacy, averageDurationMinutes,
  dailyFrequency, weeklyFrequency, averageIntensityByDay, averageIntensityByWeek, defaultPeriod,
} from './stats'
```

Ajouter à la fin du fichier :

```ts
describe('dailyFrequency', () => {
  it('returns `days` entries for the last N days', () => {
    const from = new Date(2026, 5, 25) // 25 juin
    const result = dailyFrequency([], from, 7)
    expect(result).toHaveLength(7)
    expect(result[6].day).toBe('2026-06-25')
    expect(result[0].day).toBe('2026-06-19')
  })

  it('counts migraines on the correct day', () => {
    const from = new Date(2026, 5, 25)
    const data = [makeMigraine({ date: '2026-06-24' }), makeMigraine({ date: '2026-06-24' })]
    const result = dailyFrequency(data, from, 7)
    expect(result.find(r => r.day === '2026-06-24')?.count).toBe(2)
  })
})

describe('weeklyFrequency', () => {
  it('returns `weeks` entries starting on Mondays', () => {
    const from = new Date(2026, 5, 25) // jeudi
    const result = weeklyFrequency([], from, 4)
    expect(result).toHaveLength(4)
    // La semaine du 25 juin commence le lundi 22 juin
    expect(result[3].week).toBe('2026-06-22')
  })

  it('counts a migraine in the correct week', () => {
    const from = new Date(2026, 5, 25)
    const data = [makeMigraine({ date: '2026-06-23' })] // mardi de la semaine du 22
    const result = weeklyFrequency(data, from, 4)
    expect(result.find(r => r.week === '2026-06-22')?.count).toBe(1)
  })
})

describe('averageIntensityByDay', () => {
  it('returns 0 avg for days with no migraines', () => {
    const from = new Date(2026, 5, 25)
    const result = averageIntensityByDay([], from, 3)
    expect(result.every(r => r.avg === 0)).toBe(true)
  })

  it('averages intensity on a given day', () => {
    const from = new Date(2026, 5, 25)
    const data = [
      makeMigraine({ date: '2026-06-24', intensite: 4 }),
      makeMigraine({ date: '2026-06-24', intensite: 8 }),
    ]
    const result = averageIntensityByDay(data, from, 3)
    expect(result.find(r => r.day === '2026-06-24')?.avg).toBe(6)
  })
})

describe('averageIntensityByWeek', () => {
  it('averages intensity across a week', () => {
    const from = new Date(2026, 5, 25)
    const data = [
      makeMigraine({ date: '2026-06-22', intensite: 6 }),
      makeMigraine({ date: '2026-06-24', intensite: 4 }),
    ]
    const result = averageIntensityByWeek(data, from, 2)
    expect(result.find(r => r.week === '2026-06-22')?.avg).toBe(5)
  })
})

describe('defaultPeriod', () => {
  it('returns month when no migraines', () => {
    expect(defaultPeriod([])).toBe('month')
  })

  it('returns day when oldest migraine is < 3 months ago', () => {
    const recent = makeMigraine({ date: new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString().slice(0, 10) })
    expect(defaultPeriod([recent])).toBe('day')
  })

  it('returns week when oldest migraine is 3-6 months ago', () => {
    const d = new Date()
    d.setMonth(d.getMonth() - 4)
    const old = makeMigraine({ date: d.toISOString().slice(0, 10) })
    expect(defaultPeriod([old])).toBe('week')
  })

  it('returns month when oldest migraine is > 6 months ago', () => {
    const d = new Date()
    d.setMonth(d.getMonth() - 8)
    const old = makeMigraine({ date: d.toISOString().slice(0, 10) })
    expect(defaultPeriod([old])).toBe('month')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- stats.test.ts`
Expected: FAIL — fonctions non exportées.

- [ ] **Step 3: Implémenter les nouvelles fonctions dans `src/utils/stats.ts`**

Ajouter en bas du fichier (avant toute fonction privée existante) :

```ts
function dayToISO(d: Date): string {
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function mondayOf(d: Date): Date {
  const dow = d.getDay()
  const daysToMon = dow === 0 ? 6 : dow - 1
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() - daysToMon)
}

export function dailyFrequency(
  migraines: Migraine[],
  from: Date = new Date(),
  days: number = 30
): { day: string; count: number }[] {
  const result: { day: string; count: number }[] = []
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(from.getFullYear(), from.getMonth(), from.getDate() - i)
    result.push({ day: dayToISO(d), count: 0 })
  }
  const map = new Map(result.map((r) => [r.day, r]))
  for (const m of migraines) {
    const bucket = map.get(m.date)
    if (bucket) bucket.count++
  }
  return result
}

export function weeklyFrequency(
  migraines: Migraine[],
  from: Date = new Date(),
  weeks: number = 12
): { week: string; count: number }[] {
  const thisMonday = mondayOf(from)
  const result: { week: string; count: number }[] = []
  for (let i = weeks - 1; i >= 0; i--) {
    const d = new Date(thisMonday.getFullYear(), thisMonday.getMonth(), thisMonday.getDate() - i * 7)
    result.push({ week: dayToISO(d), count: 0 })
  }
  const map = new Map(result.map((r) => [r.week, r]))
  for (const m of migraines) {
    const d = new Date(m.date + 'T00:00:00')
    const key = dayToISO(mondayOf(d))
    const bucket = map.get(key)
    if (bucket) bucket.count++
  }
  return result
}

export function averageIntensityByDay(
  migraines: Migraine[],
  from: Date = new Date(),
  days: number = 30
): { day: string; avg: number }[] {
  const result: { day: string; total: number; count: number }[] = []
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(from.getFullYear(), from.getMonth(), from.getDate() - i)
    result.push({ day: dayToISO(d), total: 0, count: 0 })
  }
  const map = new Map(result.map((r) => [r.day, r]))
  for (const m of migraines) {
    const bucket = map.get(m.date)
    if (bucket) { bucket.total += m.intensite; bucket.count++ }
  }
  return result.map(({ day, total, count }) => ({ day, avg: count === 0 ? 0 : Math.round((total / count) * 10) / 10 }))
}

export function averageIntensityByWeek(
  migraines: Migraine[],
  from: Date = new Date(),
  weeks: number = 12
): { week: string; avg: number }[] {
  const thisMonday = mondayOf(from)
  const result: { week: string; total: number; count: number }[] = []
  for (let i = weeks - 1; i >= 0; i--) {
    const d = new Date(thisMonday.getFullYear(), thisMonday.getMonth(), thisMonday.getDate() - i * 7)
    result.push({ week: dayToISO(d), total: 0, count: 0 })
  }
  const map = new Map(result.map((r) => [r.week, r]))
  for (const m of migraines) {
    const d = new Date(m.date + 'T00:00:00')
    const key = dayToISO(mondayOf(d))
    const bucket = map.get(key)
    if (bucket) { bucket.total += m.intensite; bucket.count++ }
  }
  return result.map(({ week, total, count }) => ({ week, avg: count === 0 ? 0 : Math.round((total / count) * 10) / 10 }))
}

export type Period = 'day' | 'week' | 'month'

export function defaultPeriod(migraines: Migraine[]): Period {
  if (migraines.length === 0) return 'month'
  const oldest = migraines.reduce((min, m) => (m.date < min ? m.date : min), migraines[0].date)
  const oldestDate = new Date(oldest + 'T00:00:00')
  const now = new Date()
  const monthsDiff =
    (now.getFullYear() - oldestDate.getFullYear()) * 12 + (now.getMonth() - oldestDate.getMonth())
  if (monthsDiff < 3) return 'day'
  if (monthsDiff < 6) return 'week'
  return 'month'
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- stats.test.ts`
Expected: PASS — tous les tests existants + nouveaux.

- [ ] **Step 5: Run full suite**

Run: `npm test`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/utils/stats.ts src/utils/stats.test.ts
git commit -m "feat: add daily/weekly stats functions and defaultPeriod helper"
```

---

### Task 2: FrequencyChart et IntensityChart — prop period

**Files:**
- Modify: `src/components/charts/FrequencyChart.vue`
- Modify: `src/components/charts/IntensityChart.vue`

- [ ] **Step 1: Modifier `src/components/charts/FrequencyChart.vue`**

Remplacer le `<script setup>` entièrement :

```ts
<script setup lang="ts">
import { computed } from 'vue'
import { Bar } from 'vue-chartjs'
import { Chart as ChartJS, BarElement, CategoryScale, LinearScale, Tooltip } from 'chart.js'
import { monthlyFrequency, dailyFrequency, weeklyFrequency, type Period } from '../../utils/stats'
import { useChartThemeColors, withAlpha } from '../../utils/chartTheme'
import type { Migraine } from '../../types/migraine'

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip)

const props = defineProps<{ migraines: Migraine[]; period?: Period }>()
const themeColors = useChartThemeColors()

const chartData = computed(() => {
  const p = props.period ?? 'month'
  let items: { label: string; count: number }[]
  if (p === 'day') {
    items = dailyFrequency(props.migraines).map((d) => ({ label: d.day.slice(5), count: d.count }))
  } else if (p === 'week') {
    items = weeklyFrequency(props.migraines).map((d) => ({ label: d.week.slice(5), count: d.count }))
  } else {
    items = monthlyFrequency(props.migraines).map((d) => ({ label: d.month.slice(5), count: d.count }))
  }
  return {
    labels: items.map((d) => d.label),
    datasets: [{ label: 'Crises', data: items.map((d) => d.count), backgroundColor: themeColors.accent.value }],
  }
})

const options = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  scales: {
    x: {
      ticks: { color: themeColors.muted.value },
      grid: { color: withAlpha(themeColors.muted.value, 0.2) },
    },
    y: {
      ticks: { color: themeColors.muted.value },
      grid: { color: withAlpha(themeColors.muted.value, 0.2) },
    },
  },
}))
</script>
```

- [ ] **Step 2: Modifier `src/components/charts/IntensityChart.vue`**

Remplacer le `<script setup>` entièrement :

```ts
<script setup lang="ts">
import { computed } from 'vue'
import { Line } from 'vue-chartjs'
import { Chart as ChartJS, LineElement, PointElement, CategoryScale, LinearScale, Tooltip, Legend } from 'chart.js'
import { averageIntensityByMonth, averageIntensityByDay, averageIntensityByWeek, type Period } from '../../utils/stats'
import { useChartThemeColors, withAlpha } from '../../utils/chartTheme'
import type { Migraine } from '../../types/migraine'

ChartJS.register(LineElement, PointElement, CategoryScale, LinearScale, Tooltip, Legend)

const props = defineProps<{ migraines: Migraine[]; period?: Period }>()
const themeColors = useChartThemeColors()

const chartData = computed(() => {
  const p = props.period ?? 'month'
  let items: { label: string; avg: number }[]
  if (p === 'day') {
    items = averageIntensityByDay(props.migraines).map((d) => ({ label: d.day.slice(5), avg: d.avg }))
  } else if (p === 'week') {
    items = averageIntensityByWeek(props.migraines).map((d) => ({ label: d.week.slice(5), avg: d.avg }))
  } else {
    items = averageIntensityByMonth(props.migraines).map((d) => ({ label: d.month.slice(5), avg: d.avg }))
  }
  return {
    labels: items.map((d) => d.label),
    datasets: [
      {
        label: 'Intensité moyenne',
        data: items.map((d) => d.avg),
        borderColor: themeColors.accent.value,
        backgroundColor: themeColors.accent.value,
        tension: 0.3,
      },
    ],
  }
})

const options = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { labels: { color: themeColors.text.value } } },
  scales: {
    x: {
      ticks: { color: themeColors.muted.value },
      grid: { color: withAlpha(themeColors.muted.value, 0.2) },
    },
    y: {
      min: 0,
      max: 10,
      ticks: { color: themeColors.muted.value },
      grid: { color: withAlpha(themeColors.muted.value, 0.2) },
    },
  },
}))
</script>
```

- [ ] **Step 3: Build et tests**

Run: `npm run build && npm test`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/components/charts/FrequencyChart.vue src/components/charts/IntensityChart.vue
git commit -m "feat: add period prop (day/week/month) to frequency and intensity charts"
```

---

### Task 3: StatsView — période, suppression EfficacyChart, fix ChartDetailModal

**Files:**
- Modify: `src/views/StatsView.vue`
- Modify: `src/components/charts/ChartDetailModal.vue`
- Delete: `src/components/charts/EfficacyChart.vue`

- [ ] **Step 1: Modifier `src/views/StatsView.vue`**

Dans `<script setup>`, ajouter les imports :
```ts
import { computed, ref } from 'vue'
import { defaultPeriod, type Period } from '../utils/stats'
```

Ajouter les refs :
```ts
const period = ref<Period>(defaultPeriod(migraines.migraines))
```

Supprimer l'import `EfficacyChart` et `openDetail('efficacy')`.

Changer le type de `activeDetail` :
```ts
const activeDetail = ref<'frequency' | 'intensity' | null>(null)
```

Dans `<template>`, remplacer la section des graphiques par :

```html
<div class="period-selector">
  <button
    v-for="p in (['day', 'week', 'month'] as const)"
    :key="p"
    type="button"
    :class="['period-btn', { active: period === p }]"
    @click="period = p"
  >{{ { day: 'Jour', week: 'Semaine', month: 'Mois' }[p] }}</button>
</div>

<div class="charts-grid">
  <button class="chart-card" @click="openDetail('frequency')">
    <h2>Fréquence</h2>
    <div class="chart-wrap"><FrequencyChart :migraines="migraines.migraines" :period="period" /></div>
  </button>
  <button class="chart-card" @click="openDetail('intensity')">
    <h2>Intensité moyenne</h2>
    <div class="chart-wrap"><IntensityChart :migraines="migraines.migraines" :period="period" /></div>
  </button>
</div>
```

(Supprimer le 3e `chart-card` pour EfficacyChart.)

Dans `<style scoped>`, modifier `.charts-grid` pour 2 colonnes sur desktop :
```css
@media (orientation: landscape) {
  .charts-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
```

Ajouter les styles pour le sélecteur de période et le `.chart-wrap` min-height :
```css
.period-selector {
  display: flex;
  gap: 0.5rem;
  flex-shrink: 0;
}
.period-btn {
  padding: 0.35rem 0.85rem;
  border-radius: 1rem;
  border: 1px solid var(--color-muted);
  background: none;
  color: var(--color-muted);
  font: inherit;
  font-size: 0.85rem;
  cursor: pointer;
}
.period-btn.active {
  background: var(--color-accent);
  color: var(--color-accent-contrast);
  border-color: var(--color-accent);
}
.chart-wrap {
  flex: 1;
  min-height: 200px;
  position: relative;
}
```

- [ ] **Step 2: Modifier `src/components/charts/ChartDetailModal.vue`**

Changer la prop :
```ts
const props = defineProps<{ chart: 'frequency' | 'intensity'; migraines: Migraine[] }>()
```

Dans `<template>`, remplacer `<EfficacyChart v-else :migraines="migraines" />` par `<IntensityChart v-else-if="chart === 'intensity'" :migraines="migraines" />` (déjà géré par `v-else-if`).

Supprimer entièrement :
- Import `EfficacyChart`
- `computed` `efficacyRank`
- La section `<template v-else>` dans `chart-detail-stats`

Dans le computed `title`, supprimer la branche `efficacy` :
```ts
const title = computed(() => {
  if (props.chart === 'frequency') return 'Fréquence (12 derniers mois)'
  return 'Intensité moyenne'
})
```

- [ ] **Step 3: Supprimer EfficacyChart.vue**

```bash
git rm src/components/charts/EfficacyChart.vue
```

- [ ] **Step 4: Build et tests**

Run: `npm run build && npm test`
Expected: PASS.

- [ ] **Step 5: Manual check**

Run: `npm run dev`.
- Page Stats : 2 graphiques (Fréquence, Intensité), sélecteur Jour/Semaine/Mois visible.
- Changer la période → les 2 graphiques se mettent à jour simultanément.
- La période par défaut correspond à la profondeur d'historique.
- Cliquer sur un graphique → ChartDetailModal s'ouvre avec le bon contenu (pas de crash sur efficacy).

- [ ] **Step 6: Commit**

```bash
git add src/views/StatsView.vue src/components/charts/ChartDetailModal.vue
git commit -m "feat: remove efficacy chart, add period selector with dynamic default in stats view"
```
