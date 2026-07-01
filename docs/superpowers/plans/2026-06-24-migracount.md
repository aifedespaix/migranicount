# Migracount Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Migracount, a 100%-local-storage, offline-capable PWA for logging and analyzing migraine episodes, per `docs/superpowers/specs/2026-06-24-migracount-design.md`.

**Architecture:** Vue 3 (Composition API) + Vite + TypeScript SPA. Pinia stores wrap a `localStorage`-backed repository layer. `vue-router` provides two routes (Stats, List) plus a modal step-form. Chart.js renders the three stats charts. `vite-plugin-pwa` provides the service worker/manifest.

**Tech Stack:** Vue 3, Vite, TypeScript, Pinia, vue-router, Chart.js + vue-chartjs, vite-plugin-pwa, Vitest + @vue/test-utils.

## Global Constraints

- All data lives in `localStorage` only - no network calls, no backend. (spec §1, §9)
- App must work fully offline after first load (`vite-plugin-pwa`, `generateSW`). (spec §9)
- Breakpoint for desktop/header-nav vs mobile/bottom-nav is exactly `1024px`. (spec §7)
- Theme follows `prefers-color-scheme` (light/dark), no manual toggle in v1. (spec §9)
- App name is "Migracount" everywhere (manifest, header, package.json). (spec §9)
- Required fields on a migraine entry: `date`, `heureDebut`. Everything else optional. (spec §4)
- No cloud sync, no notifications, no PDF export, no IndexedDB - out of scope for v1. (spec §10)

---

## File Structure

```
migracount/
  package.json, vite.config.ts, tsconfig.json, index.html
  src/
    main.ts, App.vue
    router/index.ts
    types/migraine.ts
    storage/storage.ts
    storage/migraineRepository.ts
    utils/uuid.ts
    utils/date.ts
    utils/stats.ts
    stores/migraines.ts
    stores/medocsFavoris.ts
    stores/declencheurs.ts
    components/
      FabButton.vue
      BottomNav.vue
      HeaderNav.vue
      MigraineForm/
        MigraineFormModal.vue
        StepWhen.vue
        StepIntensity.vue
        StepMedocs.vue
        StepSymptoms.vue
        StepLocationTriggers.vue
        StepNotes.vue
        StepRecap.vue
      charts/
        FrequencyChart.vue
        IntensityChart.vue
        EfficacyChart.vue
      MigraineListItem.vue
      MigraineDetailModal.vue
    views/
      StatsView.vue
      ListView.vue
      SettingsView.vue
    assets/logo.svg
  scripts/generate-icons.mjs
  public/icons/ (generated output)
```

Each file has one job: `storage.ts` is the raw localStorage wrapper, `migraineRepository.ts` is the typed CRUD API, stores are thin reactive wrappers around the repository, `utils/stats.ts` is pure functions consumed by chart components, and each form step is an isolated component receiving/emitting a slice of the draft object.

---

### Task 1: Project scaffold

**Files:**

- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `index.html`, `src/main.ts`, `src/App.vue`
- Create: `vitest.config.ts`

**Interfaces:**

- Produces: a running `npm run dev` Vite dev server and a working `npm run test` (Vitest) command, both later tasks depend on.

- [ ] **Step 1: Scaffold with Vite's Vue-TS template**

```bash
cd "C:\Users\clape\Documents\dev\migranicount"
npm create vite@latest . -- --template vue-ts
```

When prompted about a non-empty directory, choose to proceed (the `docs/` folder is unrelated to the scaffold).

- [ ] **Step 2: Install runtime and dev dependencies**

```bash
npm install pinia vue-router chart.js vue-chartjs
npm install -D vitest @vue/test-utils jsdom vite-plugin-pwa
```

- [ ] **Step 3: Set app name in `package.json`**

Edit the `"name"` field to `"migracount"`.

- [ ] **Step 4: Add Vitest config**

Create `vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";
import vue from "@vitejs/plugin-vue";

export default defineConfig({
  plugins: [vue()],
  test: {
    environment: "jsdom",
    globals: true,
  },
});
```

- [ ] **Step 5: Add test script to `package.json`**

In the `"scripts"` section add:

```json
"test": "vitest run"
```

- [ ] **Step 6: Verify the dev server and test runner both boot**

```bash
npm run test
npm run build
```

Expected: `npm run test` reports "No test files found" (pass, not error) and `npm run build` completes without TypeScript errors.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "chore: scaffold Vite + Vue 3 + TS + Vitest project"
```

---

### Task 2: Core types and uuid/date utilities

**Files:**

- Create: `src/types/migraine.ts`
- Create: `src/utils/uuid.ts`
- Create: `src/utils/date.ts`
- Test: `src/utils/date.test.ts`

**Interfaces:**

- Produces: `Migraine`, `MedocPris`, `MedocFavori` types (spec §3); `newId(): string`; `todayISO(): string`, `nowHHmm(): string`, `formatRelative(dateISO: string, fromDate?: Date): string`, `formatDuration(minutes: number): string`. Later tasks import these exact names.

- [ ] **Step 1: Define types**

`src/types/migraine.ts`:

```ts
export interface MedocPris {
  id: string;
  nom: string;
  description?: string;
  heure: string;
}

export interface Migraine {
  id: string;
  date: string;
  heureDebut: string;
  heureFin: string | null;
  medocs: MedocPris[];
  intensite: number;
  avortee: boolean;
  nausee: boolean;
  vomissement: boolean;
  aura: boolean;
  localisation: "gauche" | "droite" | "bilaterale" | "nuque" | null;
  declencheurs: string[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MedocFavori {
  nom: string;
  description?: string;
  usageCount: number;
}
```

- [ ] **Step 2: uuid util**

`src/utils/uuid.ts`:

```ts
export function newId(): string {
  return crypto.randomUUID();
}
```

- [ ] **Step 3: Write failing tests for date utils**

`src/utils/date.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { todayISO, nowHHmm, formatRelative, formatDuration } from "./date";

describe("todayISO", () => {
  it("returns YYYY-MM-DD format", () => {
    expect(todayISO()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("nowHHmm", () => {
  it("returns HH:mm format", () => {
    expect(nowHHmm()).toMatch(/^\d{2}:\d{2}$/);
  });
});

describe("formatRelative", () => {
  it('formats today as "aujourd\'hui"', () => {
    const today = new Date(2026, 5, 24);
    expect(formatRelative("2026-06-24", today)).toBe("aujourd'hui");
  });

  it('formats yesterday as "hier"', () => {
    const today = new Date(2026, 5, 24);
    expect(formatRelative("2026-06-23", today)).toBe("hier");
  });

  it('formats N days ago as "il y a N jours"', () => {
    const today = new Date(2026, 5, 24);
    expect(formatRelative("2026-06-20", today)).toBe("il y a 4 jours");
  });
});

describe("formatDuration", () => {
  it("formats minutes under an hour", () => {
    expect(formatDuration(45)).toBe("45min");
  });

  it("formats whole hours", () => {
    expect(formatDuration(120)).toBe("2h");
  });

  it("formats hours and minutes", () => {
    expect(formatDuration(135)).toBe("2h15");
  });
});
```

- [ ] **Step 4: Run tests, verify they fail**

```bash
npm run test -- src/utils/date.test.ts
```

Expected: FAIL - `date.ts` does not exist yet.

- [ ] **Step 5: Implement date utils**

`src/utils/date.ts`:

```ts
export function todayISO(): string {
  const d = new Date();
  return toISO(d);
}

export function nowHHmm(): string {
  const d = new Date();
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function formatRelative(
  dateISO: string,
  from: Date = new Date(),
): string {
  const target = new Date(dateISO + "T00:00:00");
  const reference = new Date(
    from.getFullYear(),
    from.getMonth(),
    from.getDate(),
  );
  const diffDays = Math.round(
    (reference.getTime() - target.getTime()) / 86400000,
  );
  if (diffDays === 0) return "aujourd'hui";
  if (diffDays === 1) return "hier";
  if (diffDays > 1) return `il y a ${diffDays} jours`;
  return `dans ${-diffDays} jours`;
}

export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}min`;
  if (m === 0) return `${h}h`;
  return `${h}h${pad(m)}`;
}

function toISO(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function pad(n: number): string {
  return n.toString().padStart(2, "0");
}
```

- [ ] **Step 6: Run tests, verify they pass**

```bash
npm run test -- src/utils/date.test.ts
```

Expected: PASS, all assertions green.

- [ ] **Step 7: Commit**

```bash
git add src/types/migraine.ts src/utils/uuid.ts src/utils/date.ts src/utils/date.test.ts
git commit -m "feat: add migraine types, uuid and date utils"
```

---

### Task 3: localStorage wrapper and migraine repository

**Files:**

- Create: `src/storage/storage.ts`
- Create: `src/storage/migraineRepository.ts`
- Test: `src/storage/migraineRepository.test.ts`

**Interfaces:**

- Consumes: `Migraine`, `MedocFavori` from `src/types/migraine.ts`; `newId` from `src/utils/uuid.ts`.
- Produces: `getJSON<T>(key: string, fallback: T): T`, `setJSON<T>(key: string, value: T): void` from `storage.ts`. From `migraineRepository.ts`: `listMigraines(): Migraine[]`, `getMigraine(id: string): Migraine | undefined`, `saveMigraine(input: Omit<Migraine, 'id'|'createdAt'|'updatedAt'> & { id?: string }): Migraine`, `deleteMigraine(id: string): void`, `listMedocsFavoris(): MedocFavori[]`, `registerMedocUsage(nom: string, description?: string): void`, `listDeclencheursFavoris(): string[]`, `registerDeclencheur(tag: string): void`, `exportAll(): string`, `importAll(json: string): void`. Stores in Task 5 call these exact functions.

- [ ] **Step 1: Implement the raw storage wrapper**

`src/storage/storage.ts`:

```ts
const PREFIX = "migracount:";

export function getJSON<T>(key: string, fallback: T): T {
  const raw = localStorage.getItem(PREFIX + key);
  if (raw === null) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function setJSON<T>(key: string, value: T): void {
  localStorage.setItem(PREFIX + key, JSON.stringify(value));
}
```

- [ ] **Step 2: Write failing tests for the repository**

`src/storage/migraineRepository.test.ts`:

```ts
import { describe, it, expect, beforeEach } from "vitest";
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

beforeEach(() => localStorage.clear());

describe("saveMigraine", () => {
  it("creates a new migraine with generated id and timestamps", () => {
    const m = saveMigraine({
      date: "2026-06-24",
      heureDebut: "08:00",
      heureFin: null,
      medocs: [],
      intensite: 5,
      avortee: false,
      nausee: false,
      vomissement: false,
      aura: false,
      localisation: null,
      declencheurs: [],
    });
    expect(m.id).toBeTruthy();
    expect(m.createdAt).toBeTruthy();
    expect(listMigraines()).toHaveLength(1);
  });

  it("updates an existing migraine by id", () => {
    const m = saveMigraine({
      date: "2026-06-24",
      heureDebut: "08:00",
      heureFin: null,
      medocs: [],
      intensite: 5,
      avortee: false,
      nausee: false,
      vomissement: false,
      aura: false,
      localisation: null,
      declencheurs: [],
    });
    saveMigraine({ ...m, intensite: 9 });
    expect(listMigraines()).toHaveLength(1);
    expect(getMigraine(m.id)?.intensite).toBe(9);
  });
});

describe("deleteMigraine", () => {
  it("removes the entry", () => {
    const m = saveMigraine({
      date: "2026-06-24",
      heureDebut: "08:00",
      heureFin: null,
      medocs: [],
      intensite: 5,
      avortee: false,
      nausee: false,
      vomissement: false,
      aura: false,
      localisation: null,
      declencheurs: [],
    });
    deleteMigraine(m.id);
    expect(listMigraines()).toHaveLength(0);
  });
});

describe("registerMedocUsage", () => {
  it("adds a new favori with usageCount 1", () => {
    registerMedocUsage("Doliprane", "antidouleur");
    expect(listMedocsFavoris()).toEqual([
      { nom: "Doliprane", description: "antidouleur", usageCount: 1 },
    ]);
  });

  it("increments usageCount on repeat use", () => {
    registerMedocUsage("Doliprane");
    registerMedocUsage("Doliprane");
    expect(listMedocsFavoris()[0].usageCount).toBe(2);
  });
});

describe("registerDeclencheur", () => {
  it("adds a tag once, no duplicates", () => {
    registerDeclencheur("stress");
    registerDeclencheur("stress");
    expect(listDeclencheursFavoris()).toEqual(["stress"]);
  });
});

describe("exportAll / importAll", () => {
  it("round-trips data", () => {
    saveMigraine({
      date: "2026-06-24",
      heureDebut: "08:00",
      heureFin: null,
      medocs: [],
      intensite: 5,
      avortee: false,
      nausee: false,
      vomissement: false,
      aura: false,
      localisation: null,
      declencheurs: [],
    });
    registerMedocUsage("Doliprane");
    registerDeclencheur("stress");
    const json = exportAll();
    localStorage.clear();
    importAll(json);
    expect(listMigraines()).toHaveLength(1);
    expect(listMedocsFavoris()).toHaveLength(1);
    expect(listDeclencheursFavoris()).toEqual(["stress"]);
  });
});
```

- [ ] **Step 3: Run tests, verify they fail**

```bash
npm run test -- src/storage/migraineRepository.test.ts
```

Expected: FAIL - `migraineRepository.ts` does not exist.

- [ ] **Step 4: Implement the repository**

`src/storage/migraineRepository.ts`:

```ts
import { getJSON, setJSON } from "./storage";
import { newId } from "../utils/uuid";
import type { Migraine, MedocFavori } from "../types/migraine";

const MIGRAINES_KEY = "migraines";
const MEDOCS_KEY = "medocsFavoris";
const DECLENCHEURS_KEY = "declencheursFavoris";
const SCHEMA_VERSION_KEY = "schemaVersion";
const SCHEMA_VERSION = 1;

export function listMigraines(): Migraine[] {
  return getJSON<Migraine[]>(MIGRAINES_KEY, []);
}

export function getMigraine(id: string): Migraine | undefined {
  return listMigraines().find((m) => m.id === id);
}

type MigraineInput = Omit<Migraine, "id" | "createdAt" | "updatedAt"> & {
  id?: string;
};

export function saveMigraine(input: MigraineInput): Migraine {
  const all = listMigraines();
  const now = new Date().toISOString();
  const existingIndex = input.id ? all.findIndex((m) => m.id === input.id) : -1;

  if (existingIndex >= 0) {
    const updated: Migraine = {
      ...all[existingIndex],
      ...input,
      id: input.id!,
      updatedAt: now,
    };
    all[existingIndex] = updated;
    setJSON(MIGRAINES_KEY, all);
    return updated;
  }

  const created: Migraine = {
    ...input,
    id: newId(),
    createdAt: now,
    updatedAt: now,
  };
  setJSON(MIGRAINES_KEY, [...all, created]);
  return created;
}

export function deleteMigraine(id: string): void {
  setJSON(
    MIGRAINES_KEY,
    listMigraines().filter((m) => m.id !== id),
  );
}

export function listMedocsFavoris(): MedocFavori[] {
  return getJSON<MedocFavori[]>(MEDOCS_KEY, []);
}

export function registerMedocUsage(nom: string, description?: string): void {
  const favoris = listMedocsFavoris();
  const existing = favoris.find((f) => f.nom === nom);
  if (existing) {
    existing.usageCount += 1;
    if (description) existing.description = description;
  } else {
    favoris.push({ nom, description, usageCount: 1 });
  }
  setJSON(MEDOCS_KEY, favoris);
}

export function listDeclencheursFavoris(): string[] {
  return getJSON<string[]>(DECLENCHEURS_KEY, []);
}

export function registerDeclencheur(tag: string): void {
  const tags = listDeclencheursFavoris();
  if (!tags.includes(tag)) setJSON(DECLENCHEURS_KEY, [...tags, tag]);
}

export function exportAll(): string {
  return JSON.stringify({
    schemaVersion: SCHEMA_VERSION,
    migraines: listMigraines(),
    medocsFavoris: listMedocsFavoris(),
    declencheursFavoris: listDeclencheursFavoris(),
  });
}

export function importAll(json: string): void {
  const data = JSON.parse(json);
  setJSON(MIGRAINES_KEY, data.migraines ?? []);
  setJSON(MEDOCS_KEY, data.medocsFavoris ?? []);
  setJSON(DECLENCHEURS_KEY, data.declencheursFavoris ?? []);
  setJSON(SCHEMA_VERSION_KEY, data.schemaVersion ?? SCHEMA_VERSION);
}
```

- [ ] **Step 5: Run tests, verify they pass**

```bash
npm run test -- src/storage/migraineRepository.test.ts
```

Expected: PASS, all assertions green.

- [ ] **Step 6: Commit**

```bash
git add src/storage
git commit -m "feat: add localStorage wrapper and migraine repository"
```

---

### Task 4: Stats utility functions

**Files:**

- Create: `src/utils/stats.ts`
- Test: `src/utils/stats.test.ts`

**Interfaces:**

- Consumes: `Migraine` type.
- Produces: `monthlyFrequency(migraines: Migraine[]): { month: string; count: number }[]` (last 12 months, oldest first), `averageIntensityByMonth(migraines: Migraine[]): { month: string; avg: number }[]`, `medocEfficacy(migraines: Migraine[]): { nom: string; pctAvortee: number; total: number }[]`, `averageDurationMinutes(migraines: Migraine[]): number`. Chart components in Task 9 call these exact names.

- [ ] **Step 1: Write failing tests**

`src/utils/stats.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import {
  monthlyFrequency,
  averageIntensityByMonth,
  medocEfficacy,
  averageDurationMinutes,
} from "./stats";
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

describe("monthlyFrequency", () => {
  it("counts migraines per month, last 12 months", () => {
    const data = [
      makeMigraine({ date: "2026-06-01" }),
      makeMigraine({ date: "2026-06-15" }),
      makeMigraine({ date: "2026-05-01" }),
    ];
    const result = monthlyFrequency(data, new Date(2026, 5, 24));
    const june = result.find((r) => r.month === "2026-06");
    const may = result.find((r) => r.month === "2026-05");
    expect(june?.count).toBe(2);
    expect(may?.count).toBe(1);
    expect(result).toHaveLength(12);
  });
});

describe("averageIntensityByMonth", () => {
  it("averages intensite per month", () => {
    const data = [
      makeMigraine({ date: "2026-06-01", intensite: 4 }),
      makeMigraine({ date: "2026-06-15", intensite: 8 }),
    ];
    const result = averageIntensityByMonth(data, new Date(2026, 5, 24));
    expect(result.find((r) => r.month === "2026-06")?.avg).toBe(6);
  });
});

describe("medocEfficacy", () => {
  it("computes % aborted per medoc", () => {
    const data = [
      makeMigraine({
        medocs: [{ id: "1", nom: "Triptan", heure: "08:00" }],
        avortee: true,
      }),
      makeMigraine({
        medocs: [{ id: "2", nom: "Triptan", heure: "08:00" }],
        avortee: false,
      }),
      makeMigraine({
        medocs: [{ id: "3", nom: "Doliprane", heure: "08:00" }],
        avortee: true,
      }),
    ];
    const result = medocEfficacy(data);
    const triptan = result.find((r) => r.nom === "Triptan");
    expect(triptan?.total).toBe(2);
    expect(triptan?.pctAvortee).toBe(50);
  });
});

describe("averageDurationMinutes", () => {
  it("averages duration for entries with an end time", () => {
    const data = [
      makeMigraine({ heureDebut: "08:00", heureFin: "10:00" }),
      makeMigraine({ heureDebut: "08:00", heureFin: "09:00" }),
      makeMigraine({ heureDebut: "08:00", heureFin: null }),
    ];
    expect(averageDurationMinutes(data)).toBe(90);
  });
});
```

- [ ] **Step 2: Run tests, verify they fail**

```bash
npm run test -- src/utils/stats.test.ts
```

Expected: FAIL - `stats.ts` does not exist.

- [ ] **Step 3: Implement stats utils**

`src/utils/stats.ts`:

```ts
import type { Migraine } from "../types/migraine";

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, "0")}`;
}

function last12Months(from: Date): string[] {
  const months: string[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(from.getFullYear(), from.getMonth() - i, 1);
    months.push(monthKey(d));
  }
  return months;
}

export function monthlyFrequency(
  migraines: Migraine[],
  from: Date = new Date(),
): { month: string; count: number }[] {
  const months = last12Months(from);
  const counts = new Map(months.map((m) => [m, 0]));
  for (const m of migraines) {
    const key = m.date.slice(0, 7);
    if (counts.has(key)) counts.set(key, counts.get(key)! + 1);
  }
  return months.map((month) => ({ month, count: counts.get(month) ?? 0 }));
}

export function averageIntensityByMonth(
  migraines: Migraine[],
  from: Date = new Date(),
): { month: string; avg: number }[] {
  const months = last12Months(from);
  const sums = new Map(months.map((m) => [m, { total: 0, count: 0 }]));
  for (const m of migraines) {
    const key = m.date.slice(0, 7);
    const bucket = sums.get(key);
    if (bucket) {
      bucket.total += m.intensite;
      bucket.count += 1;
    }
  }
  return months.map((month) => {
    const bucket = sums.get(month)!;
    return {
      month,
      avg:
        bucket.count === 0
          ? 0
          : Math.round((bucket.total / bucket.count) * 10) / 10,
    };
  });
}

export function medocEfficacy(
  migraines: Migraine[],
): { nom: string; pctAvortee: number; total: number }[] {
  const byMedoc = new Map<string, { total: number; avortee: number }>();
  for (const m of migraines) {
    const noms = new Set(m.medocs.map((p) => p.nom));
    for (const nom of noms) {
      const bucket = byMedoc.get(nom) ?? { total: 0, avortee: 0 };
      bucket.total += 1;
      if (m.avortee) bucket.avortee += 1;
      byMedoc.set(nom, bucket);
    }
  }
  return Array.from(byMedoc.entries()).map(([nom, { total, avortee }]) => ({
    nom,
    total,
    pctAvortee: Math.round((avortee / total) * 100),
  }));
}

export function averageDurationMinutes(migraines: Migraine[]): number {
  const durations = migraines
    .filter((m) => m.heureFin !== null)
    .map((m) => toMinutes(m.heureFin!) - toMinutes(m.heureDebut));
  if (durations.length === 0) return 0;
  return Math.round(durations.reduce((a, b) => a + b, 0) / durations.length);
}

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}
```

- [ ] **Step 4: Run tests, verify they pass**

```bash
npm run test -- src/utils/stats.test.ts
```

Expected: PASS, all assertions green.

- [ ] **Step 5: Commit**

```bash
git add src/utils/stats.ts src/utils/stats.test.ts
git commit -m "feat: add stats calculation utilities"
```

---

### Task 5: Pinia stores

**Files:**

- Create: `src/stores/migraines.ts`
- Create: `src/stores/medocsFavoris.ts`
- Create: `src/stores/declencheurs.ts`
- Test: `src/stores/migraines.test.ts`
- Modify: `src/main.ts` (register Pinia)

**Interfaces:**

- Consumes: all functions from `src/storage/migraineRepository.ts`.
- Produces: `useMigrainesStore()` with reactive `migraines: Migraine[]` ref and actions `save(input)`, `remove(id)`, `getById(id)`; `useMedocsFavorisStore()` with `favoris: MedocFavori[]` and action `registerUsage(nom, description?)`; `useDeclencheursStore()` with `tags: string[]` and action `register(tag)`. Form components (Task 7) and views (Tasks 8-9) call these.

- [ ] **Step 1: Write failing test for migraines store**

`src/stores/migraines.test.ts`:

```ts
import { describe, it, expect, beforeEach } from "vitest";
import { setActivePinia, createPinia } from "pinia";
import { useMigrainesStore } from "./migraines";

beforeEach(() => {
  localStorage.clear();
  setActivePinia(createPinia());
});

describe("useMigrainesStore", () => {
  it("loads existing migraines on creation", () => {
    const store = useMigrainesStore();
    expect(store.migraines).toEqual([]);
  });

  it("save adds a migraine and updates reactive state", () => {
    const store = useMigrainesStore();
    store.save({
      date: "2026-06-24",
      heureDebut: "08:00",
      heureFin: null,
      medocs: [],
      intensite: 5,
      avortee: false,
      nausee: false,
      vomissement: false,
      aura: false,
      localisation: null,
      declencheurs: [],
    });
    expect(store.migraines).toHaveLength(1);
  });

  it("remove deletes a migraine from reactive state", () => {
    const store = useMigrainesStore();
    const m = store.save({
      date: "2026-06-24",
      heureDebut: "08:00",
      heureFin: null,
      medocs: [],
      intensite: 5,
      avortee: false,
      nausee: false,
      vomissement: false,
      aura: false,
      localisation: null,
      declencheurs: [],
    });
    store.remove(m.id);
    expect(store.migraines).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run test, verify it fails**

```bash
npm run test -- src/stores/migraines.test.ts
```

Expected: FAIL - `migraines.ts` store does not exist.

- [ ] **Step 3: Implement the migraines store**

`src/stores/migraines.ts`:

```ts
import { defineStore } from "pinia";
import { ref } from "vue";
import {
  listMigraines,
  saveMigraine,
  deleteMigraine,
  getMigraine,
} from "../storage/migraineRepository";
import type { Migraine } from "../types/migraine";

type MigraineInput = Omit<Migraine, "id" | "createdAt" | "updatedAt"> & {
  id?: string;
};

export const useMigrainesStore = defineStore("migraines", () => {
  const migraines = ref<Migraine[]>(listMigraines());

  function save(input: MigraineInput): Migraine {
    const result = saveMigraine(input);
    migraines.value = listMigraines();
    return result;
  }

  function remove(id: string): void {
    deleteMigraine(id);
    migraines.value = listMigraines();
  }

  function getById(id: string): Migraine | undefined {
    return getMigraine(id);
  }

  return { migraines, save, remove, getById };
});
```

- [ ] **Step 4: Run test, verify it passes**

```bash
npm run test -- src/stores/migraines.test.ts
```

Expected: PASS.

- [ ] **Step 5: Implement medocsFavoris and declencheurs stores (same pattern, no separate TDD cycle needed - trivial wrappers)**

`src/stores/medocsFavoris.ts`:

```ts
import { defineStore } from "pinia";
import { ref } from "vue";
import {
  listMedocsFavoris,
  registerMedocUsage,
} from "../storage/migraineRepository";

export const useMedocsFavorisStore = defineStore("medocsFavoris", () => {
  const favoris = ref(listMedocsFavoris());

  function registerUsage(nom: string, description?: string): void {
    registerMedocUsage(nom, description);
    favoris.value = listMedocsFavoris();
  }

  return { favoris, registerUsage };
});
```

`src/stores/declencheurs.ts`:

```ts
import { defineStore } from "pinia";
import { ref } from "vue";
import {
  listDeclencheursFavoris,
  registerDeclencheur,
} from "../storage/migraineRepository";

const DEFAULTS = [
  "stress",
  "manque de sommeil",
  "règles",
  "alcool",
  "écrans",
  "météo",
  "alimentation",
  "déshydratation",
  "effort physique",
  "odeurs fortes",
];

export const useDeclencheursStore = defineStore("declencheurs", () => {
  const customTags = ref(listDeclencheursFavoris());

  function register(tag: string): void {
    registerDeclencheur(tag);
    customTags.value = listDeclencheursFavoris();
  }

  const tags = () => Array.from(new Set([...DEFAULTS, ...customTags.value]));

  return { customTags, tags, register };
});
```

- [ ] **Step 6: Register Pinia in `main.ts`**

`src/main.ts`:

```ts
import { createApp } from "vue";
import { createPinia } from "pinia";
import App from "./App.vue";

createApp(App).use(createPinia()).mount("#app");
```

- [ ] **Step 7: Run full test suite, verify nothing broke**

```bash
npm run test
```

Expected: all PASS.

- [ ] **Step 8: Commit**

```bash
git add src/stores src/main.ts
git commit -m "feat: add Pinia stores for migraines, medocs and declencheurs"
```

---

### Task 6: Router, App shell, theme CSS variables

**Files:**

- Create: `src/router/index.ts`
- Create: `src/views/StatsView.vue`, `src/views/ListView.vue`, `src/views/SettingsView.vue` (skeletons, filled in later tasks)
- Modify: `src/App.vue`
- Modify: `src/main.ts` (register router)
- Create: `src/styles/theme.css`

**Interfaces:**

- Produces: routes named `stats` (`/`), `liste` (`/liste`), `settings` (`/settings`). Task 8/9 components are mounted inside `StatsView.vue`/`ListView.vue`. CSS variables `--color-bg`, `--color-surface`, `--color-text`, `--color-accent`, `--color-accent-contrast` consumed by every component going forward.

- [ ] **Step 1: Define theme CSS variables**

`src/styles/theme.css`:

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

@media (prefers-color-scheme: dark) {
  :root {
    --color-bg: #1c1726;
    --color-surface: #271f33;
    --color-text: #ece8f0;
    --color-accent: #a78bfa;
    --color-accent-contrast: #1c1726;
    --color-muted: #a39db0;
    --color-danger: #f08a8a;
  }
}

body {
  margin: 0;
  background: var(--color-bg);
  color: var(--color-text);
  font-family:
    system-ui,
    -apple-system,
    sans-serif;
}
```

- [ ] **Step 2: Create route skeletons**

`src/views/StatsView.vue`, `src/views/ListView.vue`, `src/views/SettingsView.vue` each:

```vue
<template>
  <div class="view-placeholder">{{ name }}</div>
</template>

<script setup lang="ts">
defineProps<{ name?: string }>();
</script>
```

(Replace `{{ name }}` literal text with `Stats`, `Liste`, `Réglages` respectively in each file - these are placeholders Tasks 8/9/11 will overwrite.)

- [ ] **Step 3: Define router**

`src/router/index.ts`:

```ts
import { createRouter, createWebHistory } from "vue-router";
import StatsView from "../views/StatsView.vue";
import ListView from "../views/ListView.vue";
import SettingsView from "../views/SettingsView.vue";

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/", name: "stats", component: StatsView },
    { path: "/liste", name: "liste", component: ListView },
    { path: "/settings", name: "settings", component: SettingsView },
  ],
});
```

- [ ] **Step 4: Register router in `main.ts`**

```ts
import { createApp } from "vue";
import { createPinia } from "pinia";
import { router } from "./router";
import App from "./App.vue";
import "./styles/theme.css";

createApp(App).use(createPinia()).use(router).mount("#app");
```

- [ ] **Step 5: Update `App.vue` to render the router view**

`src/App.vue`:

```vue
<template>
  <RouterView />
</template>

<script setup lang="ts"></script>
```

- [ ] **Step 6: Verify the app boots**

```bash
npm run dev
```

Open the dev server URL, confirm the "Stats" placeholder renders at `/` with no console errors, then stop the server.

- [ ] **Step 7: Commit**

```bash
git add src/router src/views src/App.vue src/main.ts src/styles
git commit -m "feat: add router, view skeletons and theme CSS variables"
```

---

### Task 7: Navigation shell (BottomNav, HeaderNav, FabButton)

**Files:**

- Create: `src/components/BottomNav.vue`
- Create: `src/components/HeaderNav.vue`
- Create: `src/components/FabButton.vue`
- Modify: `src/App.vue`

**Interfaces:**

- Consumes: `router` link names `stats`, `liste`, `settings` (Task 6).
- Produces: `FabButton` emits `click` event, consumed by `App.vue` to open the form modal built in Task 7b (Task 8 below).

- [ ] **Step 1: Build `BottomNav.vue`** (visible only below 1024px)

```vue
<template>
  <nav class="bottom-nav">
    <RouterLink :to="{ name: 'stats' }" class="nav-item">Stats</RouterLink>
    <RouterLink :to="{ name: 'liste' }" class="nav-item">Liste</RouterLink>
  </nav>
</template>

<script setup lang="ts"></script>

<style scoped>
.bottom-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  background: var(--color-surface);
  border-top: 1px solid var(--color-muted);
  z-index: 10;
}
.nav-item {
  flex: 1;
  text-align: center;
  padding: 0.75rem 0;
  color: var(--color-muted);
  text-decoration: none;
}
.nav-item.router-link-active {
  color: var(--color-accent);
  font-weight: 600;
}
@media (min-width: 1024px) {
  .bottom-nav {
    display: none;
  }
}
</style>
```

- [ ] **Step 2: Build `HeaderNav.vue`** (visible only at/above 1024px)

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
  display: none;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 2rem;
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-muted);
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
@media (min-width: 1024px) {
  .header-nav {
    display: flex;
  }
}
</style>
```

- [ ] **Step 3: Build `FabButton.vue`** (visible only below 1024px, since desktop uses the header's "+ Ajouter")

```vue
<template>
  <button class="fab" @click="$emit('click')" aria-label="Ajouter une migraine">
    +
  </button>
</template>

<script setup lang="ts">
defineEmits<{ click: [] }>();
</script>

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
@media (min-width: 1024px) {
  .fab {
    display: none;
  }
}
</style>
```

- [ ] **Step 4: Wire shell into `App.vue`**

```vue
<template>
  <HeaderNav @add="formOpen = true" />
  <main class="app-main">
    <RouterView />
  </main>
  <BottomNav />
  <FabButton @click="formOpen = true" />
</template>

<script setup lang="ts">
import { ref } from "vue";
import HeaderNav from "./components/HeaderNav.vue";
import BottomNav from "./components/BottomNav.vue";
import FabButton from "./components/FabButton.vue";

const formOpen = ref(false);
</script>

<style scoped>
.app-main {
  padding-bottom: 5rem;
}
</style>
```

(`formOpen` is wired to the form modal in Task 8 - left as a local ref here so the shell is independently testable by clicking the FAB and observing no console errors.)

- [ ] **Step 5: Manual verification**

```bash
npm run dev
```

Resize the browser window across 1024px and confirm: below 1024px the bottom nav + FAB show and the header's nav links are hidden; at/above 1024px the header nav with "+ Ajouter" shows and the bottom nav + FAB are hidden.

- [ ] **Step 6: Commit**

```bash
git add src/components/BottomNav.vue src/components/HeaderNav.vue src/components/FabButton.vue src/App.vue
git commit -m "feat: add responsive navigation shell (bottom nav, header nav, FAB)"
```

---

### Task 8: Migraine form modal - steps 1-3 (When, Intensity, Medocs)

**Files:**

- Create: `src/components/MigraineForm/MigraineFormModal.vue`
- Create: `src/components/MigraineForm/StepWhen.vue`
- Create: `src/components/MigraineForm/StepIntensity.vue`
- Create: `src/components/MigraineForm/StepMedocs.vue`
- Create: `src/components/MigraineForm/draft.ts`
- Test: `src/components/MigraineForm/draft.test.ts`
- Modify: `src/App.vue`

**Interfaces:**

- Consumes: `useMigrainesStore`, `useMedocsFavorisStore` (Task 5); `MedocPris` type; `todayISO`, `nowHHmm` (Task 2); `newId` (Task 2).
- Produces: `draft.ts` exports `emptyDraft(): MigraineDraft` and type `MigraineDraft = Omit<Migraine, 'id'|'createdAt'|'updatedAt'> & { id?: string }`, plus `loadDraft(): MigraineDraft`, `saveDraft(d: MigraineDraft): void`, `clearDraft(): void` backed by `localStorage` key `migracount:draft`. `MigraineFormModal` emits `close` and `saved`, consumed by `App.vue`. Steps 4-7 (Task 9) are added as siblings inside the same modal.

- [ ] **Step 1: Write failing tests for the draft persistence helper**

`src/components/MigraineForm/draft.test.ts`:

```ts
import { describe, it, expect, beforeEach } from "vitest";
import { emptyDraft, loadDraft, saveDraft, clearDraft } from "./draft";

beforeEach(() => localStorage.clear());

describe("draft persistence", () => {
  it("loadDraft returns emptyDraft shape when nothing saved", () => {
    const loaded = loadDraft();
    expect(loaded.intensite).toBe(emptyDraft().intensite);
    expect(loaded.medocs).toEqual([]);
  });

  it("saveDraft then loadDraft round-trips", () => {
    const d = emptyDraft();
    d.intensite = 7;
    saveDraft(d);
    expect(loadDraft().intensite).toBe(7);
  });

  it("clearDraft resets to emptyDraft", () => {
    const d = emptyDraft();
    d.intensite = 7;
    saveDraft(d);
    clearDraft();
    expect(loadDraft().intensite).toBe(emptyDraft().intensite);
  });
});
```

- [ ] **Step 2: Run test, verify it fails**

```bash
npm run test -- src/components/MigraineForm/draft.test.ts
```

Expected: FAIL - `draft.ts` does not exist.

- [ ] **Step 3: Implement `draft.ts`**

```ts
import { getJSON, setJSON } from "../../storage/storage";
import { todayISO, nowHHmm } from "../../utils/date";
import type { Migraine } from "../../types/migraine";

export type MigraineDraft = Omit<Migraine, "id" | "createdAt" | "updatedAt"> & {
  id?: string;
};

const DRAFT_KEY = "draft";

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
  setJSON(DRAFT_KEY, emptyDraft());
}
```

- [ ] **Step 4: Run test, verify it passes**

```bash
npm run test -- src/components/MigraineForm/draft.test.ts
```

Expected: PASS.

- [ ] **Step 5: Build `StepWhen.vue`**

```vue
<template>
  <div class="step">
    <h2>Quand ?</h2>
    <label>Date <input type="date" v-model="model.date" /></label>
    <label
      >Heure de début <input type="time" v-model="model.heureDebut"
    /></label>
    <label>
      <input
        type="checkbox"
        :checked="model.heureFin === null"
        @change="toggleEnCours"
      />
      Crise en cours
    </label>
    <label v-if="model.heureFin !== null">
      Heure de fin <input type="time" v-model="model.heureFin" />
    </label>
  </div>
</template>

<script setup lang="ts">
import type { MigraineDraft } from "./draft";

const model = defineModel<MigraineDraft>({ required: true });

function toggleEnCours(e: Event) {
  const checked = (e.target as HTMLInputElement).checked;
  model.value.heureFin = checked ? null : model.value.heureDebut;
}
</script>
```

- [ ] **Step 6: Build `StepIntensity.vue`**

```vue
<template>
  <div class="step">
    <h2>Intensité</h2>
    <input
      type="range"
      min="1"
      max="10"
      v-model.number="model.intensite"
      :style="{ accentColor: trackColor }"
    />
    <p class="intensity-value">{{ model.intensite }} / 10</p>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { MigraineDraft } from "./draft";

const model = defineModel<MigraineDraft>({ required: true });

const trackColor = computed(() => {
  const hue = 50 - (model.value.intensite / 10) * 50;
  return `hsl(${hue}, 80%, 50%)`;
});
</script>
```

- [ ] **Step 7: Build `StepMedocs.vue`**

```vue
<template>
  <div class="step">
    <h2>Médicaments</h2>
    <div class="favoris">
      <button
        v-for="f in favoris.favoris"
        :key="f.nom"
        type="button"
        @click="addFromFavori(f)"
      >
        {{ f.nom }}
      </button>
    </div>
    <div v-for="(p, i) in model.medocs" :key="p.id" class="medoc-row">
      <span>{{ p.nom }} - {{ p.heure }}</span>
      <button type="button" @click="remove(i)">Supprimer</button>
    </div>
    <form @submit.prevent="addNew">
      <input v-model="nomInput" placeholder="Nom du médicament" required />
      <input v-model="descriptionInput" placeholder="Description (optionnel)" />
      <input type="time" v-model="heureInput" required />
      <button type="submit">+ Ajouter une prise</button>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { newId } from "../../utils/uuid";
import { nowHHmm } from "../../utils/date";
import { useMedocsFavorisStore } from "../../stores/medocsFavoris";
import type { MigraineDraft } from "./draft";
import type { MedocFavori } from "../../types/migraine";

const model = defineModel<MigraineDraft>({ required: true });
const favoris = useMedocsFavorisStore();

const nomInput = ref("");
const descriptionInput = ref("");
const heureInput = ref(nowHHmm());

function addFromFavori(f: MedocFavori) {
  model.value.medocs.push({
    id: newId(),
    nom: f.nom,
    description: f.description,
    heure: nowHHmm(),
  });
  favoris.registerUsage(f.nom, f.description);
}

function addNew() {
  if (!nomInput.value) return;
  model.value.medocs.push({
    id: newId(),
    nom: nomInput.value,
    description: descriptionInput.value || undefined,
    heure: heureInput.value,
  });
  favoris.registerUsage(nomInput.value, descriptionInput.value || undefined);
  nomInput.value = "";
  descriptionInput.value = "";
  heureInput.value = nowHHmm();
}

function remove(index: number) {
  model.value.medocs.splice(index, 1);
}
</script>
```

- [ ] **Step 8: Build `MigraineFormModal.vue` with steps 1-3 wired (steps 4-7 added in Task 9)**

```vue
<template>
  <div class="modal-backdrop" @click.self="close">
    <div class="modal-sheet">
      <div class="progress">Étape {{ stepIndex + 1 }} / {{ steps.length }}</div>
      <component :is="steps[stepIndex]" v-model="draft" />
      <div class="actions">
        <button v-if="stepIndex > 0" type="button" @click="stepIndex--">
          Précédent
        </button>
        <button
          v-if="stepIndex < steps.length - 1"
          type="button"
          @click="stepIndex++"
        >
          Suivant
        </button>
        <button v-else type="button" @click="submit">Enregistrer</button>
        <button type="button" class="close-btn" @click="close">Fermer</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from "vue";
import StepWhen from "./StepWhen.vue";
import StepIntensity from "./StepIntensity.vue";
import StepMedocs from "./StepMedocs.vue";
import { loadDraft, saveDraft, clearDraft } from "./draft";
import { useMigrainesStore } from "../../stores/migraines";

const emit = defineEmits<{ close: []; saved: [] }>();
const migraines = useMigrainesStore();

const steps = [StepWhen, StepIntensity, StepMedocs];
const stepIndex = ref(0);
const draft = ref(loadDraft());

watch(draft, (d) => saveDraft(d), { deep: true });

function close() {
  emit("close");
}

function submit() {
  migraines.save(draft.value);
  clearDraft();
  emit("saved");
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
  overflow-y: auto;
  border-radius: 1rem 1rem 0 0;
  padding: 1.5rem;
}
@media (min-width: 1024px) {
  .modal-backdrop {
    align-items: center;
    justify-content: center;
  }
  .modal-sheet {
    width: 480px;
    border-radius: 1rem;
  }
}
</style>
```

- [ ] **Step 9: Wire the modal into `App.vue`**

Replace the `formOpen` ref usage in `src/App.vue` with the real modal:

```vue
<template>
  <HeaderNav @add="formOpen = true" />
  <main class="app-main">
    <RouterView />
  </main>
  <BottomNav />
  <FabButton @click="formOpen = true" />
  <MigraineFormModal
    v-if="formOpen"
    @close="formOpen = false"
    @saved="formOpen = false"
  />
</template>

<script setup lang="ts">
import { ref } from "vue";
import HeaderNav from "./components/HeaderNav.vue";
import BottomNav from "./components/BottomNav.vue";
import FabButton from "./components/FabButton.vue";
import MigraineFormModal from "./components/MigraineForm/MigraineFormModal.vue";

const formOpen = ref(false);
</script>

<style scoped>
.app-main {
  padding-bottom: 5rem;
}
</style>
```

- [ ] **Step 10: Manual verification**

```bash
npm run dev
```

Click the FAB, step through When → Intensity → Medocs, add a medoc from text input, click Enregistrer, confirm no console errors and the modal closes.

- [ ] **Step 11: Run full test suite**

```bash
npm run test
```

Expected: all PASS.

- [ ] **Step 12: Commit**

```bash
git add src/components/MigraineForm src/App.vue
git commit -m "feat: add migraine form modal with When/Intensity/Medocs steps"
```

---

### Task 9: Migraine form modal - steps 4-7 (Symptoms, Location/Triggers, Notes, Recap)

**Files:**

- Create: `src/components/MigraineForm/StepSymptoms.vue`
- Create: `src/components/MigraineForm/StepLocationTriggers.vue`
- Create: `src/components/MigraineForm/StepNotes.vue`
- Create: `src/components/MigraineForm/StepRecap.vue`
- Modify: `src/components/MigraineForm/MigraineFormModal.vue`

**Interfaces:**

- Consumes: `useDeclencheursStore` (Task 5); `formatDuration` (Task 2).
- Produces: nothing new consumed elsewhere - this completes the form started in Task 8.

- [ ] **Step 1: Build `StepSymptoms.vue`**

```vue
<template>
  <div class="step">
    <h2>Symptômes</h2>
    <label><input type="checkbox" v-model="model.nausee" /> Nausée</label>
    <label
      ><input type="checkbox" v-model="model.vomissement" /> Vomissement</label
    >
    <label><input type="checkbox" v-model="model.aura" /> Aura visuelle</label>
    <label v-if="model.medocs.length > 0">
      <input type="checkbox" v-model="model.avortee" /> Migraine avortée par le
      médicament
    </label>
  </div>
</template>

<script setup lang="ts">
import type { MigraineDraft } from "./draft";
const model = defineModel<MigraineDraft>({ required: true });
</script>
```

- [ ] **Step 2: Build `StepLocationTriggers.vue`**

```vue
<template>
  <div class="step">
    <h2>Localisation & déclencheurs</h2>
    <div class="localisation-options">
      <button
        v-for="opt in localisations"
        :key="opt"
        type="button"
        :class="{ active: model.localisation === opt }"
        @click="model.localisation = opt"
      >
        {{ labels[opt] }}
      </button>
    </div>
    <div class="tags">
      <button
        v-for="tag in declencheurs.tags()"
        :key="tag"
        type="button"
        :class="{ active: model.declencheurs.includes(tag) }"
        @click="toggleTag(tag)"
      >
        {{ tag }}
      </button>
    </div>
    <form @submit.prevent="addCustomTag">
      <input v-model="customTag" placeholder="Ajouter un déclencheur" />
      <button type="submit">Ajouter</button>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useDeclencheursStore } from "../../stores/declencheurs";
import type { MigraineDraft } from "./draft";

const model = defineModel<MigraineDraft>({ required: true });
const declencheurs = useDeclencheursStore();
const customTag = ref("");

const localisations = ["gauche", "droite", "bilaterale", "nuque"] as const;
const labels: Record<(typeof localisations)[number], string> = {
  gauche: "Gauche",
  droite: "Droite",
  bilaterale: "Bilatérale",
  nuque: "Nuque",
};

function toggleTag(tag: string) {
  const i = model.value.declencheurs.indexOf(tag);
  if (i >= 0) model.value.declencheurs.splice(i, 1);
  else model.value.declencheurs.push(tag);
}

function addCustomTag() {
  if (!customTag.value) return;
  declencheurs.register(customTag.value);
  model.value.declencheurs.push(customTag.value);
  customTag.value = "";
}
</script>
```

- [ ] **Step 3: Build `StepNotes.vue`**

```vue
<template>
  <div class="step">
    <h2>Notes</h2>
    <textarea
      v-model="model.notes"
      rows="5"
      placeholder="Notes libres (optionnel)"
    ></textarea>
  </div>
</template>

<script setup lang="ts">
import type { MigraineDraft } from "./draft";
const model = defineModel<MigraineDraft>({ required: true });
</script>
```

- [ ] **Step 4: Build `StepRecap.vue`**

```vue
<template>
  <div class="step">
    <h2>Récapitulatif</h2>
    <ul class="recap-list">
      <li>Date : {{ model.date }}</li>
      <li>
        Début : {{ model.heureDebut }} - Fin :
        {{ model.heureFin ?? "en cours" }}
      </li>
      <li>Intensité : {{ model.intensite }} / 10</li>
      <li>
        Médicaments :
        {{
          model.medocs.map((m) => `${m.nom} (${m.heure})`).join(", ") || "aucun"
        }}
      </li>
      <li>Avortée : {{ model.avortee ? "oui" : "non" }}</li>
      <li>
        Nausée : {{ model.nausee ? "oui" : "non" }} - Vomissement :
        {{ model.vomissement ? "oui" : "non" }}
      </li>
      <li>Aura : {{ model.aura ? "oui" : "non" }}</li>
      <li>Localisation : {{ model.localisation ?? "non renseignée" }}</li>
      <li>Déclencheurs : {{ model.declencheurs.join(", ") || "aucun" }}</li>
      <li v-if="model.notes">Notes : {{ model.notes }}</li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import type { MigraineDraft } from "./draft";
const model = defineModel<MigraineDraft>({ required: true });
</script>
```

- [ ] **Step 5: Wire all 7 steps into `MigraineFormModal.vue`**

In `src/components/MigraineForm/MigraineFormModal.vue`, update the imports and `steps` array:

```ts
import StepWhen from "./StepWhen.vue";
import StepIntensity from "./StepIntensity.vue";
import StepMedocs from "./StepMedocs.vue";
import StepSymptoms from "./StepSymptoms.vue";
import StepLocationTriggers from "./StepLocationTriggers.vue";
import StepNotes from "./StepNotes.vue";
import StepRecap from "./StepRecap.vue";

const steps = [
  StepWhen,
  StepIntensity,
  StepMedocs,
  StepSymptoms,
  StepLocationTriggers,
  StepNotes,
  StepRecap,
];
```

- [ ] **Step 6: Manual verification**

```bash
npm run dev
```

Step through all 7 steps end to end, fill at least one field per step, confirm the recap step shows the correct values, click Enregistrer, then check via dev tools that `localStorage['migracount:migraines']` contains the new entry.

- [ ] **Step 7: Commit**

```bash
git add src/components/MigraineForm
git commit -m "feat: complete migraine form with Symptoms, Location/Triggers, Notes and Recap steps"
```

---

### Task 10: List view and detail/edit modal

**Files:**

- Create: `src/components/MigraineListItem.vue`
- Create: `src/components/MigraineDetailModal.vue`
- Modify: `src/views/ListView.vue`
- Modify: `src/components/MigraineForm/MigraineFormModal.vue` (accept an optional `editId` prop to preload an existing entry instead of the draft)

**Interfaces:**

- Consumes: `useMigrainesStore`, `formatRelative`, `formatDuration`.
- Produces: `MigraineFormModal` accepts prop `editId?: string`; when present it loads that migraine instead of the draft and calls `migraines.save` with the existing `id` so the repository updates rather than creates.

- [ ] **Step 1: Build `MigraineListItem.vue`**

```vue
<template>
  <li class="list-item" @click="$emit('click')">
    <div class="row">
      <span class="date">{{ formatRelative(migraine.date) }}</span>
      <span class="intensity" :style="{ background: intensityColor }">{{
        migraine.intensite
      }}</span>
    </div>
    <div class="row muted">
      <span>{{ durationLabel }}</span>
      <span v-if="migraine.medocs.length">{{
        migraine.medocs.map((m) => m.nom).join(", ")
      }}</span>
      <span v-if="migraine.avortee" class="badge">Avortée</span>
    </div>
  </li>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { formatRelative, formatDuration } from "../utils/date";
import type { Migraine } from "../types/migraine";

const props = defineProps<{ migraine: Migraine }>();
defineEmits<{ click: [] }>();

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
</script>
```

- [ ] **Step 2: Update `MigraineFormModal.vue` to support editing**

Add an `editId` prop and load logic:

```ts
const props = defineProps<{ editId?: string }>();
const draft = ref(
  props.editId ? { ...migraines.getById(props.editId)! } : loadDraft(),
);
const stepIndex = ref(props.editId ? steps.length - 1 : 0);

watch(
  draft,
  (d) => {
    if (!props.editId) saveDraft(d);
  },
  { deep: true },
);

function submit() {
  migraines.save(draft.value);
  if (!props.editId) clearDraft();
  emit("saved");
}
```

(This replaces the existing `draft`, `stepIndex`, `watch`, and `submit` declarations from Task 8/9 - same names, new logic. Opening for edit jumps straight to the Recap step so the user sees everything immediately and can navigate back to any step to fix a field.)

- [ ] **Step 3: Build `ListView.vue`**

```vue
<template>
  <div class="list-view">
    <h1>Mes migraines</h1>
    <ul v-if="sorted.length">
      <MigraineListItem
        v-for="m in sorted"
        :key="m.id"
        :migraine="m"
        @click="editId = m.id"
      />
    </ul>
    <p v-else class="empty">Aucune migraine enregistrée pour le moment.</p>
    <MigraineFormModal
      v-if="editId"
      :edit-id="editId"
      @close="editId = null"
      @saved="editId = null"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import { useMigrainesStore } from "../stores/migraines";
import MigraineListItem from "../components/MigraineListItem.vue";
import MigraineFormModal from "../components/MigraineForm/MigraineFormModal.vue";

const migraines = useMigrainesStore();
const editId = ref<string | null>(null);

const sorted = computed(() =>
  [...migraines.migraines].sort((a, b) =>
    a.date + a.heureDebut < b.date + b.heureDebut ? 1 : -1,
  ),
);
</script>
```

- [ ] **Step 4: Manual verification**

```bash
npm run dev
```

Create 2-3 migraines via the FAB, navigate to `/liste`, confirm they're sorted most-recent-first, click one, confirm the modal opens on the Recap step, go back to an earlier step, change the intensity, save, and confirm the list reflects the change.

- [ ] **Step 5: Commit**

```bash
git add src/components/MigraineListItem.vue src/views/ListView.vue src/components/MigraineForm/MigraineFormModal.vue
git commit -m "feat: add migraine list view with edit-in-place via the form modal"
```

(`MigraineDetailModal.vue` from the file structure is dropped here - editing reuses `MigraineFormModal` directly via the Recap-first flow, so a separate read-only detail component would be redundant. Note this simplification in the PR description.)

---

### Task 11: Stats view with three charts

**Files:**

- Create: `src/components/charts/FrequencyChart.vue`
- Create: `src/components/charts/IntensityChart.vue`
- Create: `src/components/charts/EfficacyChart.vue`
- Modify: `src/views/StatsView.vue`

**Interfaces:**

- Consumes: `monthlyFrequency`, `averageIntensityByMonth`, `medocEfficacy`, `averageDurationMinutes` (Task 4); `useMigrainesStore` (Task 5); `formatRelative`, `formatDuration` (Task 2).

- [ ] **Step 1: Build `FrequencyChart.vue`**

```vue
<template>
  <Bar :data="chartData" :options="options" />
</template>

<script setup lang="ts">
import { computed } from "vue";
import { Bar } from "vue-chartjs";
import {
  Chart as ChartJS,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
} from "chart.js";
import { monthlyFrequency } from "../../utils/stats";
import type { Migraine } from "../../types/migraine";

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip);

const props = defineProps<{ migraines: Migraine[] }>();

const chartData = computed(() => {
  const data = monthlyFrequency(props.migraines);
  return {
    labels: data.map((d) => d.month.slice(5)),
    datasets: [
      {
        label: "Crises",
        data: data.map((d) => d.count),
        backgroundColor: "#8b5cf6",
      },
    ],
  };
});

const options = { responsive: true, plugins: { legend: { display: false } } };
</script>
```

- [ ] **Step 2: Build `IntensityChart.vue`**

```vue
<template>
  <Line :data="chartData" :options="options" />
</template>

<script setup lang="ts">
import { computed } from "vue";
import { Line } from "vue-chartjs";
import {
  Chart as ChartJS,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Tooltip,
} from "chart.js";
import { averageIntensityByMonth } from "../../utils/stats";
import type { Migraine } from "../../types/migraine";

ChartJS.register(
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Tooltip,
);

const props = defineProps<{ migraines: Migraine[] }>();

const chartData = computed(() => {
  const data = averageIntensityByMonth(props.migraines);
  return {
    labels: data.map((d) => d.month.slice(5)),
    datasets: [
      {
        label: "Intensité moyenne",
        data: data.map((d) => d.avg),
        borderColor: "#a78bfa",
        tension: 0.3,
      },
    ],
  };
});

const options = { responsive: true, scales: { y: { min: 0, max: 10 } } };
</script>
```

- [ ] **Step 3: Build `EfficacyChart.vue`**

```vue
<template>
  <Bar :data="chartData" :options="options" />
</template>

<script setup lang="ts">
import { computed } from "vue";
import { Bar } from "vue-chartjs";
import {
  Chart as ChartJS,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
} from "chart.js";
import { medocEfficacy } from "../../utils/stats";
import type { Migraine } from "../../types/migraine";

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip);

const props = defineProps<{ migraines: Migraine[] }>();

const chartData = computed(() => {
  const data = medocEfficacy(props.migraines).filter((d) => d.total >= 2);
  return {
    labels: data.map((d) => d.nom),
    datasets: [
      {
        label: "% crises avortées",
        data: data.map((d) => d.pctAvortee),
        backgroundColor: "#8b5cf6",
      },
    ],
  };
});

const options = {
  indexAxis: "y" as const,
  responsive: true,
  scales: { x: { min: 0, max: 100 } },
};
</script>
```

- [ ] **Step 4: Build `StatsView.vue`**

```vue
<template>
  <div class="stats-view">
    <h1>Migracount</h1>
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
    <section>
      <h2>Fréquence (12 derniers mois)</h2>
      <FrequencyChart :migraines="migraines.migraines" />
    </section>
    <section>
      <h2>Intensité moyenne</h2>
      <IntensityChart :migraines="migraines.migraines" />
    </section>
    <section>
      <h2>Efficacité des traitements</h2>
      <EfficacyChart :migraines="migraines.migraines" />
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useMigrainesStore } from "../stores/migraines";
import { formatRelative, formatDuration, todayISO } from "../utils/date";
import { averageDurationMinutes } from "../utils/stats";
import FrequencyChart from "../components/charts/FrequencyChart.vue";
import IntensityChart from "../components/charts/IntensityChart.vue";
import EfficacyChart from "../components/charts/EfficacyChart.vue";

const migraines = useMigrainesStore();

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
```

- [ ] **Step 5: Manual verification**

```bash
npm run dev
```

With the 2-3 migraines created in Task 10 still in localStorage, navigate to `/`, confirm the three charts render with data and the summary cards show sensible values. Toggle the OS theme (light/dark) and confirm the page background/text adapt.

- [ ] **Step 6: Commit**

```bash
git add src/components/charts src/views/StatsView.vue
git commit -m "feat: add stats view with frequency, intensity and efficacy charts"
```

---

### Task 12: Settings view - export/import

**Files:**

- Modify: `src/views/SettingsView.vue`

**Interfaces:**

- Consumes: `exportAll`, `importAll` (Task 3); `useMigrainesStore`, `useMedocsFavorisStore`, `useDeclencheursStore` (Task 5, to refresh reactive state after import).

- [ ] **Step 1: Build `SettingsView.vue`**

```vue
<template>
  <div class="settings-view">
    <h1>Réglages</h1>
    <section>
      <h2>Export</h2>
      <button @click="doExport">Télécharger mes données (JSON)</button>
    </section>
    <section>
      <h2>Import</h2>
      <input type="file" accept="application/json" @change="onFileSelected" />
      <p v-if="confirming" class="confirm-box">
        Importer ce fichier remplacera toutes les données actuelles. Confirmer ?
        <button @click="confirmImport">Oui, remplacer</button>
        <button @click="confirming = false">Annuler</button>
      </p>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { exportAll, importAll } from "../storage/migraineRepository";
import { useMigrainesStore } from "../stores/migraines";
import { useMedocsFavorisStore } from "../stores/medocsFavoris";
import { useDeclencheursStore } from "../stores/declencheurs";

const migraines = useMigrainesStore();
const medocsFavoris = useMedocsFavorisStore();
const declencheurs = useDeclencheursStore();

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
  migraines.migraines = migraines.getById
    ? [...migraines.migraines]
    : migraines.migraines;
  location.reload();
}
</script>
```

(`location.reload()` after import is intentional and simplest: it guarantees every Pinia store re-reads from `localStorage` with zero risk of stale reactive state, which matters more here than avoiding a full page reload on an explicit, infrequent settings action.)

- [ ] **Step 2: Manual verification**

```bash
npm run dev
```

Go to `/settings` (or via header on desktop), click export, confirm a `.json` file downloads with the expected structure. Clear localStorage manually, reload, confirm the app is empty, then import the previously exported file and confirm the data is restored after the page reload.

- [ ] **Step 3: Commit**

```bash
git add src/views/SettingsView.vue
git commit -m "feat: add export/import settings view"
```

---

### Task 13: PWA manifest, icon generation, offline support

**Files:**

- Create: `src/assets/logo.svg`
- Create: `scripts/generate-icons.mjs`
- Modify: `vite.config.ts`
- Modify: `package.json` (add `icons` script and `sharp` dev dependency)

**Interfaces:**

- Produces: `public/icons/*.png` (192, 512, maskable-512, apple-touch-icon) and `public/favicon.ico`-equivalent, referenced by the `VitePWA` manifest config.

- [ ] **Step 1: Create the source SVG logo**

`src/assets/logo.svg` - a stylized head profile with a colored pain spiral, on a square viewBox so it scales cleanly to any icon size:

```svg
<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <rect width="512" height="512" rx="96" fill="#8b5cf6"/>
  <path d="M160 320c0-88 64-160 152-160 64 0 112 40 112 96 0 40-24 64-56 64-8 0-16-2-16-2"
        fill="none" stroke="#ffffff" stroke-width="16" stroke-linecap="round"/>
  <circle cx="270" cy="190" r="10" fill="#ffffff"/>
  <path d="M310 250a40 40 0 1 0 0 1" fill="none" stroke="#fef08a" stroke-width="10" stroke-linecap="round"/>
  <path d="M150 360c20-12 40-12 60 0s40 12 60 0 40-12 60 0 40 12 60 0"
        fill="none" stroke="#ffffff" stroke-width="10" stroke-linecap="round" opacity="0.6"/>
</svg>
```

- [ ] **Step 2: Install the icon-generation dependency**

```bash
npm install -D sharp
```

- [ ] **Step 3: Write the icon generation script**

`scripts/generate-icons.mjs`:

```js
import sharp from "sharp";
import { mkdirSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const src = join(__dirname, "../src/assets/logo.svg");
const outDir = join(__dirname, "../public/icons");

mkdirSync(outDir, { recursive: true });

const targets = [
  { name: "icon-192.png", size: 192 },
  { name: "icon-512.png", size: 512 },
  { name: "maskable-512.png", size: 512 },
  { name: "apple-touch-icon.png", size: 180 },
  { name: "favicon-32.png", size: 32 },
];

for (const t of targets) {
  await sharp(src).resize(t.size, t.size).png().toFile(join(outDir, t.name));
  console.log(`generated ${t.name}`);
}
```

- [ ] **Step 4: Add the script to `package.json`**

```json
"scripts": {
  "icons": "node scripts/generate-icons.mjs"
}
```

- [ ] **Step 5: Run icon generation, verify output**

```bash
npm run icons
```

Expected: console logs for all 5 files, and `public/icons/` contains `icon-192.png`, `icon-512.png`, `maskable-512.png`, `apple-touch-icon.png`, `favicon-32.png`.

- [ ] **Step 6: Configure `vite-plugin-pwa` in `vite.config.ts`**

```ts
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    vue(),
    VitePWA({
      registerType: "autoUpdate",
      manifest: {
        name: "Migracount",
        short_name: "Migracount",
        description: "Suivi personnel des crises de migraine, 100% local",
        theme_color: "#8b5cf6",
        background_color: "#faf8fc",
        display: "standalone",
        icons: [
          { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
          {
            src: "/icons/maskable-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,ico}"],
      },
    }),
  ],
});
```

- [ ] **Step 7: Link the apple-touch-icon and favicon in `index.html`**

Add inside `<head>`:

```html
<link rel="icon" type="image/png" href="/icons/favicon-32.png" />
<link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
```

- [ ] **Step 8: Build and verify the PWA artifacts**

```bash
npm run build
```

Expected: build succeeds, `dist/manifest.webmanifest` and `dist/sw.js` are generated, `dist/icons/` contains the 5 PNGs.

- [ ] **Step 9: Manual offline verification**

```bash
npm run build
npm run preview
```

Open the preview URL in a browser, open DevTools → Application → Service Workers and confirm one is registered and activated. Then switch DevTools' Network tab to "Offline" and reload the page - confirm the app still loads and the previously saved migraines still display.

- [ ] **Step 10: Commit**

```bash
git add src/assets/logo.svg scripts/generate-icons.mjs vite.config.ts package.json index.html public/icons
git commit -m "feat: add PWA manifest, generated icons and offline support"
```

---

## Self-Review Notes

- **Spec coverage:** §1-2 (PWA/local storage) → Task 13; §3 (data model) → Task 2; §4 (form) → Tasks 8-9; §5 (list/edit) → Task 10; §6 (stats) → Task 11; §7 (nav/responsive) → Task 7; §8 (export/import) → Task 12; §9 (identity/PWA) → Task 13; §10 (out of scope) → deliberately untouched.
- **Placeholder scan:** none found - every step has concrete code or an exact command with expected output.
- **Type consistency:** `MigraineDraft` (Task 8) matches `Migraine` minus `id/createdAt/updatedAt`, consumed identically across all step components and `MigraineFormModal`. `useMigrainesStore().save()` signature matches `migraineRepository.saveMigraine()` throughout. Chart components all take a `migraines: Migraine[]` prop matching `stats.ts` function signatures.
- **Deviation from file structure:** `MigraineDetailModal.vue` listed in the original file structure was dropped during Task 10 in favor of reusing `MigraineFormModal` with a Recap-first edit flow - simpler, no duplicated read-only rendering logic.
