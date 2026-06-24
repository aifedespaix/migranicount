# Migraine Form/Wizard Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the migraine form modal's structure (header, progress, 3-button bottom bar, close-confirmation) and polish every step screen, including new reusable `DateField`/`TimeField`/`ConfirmDialog` components and a rebuilt icon-based `StepRecap`.

**Architecture:** Pure, unit-tested utility modules (`date.ts` additions, `calendar.ts`, `intensity.ts`, `localisation.ts`) back two new generic input components (`DateField.vue`, `TimeField.vue`) and a generic `ConfirmDialog.vue`. A shared `src/styles/form.css` stylesheet provides reusable `.pill-btn`/`.form-card`/`.recap-row` classes so step components stay small. `MigraineFormModal.vue` is rewired last, once every step and shared component it depends on already exists.

**Tech Stack:** Vue 3 `<script setup>`, TypeScript, Vitest.

## Global Constraints

- Bottom action bar always renders exactly three buttons in fixed positions: Précédent (left), Enregistrer (center), Suivant (right) — disabled (not hidden) when not applicable, so there's no layout jump between steps.
- Précédent disabled at `stepIndex === 0`; Suivant disabled at the last step; Enregistrer disabled unless `stepIndex === steps.length - 1`.
- Close is a single `×` icon button in the modal header (top-right), not a bottom-bar button.
- Create mode: closing is non-destructive (draft already autosaved) — `×` carries a `title="Fermer (brouillon conservé)"` tooltip, closes immediately.
- Edit mode: closing with unmodified data closes immediately; closing with modified data shows a custom `ConfirmDialog` (not native `confirm()`) before closing.
- `DateField`/`TimeField` are reusable components: typeable text input + icon button opening a popup (calendar grid for date, two scrollable hour/minute columns for time), closing on outside click or selection.
- `StepRecap` shows grouped, icon-labeled rows (📅/🎯/💊/🤢/📍/🔥/📝); empty/false fields are omitted, not shown as "aucun"/"non".
- This phase fixes a DRY issue carried over from the Migraine List redesign's final review: `LOCALISATION_LABELS` is currently duplicated in `src/utils/migraineFilters.ts` and `src/components/MigraineListItem.vue`. This plan extracts it once to `src/utils/localisation.ts` and migrates both existing consumers, so `StepRecap` becomes a third consumer of the shared version, not a third duplicate.
- No changes to `MigraineDraft`'s shape, validation rules, or storage layer.
- Spec: `docs/superpowers/specs/2026-06-24-migraine-form-design.md`.

---

## File Structure

- Create `src/styles/form.css` — shared `.pill-btn`/`.pill-group`/`.field-label`/`.form-card`/`.recap-row` classes; imported once in `src/main.ts`.
- Modify `src/utils/date.ts` — export `toISODate`, add `parseLooseISODate`, `parseLooseTime`.
- Modify `src/utils/date.test.ts` — tests for the above.
- Create `src/utils/calendar.ts` — `buildCalendarGrid(year, month)`.
- Create `src/utils/calendar.test.ts` — its tests.
- Create `src/utils/intensity.ts` — `intensityColor`, `intensityLabel`.
- Create `src/utils/intensity.test.ts` — its tests.
- Create `src/utils/localisation.ts` — `LOCALISATION_LABELS`, `localisationLabel`.
- Create `src/utils/localisation.test.ts` — its tests.
- Modify `src/utils/migraineFilters.ts` — use `localisationLabel` instead of its own copy.
- Modify `src/components/MigraineListItem.vue` — use `intensityColor` and `localisationLabel` instead of its own copies.
- Create `src/components/DateField.vue`.
- Create `src/components/TimeField.vue`.
- Create `src/components/ConfirmDialog.vue`.
- Modify `src/components/MigraineForm/StepWhen.vue` — use `DateField`/`TimeField`.
- Modify `src/components/MigraineForm/StepIntensity.vue` — gradient track + intensity label.
- Modify `src/components/MigraineForm/StepMedocs.vue` — `TimeField` + card rows.
- Modify `src/components/MigraineForm/StepSymptoms.vue` — pill toggle buttons.
- Modify `src/components/MigraineForm/StepLocationTriggers.vue` — shared pill classes.
- Modify `src/components/MigraineForm/StepNotes.vue` — restyled textarea + char counter.
- Modify `src/components/MigraineForm/StepRecap.vue` — icon-based rebuild.
- Modify `src/components/MigraineForm/MigraineFormModal.vue` — header/progress, 3-button bar, close-confirmation wiring.

---

### Task 1: Shared form stylesheet

**Files:**
- Create: `src/styles/form.css`
- Modify: `src/main.ts`

- [ ] **Step 1: Create the stylesheet**

Create `src/styles/form.css`:

```css
.step h2 {
  margin: 0 0 1rem;
  font-size: 1.1rem;
}

.field-label {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  margin-bottom: 1rem;
  font-size: 0.9rem;
  color: var(--color-muted);
}

.field-label.inline {
  flex-direction: row;
  align-items: center;
  gap: 0.5rem;
}

.pill-group {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.pill-btn {
  padding: 0.45rem 0.9rem;
  border-radius: 1.5rem;
  border: 1px solid var(--color-muted);
  background: var(--color-surface);
  color: var(--color-text);
  cursor: pointer;
  font-size: 0.85rem;
  transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease;
}

.pill-btn.active {
  background: var(--color-accent);
  color: var(--color-accent-contrast);
  border-color: var(--color-accent);
}

.form-card {
  background: var(--color-surface);
  border: 1px solid var(--color-muted);
  border-radius: 0.5rem;
  padding: 0.75rem 1rem;
  margin-bottom: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.recap-row {
  display: flex;
  align-items: flex-start;
  gap: 0.6rem;
  padding: 0.6rem 0;
  border-bottom: 1px solid var(--color-bg);
}

.recap-icon {
  font-size: 1.1rem;
  line-height: 1.4;
}

.recap-content {
  flex: 1;
}

.recap-label {
  font-size: 0.8rem;
  color: var(--color-muted);
  margin: 0 0 0.15rem;
}

.recap-value {
  font-size: 0.95rem;
}
```

- [ ] **Step 2: Import it globally**

In `src/main.ts`, change:

```ts
import './style.css'
import './styles/theme.css'
```

to:

```ts
import './style.css'
import './styles/theme.css'
import './styles/form.css'
```

- [ ] **Step 3: Verify the app still builds**

Run: `npx vite build`
Expected: build succeeds with no errors.

- [ ] **Step 4: Commit**

```bash
git add src/styles/form.css src/main.ts
git commit -m "feat: add shared form stylesheet for pill buttons, cards, and recap rows"
```

---

### Task 2: Date/time parsing helpers in `date.ts`

**Files:**
- Modify: `src/utils/date.ts`
- Test: `src/utils/date.test.ts`

**Interfaces:**
- Produces: `toISODate(d: Date): string` (now exported), `parseLooseISODate(text: string): string | null`, `parseLooseTime(text: string): string | null`.

- [ ] **Step 1: Write the failing tests**

Append to `src/utils/date.test.ts` (update the import line first):

```ts
import { describe, it, expect } from 'vitest'
import { todayISO, nowHHmm, formatRelative, formatDuration, toISODate, parseLooseISODate, parseLooseTime } from './date'
```

Then append these new `describe` blocks at the end of the file:

```ts
describe('toISODate', () => {
  it('formats a Date as YYYY-MM-DD', () => {
    expect(toISODate(new Date(2026, 5, 3))).toBe('2026-06-03')
  })
})

describe('parseLooseISODate', () => {
  it('accepts a valid ISO date', () => {
    expect(parseLooseISODate('2026-06-24')).toBe('2026-06-24')
  })

  it('accepts a French DD/MM/YYYY date and converts to ISO', () => {
    expect(parseLooseISODate('24/06/2026')).toBe('2026-06-24')
  })

  it('rejects an invalid calendar date', () => {
    expect(parseLooseISODate('2026-02-30')).toBeNull()
  })

  it('rejects unparseable text', () => {
    expect(parseLooseISODate('not a date')).toBeNull()
  })
})

describe('parseLooseTime', () => {
  it('accepts HH:mm', () => {
    expect(parseLooseTime('08:05')).toBe('08:05')
  })

  it('accepts compact HHmm', () => {
    expect(parseLooseTime('0805')).toBe('08:05')
  })

  it('accepts a single-digit hour with a colon', () => {
    expect(parseLooseTime('8:05')).toBe('08:05')
  })

  it('rejects an out-of-range hour', () => {
    expect(parseLooseTime('25:00')).toBeNull()
  })

  it('rejects unparseable text', () => {
    expect(parseLooseTime('nope')).toBeNull()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/utils/date.test.ts`
Expected: FAIL — `toISODate`, `parseLooseISODate`, `parseLooseTime` are not exported.

- [ ] **Step 3: Replace `date.ts` with the implementation**

Replace the full contents of `src/utils/date.ts`:

```ts
export function todayISO(): string {
  const d = new Date()
  return toISODate(d)
}

export function nowHHmm(): string {
  const d = new Date()
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function formatRelative(dateISO: string, from: Date = new Date()): string {
  const target = new Date(dateISO + 'T00:00:00')
  const reference = new Date(from.getFullYear(), from.getMonth(), from.getDate())
  const diffDays = Math.round((reference.getTime() - target.getTime()) / 86400000)
  if (diffDays === 0) return "aujourd'hui"
  if (diffDays === 1) return 'hier'
  if (diffDays > 1) return `il y a ${diffDays} jours`
  return `dans ${-diffDays} jours`
}

export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m}min`
  if (m === 0) return `${h}h`
  return `${h}h${pad(m)}`
}

export function toISODate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function parseLooseISODate(text: string): string | null {
  const trimmed = text.trim()
  const isoMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed)
  const frMatch = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(trimmed)
  let year: number, month: number, day: number
  if (isoMatch) {
    year = Number(isoMatch[1])
    month = Number(isoMatch[2])
    day = Number(isoMatch[3])
  } else if (frMatch) {
    day = Number(frMatch[1])
    month = Number(frMatch[2])
    year = Number(frMatch[3])
  } else {
    return null
  }
  const d = new Date(year, month - 1, day)
  if (d.getFullYear() !== year || d.getMonth() !== month - 1 || d.getDate() !== day) return null
  return toISODate(d)
}

export function parseLooseTime(text: string): string | null {
  const trimmed = text.trim()
  const colonMatch = /^(\d{1,2}):(\d{2})$/.exec(trimmed)
  const compactMatch = /^(\d{2})(\d{2})$/.exec(trimmed)
  let hour: number, minute: number
  if (colonMatch) {
    hour = Number(colonMatch[1])
    minute = Number(colonMatch[2])
  } else if (compactMatch) {
    hour = Number(compactMatch[1])
    minute = Number(compactMatch[2])
  } else {
    return null
  }
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null
  return `${pad(hour)}:${pad(minute)}`
}

function pad(n: number): string {
  return n.toString().padStart(2, '0')
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/utils/date.test.ts`
Expected: PASS (8 existing + 9 new = 17 tests)

- [ ] **Step 5: Commit**

```bash
git add src/utils/date.ts src/utils/date.test.ts
git commit -m "feat: add toISODate export and loose date/time text parsers"
```

---

### Task 3: `calendar.ts` grid builder

**Files:**
- Create: `src/utils/calendar.ts`
- Test: `src/utils/calendar.test.ts`

**Interfaces:**
- Consumes: `toISODate` from `./date` (Task 2).
- Produces: `interface CalendarDay { iso: string; day: number; inCurrentMonth: boolean }`, `buildCalendarGrid(year: number, month: number): CalendarDay[][]` (month is 0-indexed, weeks start Monday).

- [ ] **Step 1: Write the failing tests**

Create `src/utils/calendar.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { buildCalendarGrid } from './calendar'

describe('buildCalendarGrid', () => {
  it('returns weeks of 7 days covering the full month (June 2026, starts on Monday)', () => {
    const weeks = buildCalendarGrid(2026, 5) // June = month index 5
    expect(weeks.every((w) => w.length === 7)).toBe(true)
    const inMonthDays = weeks.flat().filter((d) => d.inCurrentMonth)
    expect(inMonthDays).toHaveLength(30)
    expect(inMonthDays[0].iso).toBe('2026-06-01')
    expect(inMonthDays[inMonthDays.length - 1].iso).toBe('2026-06-30')
  })

  it('has no leading padding when the month starts on Monday', () => {
    const weeks = buildCalendarGrid(2026, 5)
    expect(weeks[0][0].iso).toBe('2026-06-01')
  })

  it('pads leading days from the previous month when the month does not start on Monday', () => {
    const weeks = buildCalendarGrid(2026, 6) // July 2026 starts on a Wednesday
    const firstWeek = weeks[0]
    expect(firstWeek.filter((d) => !d.inCurrentMonth)).toHaveLength(2)
    expect(firstWeek[2].iso).toBe('2026-07-01')
  })

  it('pads trailing days from the next month to complete the last week', () => {
    const weeks = buildCalendarGrid(2026, 5) // June 2026 ends on a Tuesday
    const lastWeek = weeks[weeks.length - 1]
    const trailing = lastWeek.filter((d) => !d.inCurrentMonth)
    expect(trailing.length).toBeGreaterThan(0)
    expect(trailing[0].iso).toBe('2026-07-01')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/utils/calendar.test.ts`
Expected: FAIL — `Cannot find module './calendar'`

- [ ] **Step 3: Implement the helper**

Create `src/utils/calendar.ts`:

```ts
import { toISODate } from './date'

export interface CalendarDay {
  iso: string
  day: number
  inCurrentMonth: boolean
}

export function buildCalendarGrid(year: number, month: number): CalendarDay[][] {
  const firstOfMonth = new Date(year, month, 1)
  const startWeekday = (firstOfMonth.getDay() + 6) % 7 // 0 = Monday
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const daysInPrevMonth = new Date(year, month, 0).getDate()

  const cells: CalendarDay[] = []

  for (let i = startWeekday - 1; i >= 0; i--) {
    const day = daysInPrevMonth - i
    cells.push({ iso: toISODate(new Date(year, month - 1, day)), day, inCurrentMonth: false })
  }
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push({ iso: toISODate(new Date(year, month, day)), day, inCurrentMonth: true })
  }
  let nextDay = 1
  while (cells.length % 7 !== 0) {
    cells.push({ iso: toISODate(new Date(year, month + 1, nextDay)), day: nextDay, inCurrentMonth: false })
    nextDay++
  }

  const weeks: CalendarDay[][] = []
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7))
  }
  return weeks
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/utils/calendar.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add src/utils/calendar.ts src/utils/calendar.test.ts
git commit -m "feat: add buildCalendarGrid helper for the DateField popup"
```

---

### Task 4: Shared display utilities — `intensity.ts` + `localisation.ts`, migrate existing duplicates

**Files:**
- Create: `src/utils/intensity.ts`
- Test: `src/utils/intensity.test.ts`
- Create: `src/utils/localisation.ts`
- Test: `src/utils/localisation.test.ts`
- Modify: `src/utils/migraineFilters.ts`
- Modify: `src/components/MigraineListItem.vue`

**Interfaces:**
- Produces: `intensityColor(score: number): string`, `intensityLabel(score: number): string`, `LOCALISATION_LABELS: Record<NonNullable<Migraine['localisation']>, string>`, `localisationLabel(loc: Migraine['localisation']): string | null`.

- [ ] **Step 1: Write the failing tests**

Create `src/utils/intensity.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { intensityColor, intensityLabel } from './intensity'

describe('intensityColor', () => {
  it('returns a warm hue at low intensity', () => {
    expect(intensityColor(0)).toBe('hsl(50, 80%, 50%)')
  })

  it('returns a red hue at max intensity', () => {
    expect(intensityColor(10)).toBe('hsl(0, 80%, 50%)')
  })
})

describe('intensityLabel', () => {
  it('labels 1-3 as Légère', () => {
    expect(intensityLabel(1)).toBe('Légère')
    expect(intensityLabel(3)).toBe('Légère')
  })

  it('labels 4-6 as Modérée', () => {
    expect(intensityLabel(4)).toBe('Modérée')
    expect(intensityLabel(6)).toBe('Modérée')
  })

  it('labels 7-8 as Forte', () => {
    expect(intensityLabel(7)).toBe('Forte')
    expect(intensityLabel(8)).toBe('Forte')
  })

  it('labels 9-10 as Sévère', () => {
    expect(intensityLabel(9)).toBe('Sévère')
    expect(intensityLabel(10)).toBe('Sévère')
  })
})
```

Create `src/utils/localisation.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { LOCALISATION_LABELS, localisationLabel } from './localisation'

describe('localisationLabel', () => {
  it('returns the French label for a known localisation', () => {
    expect(localisationLabel('bilaterale')).toBe('Bilatérale')
    expect(localisationLabel('gauche')).toBe('Gauche')
    expect(localisationLabel('droite')).toBe('Droite')
    expect(localisationLabel('nuque')).toBe('Nuque')
  })

  it('returns null for null', () => {
    expect(localisationLabel(null)).toBeNull()
  })

  it('LOCALISATION_LABELS covers all four values', () => {
    expect(Object.keys(LOCALISATION_LABELS).sort()).toEqual(['bilaterale', 'droite', 'gauche', 'nuque'])
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/utils/intensity.test.ts src/utils/localisation.test.ts`
Expected: FAIL — both modules not found.

- [ ] **Step 3: Implement the helpers**

Create `src/utils/intensity.ts`:

```ts
export function intensityColor(score: number): string {
  const hue = 50 - (score / 10) * 50
  return `hsl(${hue}, 80%, 50%)`
}

export function intensityLabel(score: number): string {
  if (score <= 3) return 'Légère'
  if (score <= 6) return 'Modérée'
  if (score <= 8) return 'Forte'
  return 'Sévère'
}
```

Create `src/utils/localisation.ts`:

```ts
import type { Migraine } from '../types/migraine'

export const LOCALISATION_LABELS: Record<NonNullable<Migraine['localisation']>, string> = {
  gauche: 'Gauche',
  droite: 'Droite',
  bilaterale: 'Bilatérale',
  nuque: 'Nuque',
}

export function localisationLabel(loc: Migraine['localisation']): string | null {
  return loc ? LOCALISATION_LABELS[loc] : null
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/utils/intensity.test.ts src/utils/localisation.test.ts`
Expected: PASS (3 + 3 tests)

- [ ] **Step 5: Migrate `migraineFilters.ts` to the shared `localisationLabel`**

In `src/utils/migraineFilters.ts`, remove this block:

```ts
const LOCALISATION_LABELS: Record<NonNullable<Migraine['localisation']>, string> = {
  gauche: 'Gauche',
  droite: 'Droite',
  bilaterale: 'Bilatérale',
  nuque: 'Nuque',
}
```

Add this import at the top of the file:

```ts
import { localisationLabel } from './localisation'
```

In `matchesKeyword`, change:

```ts
    migraine.localisation ? LOCALISATION_LABELS[migraine.localisation] : '',
```

to:

```ts
    localisationLabel(migraine.localisation) ?? '',
```

- [ ] **Step 6: Migrate `MigraineListItem.vue` to the shared utilities**

In `src/components/MigraineListItem.vue`, replace the `<script setup>` block's imports and local helpers:

Remove:

```ts
const LOCALISATION_LABELS: Record<NonNullable<Migraine['localisation']>, string> = {
  gauche: 'Gauche',
  droite: 'Droite',
  bilaterale: 'Bilatérale',
  nuque: 'Nuque',
}
```

and the existing `intensityColor` computed:

```ts
const intensityColor = computed(() => {
  const hue = 50 - (props.migraine.intensite / 10) * 50
  return `hsl(${hue}, 80%, 50%)`
})
```

and the existing `localisationLabel` computed:

```ts
const localisationLabel = computed(() =>
  props.migraine.localisation ? LOCALISATION_LABELS[props.migraine.localisation] : null
)
```

Replace with:

```ts
import { intensityColor as intensityColorFn } from '../utils/intensity'
import { localisationLabel as localisationLabelFn } from '../utils/localisation'

const intensityColorValue = computed(() => intensityColorFn(props.migraine.intensite))
const localisationLabel = computed(() => localisationLabelFn(props.migraine.localisation))
```

In the `<template>`, change the intensity span's binding from:

```html
<span class="intensity" :style="{ background: intensityColor }">{{ migraine.intensite }}</span>
```

to:

```html
<span class="intensity" :style="{ background: intensityColorValue }">{{ migraine.intensite }}</span>
```

The `localisationLabel` computed keeps its name (only its implementation changed), so the template's existing `{{ localisationLabel }}` usage is unaffected.

- [ ] **Step 7: Run the full test suite**

Run: `npx vitest run`
Expected: all tests pass (existing 41 + new 6 = 47).

- [ ] **Step 8: Commit**

```bash
git add src/utils/intensity.ts src/utils/intensity.test.ts src/utils/localisation.ts src/utils/localisation.test.ts src/utils/migraineFilters.ts src/components/MigraineListItem.vue
git commit -m "refactor: extract shared intensity/localisation display helpers, remove duplication"
```

---

### Task 5: `DateField` component

**Files:**
- Create: `src/components/DateField.vue`

**Interfaces:**
- Consumes: `buildCalendarGrid` from `../utils/calendar` (Task 3), `parseLooseISODate`/`todayISO` from `../utils/date` (Task 2).
- Produces: `defineModel<string>({ required: true })` bound to an ISO `YYYY-MM-DD` string. No other props/emits.

- [ ] **Step 1: Create the component**

Create `src/components/DateField.vue`:

```vue
<template>
  <div class="date-field" ref="rootRef">
    <input
      type="text"
      class="date-field-input"
      v-model="textValue"
      placeholder="JJ/MM/AAAA"
      @blur="onBlur"
      @keydown.enter="onEnter"
    />
    <button type="button" class="date-field-icon" @click="togglePopup" aria-label="Choisir une date">📅</button>
    <div v-if="showPopup" class="date-field-popup">
      <div class="calendar-header">
        <button type="button" @click="prevMonth">‹</button>
        <span>{{ monthLabel }}</span>
        <button type="button" @click="nextMonth">›</button>
      </div>
      <div class="calendar-weekdays">
        <span v-for="wd in weekdayLabels" :key="wd">{{ wd }}</span>
      </div>
      <div class="calendar-grid">
        <button
          v-for="cell in grid.flat()"
          :key="cell.iso"
          type="button"
          class="calendar-cell"
          :class="{ 'out-of-month': !cell.inCurrentMonth, selected: cell.iso === model, today: cell.iso === todayIso }"
          @click="selectDay(cell.iso)"
        >
          {{ cell.day }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { buildCalendarGrid } from '../utils/calendar'
import { parseLooseISODate, todayISO } from '../utils/date'

const model = defineModel<string>({ required: true })

const rootRef = ref<HTMLElement | null>(null)
const textValue = ref(model.value)
const showPopup = ref(false)
const todayIso = todayISO()

const initial = model.value ? new Date(model.value + 'T00:00:00') : new Date()
const viewYear = ref(initial.getFullYear())
const viewMonth = ref(initial.getMonth())

const weekdayLabels = ['Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa', 'Di']
const monthNames = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
]
const monthLabel = computed(() => `${monthNames[viewMonth.value]} ${viewYear.value}`)
const grid = computed(() => buildCalendarGrid(viewYear.value, viewMonth.value))

watch(model, (v) => { textValue.value = v })

function togglePopup() {
  showPopup.value = !showPopup.value
}

function prevMonth() {
  if (viewMonth.value === 0) {
    viewMonth.value = 11
    viewYear.value--
  } else {
    viewMonth.value--
  }
}

function nextMonth() {
  if (viewMonth.value === 11) {
    viewMonth.value = 0
    viewYear.value++
  } else {
    viewMonth.value++
  }
}

function selectDay(iso: string) {
  model.value = iso
  textValue.value = iso
  showPopup.value = false
}

function onBlur() {
  const parsed = parseLooseISODate(textValue.value)
  if (parsed) {
    model.value = parsed
    textValue.value = parsed
  } else {
    textValue.value = model.value
  }
}

function onEnter() {
  onBlur()
}

function onOutsideClick(e: MouseEvent) {
  if (showPopup.value && rootRef.value && !rootRef.value.contains(e.target as Node)) {
    showPopup.value = false
  }
}

onMounted(() => document.addEventListener('mousedown', onOutsideClick))
onUnmounted(() => document.removeEventListener('mousedown', onOutsideClick))
</script>

<style scoped>
.date-field {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
}
.date-field-input {
  padding: 0.5rem 0.75rem;
  border-radius: 0.5rem;
  border: 1px solid var(--color-muted);
  background: var(--color-surface);
  color: var(--color-text);
  font-size: 0.95rem;
  width: 9rem;
}
.date-field-icon {
  background: none;
  border: none;
  font-size: 1.2rem;
  cursor: pointer;
}
.date-field-popup {
  position: absolute;
  top: 100%;
  left: 0;
  z-index: 40;
  background: var(--color-surface);
  border: 1px solid var(--color-muted);
  border-radius: 0.5rem;
  padding: 0.75rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  width: 16rem;
}
.calendar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.5rem;
  font-weight: 600;
}
.calendar-header button {
  background: none;
  border: none;
  font-size: 1.1rem;
  cursor: pointer;
  color: var(--color-text);
}
.calendar-weekdays {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  text-align: center;
  font-size: 0.75rem;
  color: var(--color-muted);
  margin-bottom: 0.25rem;
}
.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 0.15rem;
}
.calendar-cell {
  background: none;
  border: none;
  padding: 0.4rem 0;
  border-radius: 0.4rem;
  cursor: pointer;
  color: var(--color-text);
  font-size: 0.85rem;
}
.calendar-cell:hover {
  background: var(--color-bg);
}
.calendar-cell.out-of-month {
  color: var(--color-muted);
  opacity: 0.5;
}
.calendar-cell.today {
  border: 1px solid var(--color-accent);
}
.calendar-cell.selected {
  background: var(--color-accent);
  color: var(--color-accent-contrast);
}
</style>
```

- [ ] **Step 2: Verify it compiles**

Run: `npx vue-tsc --noEmit`
Expected: no new type errors from `DateField.vue`.

- [ ] **Step 3: Commit**

```bash
git add src/components/DateField.vue
git commit -m "feat: add reusable DateField component with calendar popup"
```

---

### Task 6: `TimeField` component

**Files:**
- Create: `src/components/TimeField.vue`

**Interfaces:**
- Consumes: `parseLooseTime` from `../utils/date` (Task 2).
- Produces: `defineModel<string>({ required: true })` bound to an `HH:mm` string. No other props/emits.

- [ ] **Step 1: Create the component**

Create `src/components/TimeField.vue`:

```vue
<template>
  <div class="time-field" ref="rootRef">
    <input
      type="text"
      class="time-field-input"
      v-model="textValue"
      placeholder="HH:mm"
      @blur="onBlur"
      @keydown.enter="onEnter"
    />
    <button type="button" class="time-field-icon" @click="togglePopup" aria-label="Choisir une heure">🕐</button>
    <div v-if="showPopup" class="time-field-popup">
      <div class="time-column">
        <button
          v-for="h in hours"
          :key="h"
          type="button"
          class="time-cell"
          :class="{ selected: h === selectedHour }"
          @click="pickHour(h)"
        >
          {{ h }}
        </button>
      </div>
      <div class="time-column">
        <button
          v-for="m in minutes"
          :key="m"
          type="button"
          class="time-cell"
          :class="{ selected: m === selectedMinute }"
          @click="pickMinute(m)"
        >
          {{ m }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { parseLooseTime } from '../utils/date'

const model = defineModel<string>({ required: true })

const rootRef = ref<HTMLElement | null>(null)
const textValue = ref(model.value)
const showPopup = ref(false)

const [initialHour, initialMinute] = model.value.split(':')
const selectedHour = ref(initialHour)
const selectedMinute = ref(initialMinute)
const hourPicked = ref(false)
const minutePicked = ref(false)

const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'))
const minutes = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'))

watch(model, (v) => {
  textValue.value = v
  const [h, m] = v.split(':')
  selectedHour.value = h
  selectedMinute.value = m
})

function togglePopup() {
  showPopup.value = !showPopup.value
  if (showPopup.value) {
    hourPicked.value = false
    minutePicked.value = false
  }
}

function applyIfBothPicked() {
  if (hourPicked.value && minutePicked.value) {
    model.value = `${selectedHour.value}:${selectedMinute.value}`
    textValue.value = model.value
    showPopup.value = false
  }
}

function pickHour(h: string) {
  selectedHour.value = h
  hourPicked.value = true
  applyIfBothPicked()
}

function pickMinute(m: string) {
  selectedMinute.value = m
  minutePicked.value = true
  applyIfBothPicked()
}

function onBlur() {
  const parsed = parseLooseTime(textValue.value)
  if (parsed) {
    model.value = parsed
    textValue.value = parsed
  } else {
    textValue.value = model.value
  }
}

function onEnter() {
  onBlur()
}

function onOutsideClick(e: MouseEvent) {
  if (showPopup.value && rootRef.value && !rootRef.value.contains(e.target as Node)) {
    showPopup.value = false
  }
}

onMounted(() => document.addEventListener('mousedown', onOutsideClick))
onUnmounted(() => document.removeEventListener('mousedown', onOutsideClick))
</script>

<style scoped>
.time-field {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
}
.time-field-input {
  padding: 0.5rem 0.75rem;
  border-radius: 0.5rem;
  border: 1px solid var(--color-muted);
  background: var(--color-surface);
  color: var(--color-text);
  font-size: 0.95rem;
  width: 5rem;
}
.time-field-icon {
  background: none;
  border: none;
  font-size: 1.2rem;
  cursor: pointer;
}
.time-field-popup {
  position: absolute;
  top: 100%;
  left: 0;
  z-index: 40;
  background: var(--color-surface);
  border: 1px solid var(--color-muted);
  border-radius: 0.5rem;
  padding: 0.5rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  display: flex;
  gap: 0.5rem;
}
.time-column {
  max-height: 10rem;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}
.time-cell {
  background: none;
  border: none;
  padding: 0.3rem 0.75rem;
  cursor: pointer;
  color: var(--color-text);
  font-size: 0.85rem;
  text-align: center;
}
.time-cell:hover {
  background: var(--color-bg);
}
.time-cell.selected {
  background: var(--color-accent);
  color: var(--color-accent-contrast);
}
</style>
```

- [ ] **Step 2: Verify it compiles**

Run: `npx vue-tsc --noEmit`
Expected: no new type errors from `TimeField.vue`.

- [ ] **Step 3: Commit**

```bash
git add src/components/TimeField.vue
git commit -m "feat: add reusable TimeField component with hour/minute popup"
```

---

### Task 7: `ConfirmDialog` component

**Files:**
- Create: `src/components/ConfirmDialog.vue`

**Interfaces:**
- Produces: `defineProps<{ title: string; message: string; confirmLabel: string; cancelLabel: string }>()`, `defineEmits<{ confirm: []; cancel: [] }>()`.

- [ ] **Step 1: Create the component**

Create `src/components/ConfirmDialog.vue`:

```vue
<template>
  <div class="confirm-backdrop" @click.self="$emit('cancel')">
    <div class="confirm-dialog" role="alertdialog" aria-modal="true">
      <h3>{{ title }}</h3>
      <p>{{ message }}</p>
      <div class="confirm-actions">
        <button type="button" class="btn-secondary" @click="$emit('cancel')">{{ cancelLabel }}</button>
        <button type="button" class="btn-danger" @click="$emit('confirm')">{{ confirmLabel }}</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{ title: string; message: string; confirmLabel: string; cancelLabel: string }>()
defineEmits<{ confirm: []; cancel: [] }>()
</script>

<style scoped>
.confirm-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 60;
}
.confirm-dialog {
  background: var(--color-surface);
  color: var(--color-text);
  border-radius: 0.75rem;
  padding: 1.5rem;
  width: min(90vw, 360px);
}
.confirm-dialog h3 {
  margin: 0 0 0.5rem;
  font-size: 1.05rem;
}
.confirm-dialog p {
  margin: 0 0 1.25rem;
  color: var(--color-muted);
  font-size: 0.9rem;
}
.confirm-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
}
.btn-secondary {
  background: none;
  border: 1px solid var(--color-muted);
  color: var(--color-text);
  border-radius: 0.5rem;
  padding: 0.5rem 1rem;
  cursor: pointer;
}
.btn-danger {
  background: var(--color-danger);
  color: white;
  border: none;
  border-radius: 0.5rem;
  padding: 0.5rem 1rem;
  cursor: pointer;
}
</style>
```

Note: `z-index: 60` is intentionally higher than `ChartDetailModal`'s `50` and `MigraineFormModal`'s `30` — this dialog must render above the form modal it interrupts.

- [ ] **Step 2: Verify it compiles**

Run: `npx vue-tsc --noEmit`
Expected: no new type errors from `ConfirmDialog.vue`.

- [ ] **Step 3: Commit**

```bash
git add src/components/ConfirmDialog.vue
git commit -m "feat: add reusable ConfirmDialog component"
```

---

### Task 8: Rewire `StepWhen` to use `DateField`/`TimeField`

**Files:**
- Modify: `src/components/MigraineForm/StepWhen.vue`

**Interfaces:**
- Consumes: `DateField` (Task 5), `TimeField` (Task 6), both bound via `v-model` to a `string`.

- [ ] **Step 1: Replace the file**

Replace the full contents of `src/components/MigraineForm/StepWhen.vue`:

```vue
<template>
  <div class="step">
    <h2>Quand ?</h2>
    <label class="field-label">
      <span>Date</span>
      <DateField v-model="model.date" />
    </label>
    <label class="field-label">
      <span>Heure de début</span>
      <TimeField v-model="model.heureDebut" />
    </label>
    <label class="field-label inline">
      <input type="checkbox" :checked="model.heureFin === null" @change="toggleEnCours" />
      Crise en cours
    </label>
    <label v-if="model.heureFin !== null" class="field-label">
      <span>Heure de fin</span>
      <TimeField v-model="heureFinModel" />
    </label>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import DateField from '../DateField.vue'
import TimeField from '../TimeField.vue'
import type { MigraineDraft } from './draft'

const model = defineModel<MigraineDraft>({ required: true })

const heureFinModel = computed({
  get: () => model.value.heureFin ?? '',
  set: (v: string) => {
    model.value.heureFin = v
  },
})

function toggleEnCours(e: Event) {
  const checked = (e.target as HTMLInputElement).checked
  model.value.heureFin = checked ? null : model.value.heureDebut
}
</script>
```

Note: `heureFinModel` is a writable computed proxy because `model.heureFin` is typed `string | null` while `TimeField` expects a plain `string` — directly binding `v-model="model.heureFin!"` is not a valid assignment target in a template, so the proxy is the correct fix (not a workaround).

- [ ] **Step 2: Verify it compiles**

Run: `npx vue-tsc --noEmit`
Expected: no new type errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/MigraineForm/StepWhen.vue
git commit -m "feat: use DateField/TimeField in StepWhen"
```

---

### Task 9: Restyle `StepIntensity`

**Files:**
- Modify: `src/components/MigraineForm/StepIntensity.vue`

**Interfaces:**
- Consumes: `intensityColor`, `intensityLabel` from `../../utils/intensity` (Task 4).

- [ ] **Step 1: Replace the file**

Replace the full contents of `src/components/MigraineForm/StepIntensity.vue`:

```vue
<template>
  <div class="step">
    <h2>Intensité</h2>
    <input type="range" min="1" max="10" v-model.number="model.intensite" class="intensity-slider" />
    <p class="intensity-value" :style="{ color: trackColor }">{{ model.intensite }} / 10 — {{ label }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { intensityColor, intensityLabel } from '../../utils/intensity'
import type { MigraineDraft } from './draft'

const model = defineModel<MigraineDraft>({ required: true })

const trackColor = computed(() => intensityColor(model.value.intensite))
const label = computed(() => intensityLabel(model.value.intensite))
</script>

<style scoped>
.intensity-slider {
  width: 100%;
  height: 0.5rem;
  border-radius: 0.25rem;
  appearance: none;
  cursor: pointer;
  background: linear-gradient(to right, hsl(50, 80%, 50%), hsl(0, 80%, 50%));
  margin: 1rem 0;
}
.intensity-slider::-webkit-slider-thumb {
  appearance: none;
  width: 1.1rem;
  height: 1.1rem;
  border-radius: 50%;
  background: var(--color-surface);
  border: 2px solid var(--color-text);
  cursor: pointer;
}
.intensity-slider::-moz-range-thumb {
  width: 1.1rem;
  height: 1.1rem;
  border-radius: 50%;
  background: var(--color-surface);
  border: 2px solid var(--color-text);
  cursor: pointer;
}
.intensity-value {
  margin-top: 0.5rem;
  font-size: 1.1rem;
  font-weight: 600;
  text-align: center;
}
</style>
```

- [ ] **Step 2: Verify it compiles**

Run: `npx vue-tsc --noEmit`
Expected: no new type errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/MigraineForm/StepIntensity.vue
git commit -m "feat: add gradient track and text label to StepIntensity"
```

---

### Task 10: Restyle `StepMedocs`

**Files:**
- Modify: `src/components/MigraineForm/StepMedocs.vue`

**Interfaces:**
- Consumes: `TimeField` (Task 6), `.form-card`/`.pill-btn`/`.pill-group` from `src/styles/form.css` (Task 1, global, no import needed in the component).

- [ ] **Step 1: Replace the file**

Replace the full contents of `src/components/MigraineForm/StepMedocs.vue`:

```vue
<template>
  <div class="step">
    <h2>Médicaments</h2>
    <div class="pill-group">
      <button v-for="f in favoris.favoris" :key="f.nom" type="button" class="pill-btn" @click="addFromFavori(f)">
        {{ f.nom }}
      </button>
    </div>
    <div v-for="(p, i) in model.medocs" :key="p.id" class="form-card">
      <span>{{ p.nom }} — {{ p.heure }}</span>
      <button type="button" class="icon-btn" @click="remove(i)" aria-label="Supprimer">✕</button>
    </div>
    <form class="medoc-add-form" @submit.prevent="addNew">
      <input v-model="nomInput" placeholder="Nom du médicament" required />
      <input v-model="descriptionInput" placeholder="Description (optionnel)" />
      <TimeField v-model="heureInput" />
      <button type="submit" class="pill-btn">+ Ajouter une prise</button>
    </form>
  </div>
</template>

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

<style scoped>
.medoc-add-form {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: center;
  margin-top: 0.75rem;
}
.medoc-add-form input {
  padding: 0.5rem 0.75rem;
  border-radius: 0.5rem;
  border: 1px solid var(--color-muted);
  background: var(--color-surface);
  color: var(--color-text);
  flex: 1;
  min-width: 140px;
}
.icon-btn {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--color-danger);
  font-size: 1rem;
}
</style>
```

- [ ] **Step 2: Verify it compiles**

Run: `npx vue-tsc --noEmit`
Expected: no new type errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/MigraineForm/StepMedocs.vue
git commit -m "feat: restyle StepMedocs with cards and TimeField"
```

---

### Task 11: Restyle `StepSymptoms` with pill toggles

**Files:**
- Modify: `src/components/MigraineForm/StepSymptoms.vue`

**Interfaces:**
- Consumes: `.pill-btn`/`.pill-group` from `src/styles/form.css` (Task 1).

- [ ] **Step 1: Replace the file**

Replace the full contents of `src/components/MigraineForm/StepSymptoms.vue`:

```vue
<template>
  <div class="step">
    <h2>Symptômes</h2>
    <div class="pill-group">
      <button
        type="button"
        class="pill-btn"
        :class="{ active: model.nausee }"
        @click="model.nausee = !model.nausee"
      >
        Nausée
      </button>
      <button
        type="button"
        class="pill-btn"
        :class="{ active: model.vomissement }"
        @click="model.vomissement = !model.vomissement"
      >
        Vomissement
      </button>
      <button
        type="button"
        class="pill-btn"
        :class="{ active: model.aura }"
        @click="model.aura = !model.aura"
      >
        Aura visuelle
      </button>
      <button
        v-if="model.medocs.length > 0"
        type="button"
        class="pill-btn"
        :class="{ active: model.avortee }"
        @click="model.avortee = !model.avortee"
      >
        Migraine avortée par le médicament
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { MigraineDraft } from './draft'
const model = defineModel<MigraineDraft>({ required: true })
</script>
```

- [ ] **Step 2: Verify it compiles**

Run: `npx vue-tsc --noEmit`
Expected: no new type errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/MigraineForm/StepSymptoms.vue
git commit -m "feat: convert StepSymptoms checkboxes to pill toggle buttons"
```

---

### Task 12: Polish `StepLocationTriggers` with shared pill classes

**Files:**
- Modify: `src/components/MigraineForm/StepLocationTriggers.vue`

**Interfaces:**
- Consumes: `.pill-btn`/`.pill-group` from `src/styles/form.css` (Task 1). No change to `localisations`/`labels`/`toggleTag`/`addCustomTag` logic.

- [ ] **Step 1: Replace the file**

Replace the full contents of `src/components/MigraineForm/StepLocationTriggers.vue`:

```vue
<template>
  <div class="step">
    <h2>Localisation & déclencheurs</h2>
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

const localisations = ['gauche', 'droite', 'bilaterale', 'nuque'] as const
const labels: Record<typeof localisations[number], string> = {
  gauche: 'Gauche', droite: 'Droite', bilaterale: 'Bilatérale', nuque: 'Nuque',
}

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

- [ ] **Step 2: Verify it compiles**

Run: `npx vue-tsc --noEmit`
Expected: no new type errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/MigraineForm/StepLocationTriggers.vue
git commit -m "feat: apply shared pill classes to StepLocationTriggers"
```

---

### Task 13: Restyle `StepNotes` with a character counter

**Files:**
- Modify: `src/components/MigraineForm/StepNotes.vue`

- [ ] **Step 1: Replace the file**

Replace the full contents of `src/components/MigraineForm/StepNotes.vue`:

```vue
<template>
  <div class="step">
    <h2>Notes</h2>
    <textarea
      v-model="model.notes"
      rows="5"
      maxlength="500"
      placeholder="Notes libres (optionnel)"
      class="notes-textarea"
    ></textarea>
    <p class="char-counter">{{ (model.notes ?? '').length }} / 500</p>
  </div>
</template>

<script setup lang="ts">
import type { MigraineDraft } from './draft'
const model = defineModel<MigraineDraft>({ required: true })
</script>

<style scoped>
.notes-textarea {
  width: 100%;
  box-sizing: border-box;
  padding: 0.75rem;
  border-radius: 0.5rem;
  border: 1px solid var(--color-muted);
  background: var(--color-surface);
  color: var(--color-text);
  font-family: inherit;
  font-size: 0.95rem;
  resize: vertical;
}
.char-counter {
  text-align: right;
  font-size: 0.8rem;
  color: var(--color-muted);
  margin: 0.25rem 0 0;
}
</style>
```

- [ ] **Step 2: Verify it compiles**

Run: `npx vue-tsc --noEmit`
Expected: no new type errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/MigraineForm/StepNotes.vue
git commit -m "feat: restyle StepNotes textarea and add character counter"
```

---

### Task 14: Rebuild `StepRecap` as icon-based grouped rows

**Files:**
- Modify: `src/components/MigraineForm/StepRecap.vue`

**Interfaces:**
- Consumes: `intensityColor`, `intensityLabel` from `../../utils/intensity` (Task 4); `localisationLabel` from `../../utils/localisation` (Task 4); `.recap-row`/`.recap-icon`/`.recap-content`/`.recap-label`/`.recap-value`/`.pill-btn`/`.pill-group` from `src/styles/form.css` (Task 1).

- [ ] **Step 1: Replace the file**

Replace the full contents of `src/components/MigraineForm/StepRecap.vue`:

```vue
<template>
  <div class="step">
    <h2>Récapitulatif</h2>

    <div class="recap-row">
      <span class="recap-icon">📅</span>
      <div class="recap-content">
        <p class="recap-label">Date & durée</p>
        <p class="recap-value">{{ model.date }} · {{ model.heureDebut }} – {{ model.heureFin ?? 'en cours' }}</p>
      </div>
    </div>

    <div class="recap-row">
      <span class="recap-icon">🎯</span>
      <div class="recap-content">
        <p class="recap-label">Intensité</p>
        <p class="recap-value">
          <span class="intensity-badge" :style="{ background: intensityColorValue }">{{ model.intensite }}</span>
          {{ intensityLabelValue }}
        </p>
      </div>
    </div>

    <div class="recap-row" v-if="model.medocs.length">
      <span class="recap-icon">💊</span>
      <div class="recap-content">
        <p class="recap-label">Médicaments</p>
        <p class="recap-value">{{ model.medocs.map((m) => `${m.nom} (${m.heure})`).join(', ') }}</p>
      </div>
    </div>

    <div class="recap-row" v-if="hasSymptoms">
      <span class="recap-icon">🤢</span>
      <div class="recap-content">
        <p class="recap-label">Symptômes</p>
        <div class="pill-group">
          <span v-if="model.avortee" class="pill-btn active">Avortée</span>
          <span v-if="model.nausee" class="pill-btn">Nausée</span>
          <span v-if="model.vomissement" class="pill-btn">Vomissement</span>
          <span v-if="model.aura" class="pill-btn">Aura</span>
        </div>
      </div>
    </div>

    <div class="recap-row" v-if="localisationLabelValue">
      <span class="recap-icon">📍</span>
      <div class="recap-content">
        <p class="recap-label">Localisation</p>
        <p class="recap-value">{{ localisationLabelValue }}</p>
      </div>
    </div>

    <div class="recap-row" v-if="model.declencheurs.length">
      <span class="recap-icon">🔥</span>
      <div class="recap-content">
        <p class="recap-label">Déclencheurs</p>
        <div class="pill-group">
          <span v-for="d in model.declencheurs" :key="d" class="pill-btn">{{ d }}</span>
        </div>
      </div>
    </div>

    <div class="recap-row" v-if="model.notes">
      <span class="recap-icon">📝</span>
      <div class="recap-content">
        <p class="recap-label">Notes</p>
        <p class="recap-value">{{ model.notes }}</p>
      </div>
    </div>
  </div>
</template>

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

<style scoped>
.intensity-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1.5rem;
  height: 1.5rem;
  border-radius: 50%;
  color: #1c1726;
  font-weight: 700;
  font-size: 0.8rem;
  margin-right: 0.4rem;
}
</style>
```

- [ ] **Step 2: Verify it compiles**

Run: `npx vue-tsc --noEmit`
Expected: no new type errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/MigraineForm/StepRecap.vue
git commit -m "feat: rebuild StepRecap as icon-based grouped summary"
```

---

### Task 15: Rewire `MigraineFormModal` — header, 3-button bar, close confirmation

**Files:**
- Modify: `src/components/MigraineForm/MigraineFormModal.vue`

**Interfaces:**
- Consumes: `ConfirmDialog` (Task 7, props `{ title, message, confirmLabel, cancelLabel }`, emits `confirm: []; cancel: []`). All seven step components (Tasks 8-14) keep the same `defineModel<MigraineDraft>` contract, so no change needed on their side for this integration.

- [ ] **Step 1: Replace the file**

Replace the full contents of `src/components/MigraineForm/MigraineFormModal.vue`:

```vue
<template>
  <div class="modal-backdrop" @click.self="requestClose">
    <div class="modal-sheet">
      <header class="modal-header">
        <div class="modal-header-text">
          <p class="modal-progress">Étape {{ stepIndex + 1 }} / {{ steps.length }}</p>
          <h1 class="modal-title">{{ stepTitles[stepIndex] }}</h1>
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
      <div class="progress-bar">
        <div class="progress-bar-fill" :style="{ width: progressPercent + '%' }"></div>
      </div>

      <div class="modal-body">
        <component :is="steps[stepIndex]" v-model="draft" />
      </div>

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
    </div>

    <ConfirmDialog
      v-if="showConfirmDialog"
      title="Annuler les modifications ?"
      message="Vous avez des modifications non enregistrées. Voulez-vous vraiment fermer sans enregistrer ?"
      confirm-label="Quitter sans enregistrer"
      cancel-label="Continuer l'édition"
      @confirm="confirmDiscardClose"
      @cancel="showConfirmDialog = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import StepWhen from './StepWhen.vue'
import StepIntensity from './StepIntensity.vue'
import StepMedocs from './StepMedocs.vue'
import StepSymptoms from './StepSymptoms.vue'
import StepLocationTriggers from './StepLocationTriggers.vue'
import StepNotes from './StepNotes.vue'
import StepRecap from './StepRecap.vue'
import ConfirmDialog from '../ConfirmDialog.vue'
import { loadDraft, saveDraft, clearDraft } from './draft'
import { useMigrainesStore } from '../../stores/migraines'

const props = defineProps<{ editId?: string }>()
const emit = defineEmits<{ close: []; saved: [] }>()
const migraines = useMigrainesStore()

const steps = [StepWhen, StepIntensity, StepMedocs, StepSymptoms, StepLocationTriggers, StepNotes, StepRecap]
const stepTitles = ['Quand ?', 'Intensité', 'Médicaments', 'Symptômes', 'Localisation & déclencheurs', 'Notes', 'Récapitulatif']
const stepIndex = ref(props.editId ? steps.length - 1 : 0)
const draft = ref(props.editId ? { ...migraines.getById(props.editId)! } : loadDraft())
const initialSnapshot = props.editId ? JSON.stringify(draft.value) : null
const showConfirmDialog = ref(false)

const progressPercent = computed(() => ((stepIndex.value + 1) / steps.length) * 100)

watch(draft, (d) => { if (!props.editId) saveDraft(d) }, { deep: true })

function isDirty(): boolean {
  if (!props.editId) return false
  return JSON.stringify(draft.value) !== initialSnapshot
}

function requestClose() {
  if (isDirty()) {
    showConfirmDialog.value = true
  } else {
    emit('close')
  }
}

function confirmDiscardClose() {
  showConfirmDialog.value = false
  emit('close')
}

function submit() {
  migraines.save(draft.value)
  if (!props.editId) clearDraft()
  emit('saved')
}
</script>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: flex-end;
  z-index: 30;
}
.modal-sheet {
  background: var(--color-surface);
  width: 100%;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  border-radius: 1rem 1rem 0 0;
  overflow: hidden;
}
.modal-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 1.25rem 1.5rem 0.5rem;
}
.modal-progress {
  margin: 0 0 0.15rem;
  font-size: 0.75rem;
  color: var(--color-muted);
  text-transform: uppercase;
  letter-spacing: 0.03em;
}
.modal-title {
  margin: 0;
  font-size: 1.15rem;
}
.modal-close-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  line-height: 1;
  cursor: pointer;
  color: var(--color-muted);
  padding: 0.25rem;
}
.progress-bar {
  height: 0.25rem;
  background: var(--color-bg);
  margin: 0 1.5rem;
  border-radius: 0.25rem;
  overflow: hidden;
}
.progress-bar-fill {
  height: 100%;
  background: var(--color-accent);
  transition: width 0.2s ease;
}
.modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 1.25rem 1.5rem;
}
.modal-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 1rem 1.5rem;
  border-top: 1px solid var(--color-bg);
}
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
</style>
```

- [ ] **Step 2: Check `MigraineFormModal`'s consumers still work**

Run: `grep -rn "MigraineFormModal" src/ --include=*.vue -l`
Expected: `src/App.vue`, `src/views/ListView.vue`, `src/views/StatsView.vue` — confirm none of them pass props/listen for events beyond `:edit-id`, `@close`, `@saved`, which are unchanged by this task.

- [ ] **Step 3: Run the full test suite and type check**

Run: `npx vitest run`
Expected: all tests pass (47 from Task 4 onward — no new tests added in this task since `MigraineFormModal.vue` has no existing test file, consistent with the rest of this codebase's component-testing convention).

Run: `npx vue-tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Visually verify**

Run: `npm run dev`. Open the form (FAB or header "Ajouter"):
- Confirm header shows "Étape 1 / 7" + "Quand ?" title, progress bar fills proportionally as you click Suivant.
- Confirm Précédent is greyed out on step 1, Suivant is greyed out on step 7 (Récapitulatif), Enregistrer is greyed out everywhere except step 7.
- Confirm the `×` button has the "Fermer (brouillon conservé)" tooltip in create mode and closes immediately.
- Open an existing migraine from the list (edit mode, starts on Récapitulatif), change a field (e.g. toggle a symptom pill), click `×`: confirm the `ConfirmDialog` appears; "Continuer l'édition" dismisses it and keeps the modal open; "Quitter sans enregistrer" closes the form.
- Open an existing migraine without changing anything, click `×`: confirm it closes immediately (no dialog).

- [ ] **Step 5: Commit**

```bash
git add src/components/MigraineForm/MigraineFormModal.vue
git commit -m "feat: rebuild MigraineFormModal header, 3-button action bar, and close confirmation"
```

---

## Final Verification

- [ ] Run `npx vitest run` — all tests pass (47 total: 41 pre-existing + 9 date.ts + 4 calendar.ts + 6 intensity/localisation, minus overlaps — confirm exact count from the last test run rather than this estimate).
- [ ] Run `npx vue-tsc --noEmit` — no type errors.
- [ ] Run `npm run dev` and manually walk through the full wizard (create + edit flows), confirming: DateField typing and calendar-click both work and stay in sync; TimeField typing and hour/minute-click both work; every step's pill/card/textarea styling renders correctly in light and dark mode; StepRecap only shows rows for fields that are actually set; the close-confirmation flow behaves as described in Task 15 Step 4.
