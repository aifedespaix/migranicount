# Migraine List Redesign

Part 2 of 5 in the broader UI/UX overhaul (Home → **List** → Form → Settings → README).

## Goals

- Add a CSS reset for list elements so `<ul>`/`<li>` no longer render browser-default bullets/markers/padding.
- Replace the bare `<li>` migraine row with a modern, info-rich card with hover feedback.
- Add a keyword search and a month/year filter, combinable, that narrow the displayed list.
- Distinguish "no migraines at all" (existing onboarding-style empty state) from "no migraines match the current filters" (a separate, filter-specific empty state).
- Responsive layout: 1 column on mobile, 2-3 columns on wide screens.

## CSS reset

Add to `src/styles/theme.css` (global, benefits the whole app, not just this view):

```css
ul, ol {
  list-style: none;
  margin: 0;
  padding: 0;
}
```

## Migraine card

`MigraineListItem.vue` changes from a bare `<li>` with two text rows to a styled card (`<li class="migraine-card">`, since the reset removes bullet/padding but `<li>` remains the correct semantic element inside the `<ul>`):

- **Header row**: relative date (`formatRelative`) + existing colored intensity badge.
- **Detail row**: duration (`durationLabel`, existing logic) + médocs taken (comma-joined names, existing logic).
- **Badges row** (only rendered when applicable, each conditionally shown):
  - "Avortée" badge (existing).
  - Nausée icon/label, Vomissement icon/label, Aura icon/label — shown only when each respective boolean is `true`.
  - Localisation label (gauche/droite/bilatérale/nuque) — shown only when `localisation !== null`.
- Card styling: background `var(--color-surface)`, border-radius, padding, subtle shadow. On hover: `border-color: var(--color-accent)` + `transform: translateY(-2px)`, consistent with the `.chart-card` hover treatment introduced on the Home dashboard.
- Clicking anywhere on the card still emits `click` (opens `MigraineFormModal` in edit mode, unchanged from current behavior).

No new icon library is introduced — icons are simple inline Unicode/emoji or minimal inline SVGs consistent with the project's current lack of an icon dependency (`package.json` has no icon package). Exact glyphs are a small implementation detail, not a spec-level decision.

## Layout

`ListView.vue`'s list container becomes a responsive grid:

```css
.migraine-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;
}
@media (min-width: 768px) {
  .migraine-grid { grid-template-columns: repeat(2, 1fr); }
}
@media (min-width: 1280px) {
  .migraine-grid { grid-template-columns: repeat(3, 1fr); }
}
```

This view is not fit-to-screen like the Home dashboard — it scrolls normally when content exceeds the viewport (a list is expected to grow and scroll; only the Home dashboard had the no-scroll requirement).

## Filters

Two filter controls rendered above the grid, side by side on wide screens, stacked on mobile:

- **Keyword search**: a single text `<input>`. Matches (case-insensitive, accent-insensitive via `normalize('NFD').replace(/[̀-ͯ]/g, '')`) against, per migraine: médoc names (`medocs[].nom`), `notes`, `declencheurs[]` (joined), and `localisation` (matched against its French label, e.g. "gauche").
- **Month filter**: `<input type="month">`. When set, only migraines whose `date` starts with the selected `YYYY-MM` are shown.
- Filters combine with logical AND. Both are optional/independent; clearing either widens the result set.

Filtering logic lives in a new pure helper (not a Vue component) so it's independently testable:

```ts
// src/utils/migraineFilters.ts
export function filterMigraines(
  migraines: Migraine[],
  opts: { keyword?: string; month?: string }
): Migraine[]
```

## Empty states

`ListView.vue` distinguishes two cases:

1. **No migraines recorded at all** (`migraines.migraines.length === 0`): styled message + "Ajouter une migraine" CTA button (opens `MigraineFormModal`), consistent in tone/style with the Home dashboard's empty state from Part 1.
2. **Migraines exist, but the current filters match none** (`migraines.migraines.length > 0 && filtered.length === 0`): a distinct, simpler message "Aucun résultat pour ces filtres" + a "Réinitialiser les filtres" button that clears both filter inputs back to their defaults.

## Out of scope (handled in later phases of this overhaul)

- Visual restyling of the form/wizard opened on card click (Part 3).
- Settings/theme work (Part 4).
- README (Part 5).
