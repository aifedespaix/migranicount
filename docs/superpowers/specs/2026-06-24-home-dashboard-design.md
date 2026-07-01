# Home (StatsView) Dashboard Redesign

Part 1 of 5 in the broader UI/UX overhaul (Home → List → Form → Settings → README).

## Goals

- Fixed header on all screen sizes (mobile + desktop).
- Page uses full viewport width (no artificial max-width container).
- Entire dashboard (cards + charts) fits within the viewport height with no page scroll (`100dvh` minus header/bottom-nav).
- Charts laid out in a 3-column grid in landscape orientation, stacked 1-column in portrait - driven by `@media (orientation: landscape)`, not a width breakpoint.
- Clicking a chart opens a fullscreen detail view with an enlarged chart plus stats specific to that chart.
- Empty state (no migraines recorded) replaces the dashboard with an explanatory message and a CTA to log the first migraine.
- The FAB ("+") button is visible bottom-right on all screen sizes, including desktop, in addition to the existing header "Ajouter" button. Both open the same `MigraineFormModal`.
- Button/form visual polish is explicitly out of scope here - covered by a later phase of this overhaul.

## Layout

- `HeaderNav` becomes `position: fixed; top: 0; left: 0; right: 0; width: 100%` and is shown unconditionally (remove the `display: none` / `@media (min-width: 1024px)` toggle that currently hides it on mobile). `BottomNav` remains as-is for mobile navigation.
- `App.vue`'s `.app-main` becomes a fit-to-screen container: `height: calc(100dvh - var(--header-h) - var(--bottomnav-h, 0px)); overflow: hidden`. On desktop where `BottomNav` is hidden, the bottom offset is 0.
- Remove any `max-width` constraints on the page/container so content spans 100% of viewport width.
- `StatsView` root becomes a flex column filling its container: a fixed-height row of summary cards at top, then a `flex: 1; min-height: 0` charts grid below.

## Charts grid

- Charts grid container: `display: grid; gap: ...; height: 100%`.
- `@media (orientation: landscape)`: `grid-template-columns: repeat(3, 1fr)`.
- Default (portrait): `grid-template-columns: 1fr` (stacked).
- Each grid cell: `min-height: 0` so children can shrink; the chart wrapper inside is `height: 100%`.
- Each `vue-chartjs` chart options gets `maintainAspectRatio: false, responsive: true` so it fills its container instead of imposing its own aspect ratio (eliminates internal chart scrollbars/overflow).
- Each chart is wrapped in a clickable "card" (`cursor: pointer`, hover elevation/border accent) that opens `ChartDetailModal` on click.

## Fullscreen chart detail (`ChartDetailModal`)

New component, `position: fixed` covering the viewport, opened from `StatsView` with a prop identifying which chart was clicked (`'frequency' | 'intensity' | 'efficacy'`).

- Renders the same chart type enlarged (`maintainAspectRatio: false`, taller container) reusing the existing chart components (pass full `migraines` data through).
- Renders chart-specific supplementary stats below/beside the chart, computed via new helpers in `src/utils/stats.ts`:
  - **Frequency**: total migraines count, busiest month (label + count), trend vs previous period (e.g. last 3 months vs prior 3 months, simple percentage or up/down indicator).
  - **Intensity**: distribution by intensity level (count per level, e.g. as a simple breakdown list), overall average intensity.
  - **Efficacy**: treatments ranked by success rate (% of uses marked effective), descending.
- Close via an explicit close button (and Escape key) - no save/discard semantics needed since this is read-only.

## Empty state

When `migraines.migraines.length === 0`, `StatsView` renders only:

- A short paragraph explaining the app's purpose (tracking migraines to spot patterns/stats).
- A CTA button "Répertorier une migraine" that opens `MigraineFormModal` (same modal as header/FAB).

No summary cards or charts are rendered in this state.

## FAB

Remove the `@media (min-width: 1024px) { .fab { display: none; } }` rule from `FabButton.vue` so it remains visible bottom-right at all screen sizes, alongside the desktop header's "Ajouter" button. Both trigger the same `formOpen = true` action in `App.vue`.

## Out of scope (handled in later phases of this overhaul)

- Visual restyling of buttons/forms (header "Ajouter", FAB icon, CTA button) beyond functional requirements above.
- Migraine list redesign, form/wizard redesign, settings redesign, README.
