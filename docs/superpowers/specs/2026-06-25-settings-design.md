# Settings (Réglages) - Theme switching, dyslexia-friendly font, migraine mode

## Goal

Part 4 of the Migracount UI/UX overhaul. Add a new "Apparence" section to `SettingsView.vue` offering:

1. Manual theme switching (Clair / Sombre / Auto / Migraine).
2. A dyslexia-friendly font mode (choice of Lexend or OpenDyslexic).
3. A research-backed "migraine mode" color palette for migraine sufferers (photophobia-aware, low-contrast, no animation).

## Research backing the migraine mode design

- **FL-41 tint**: rose-tinted optical filters blocking ~480nm blue-green light are clinically shown to reduce migraine photophobia (up to 74% fewer attacks in some studies). Source: [PMC10939838](https://pmc.ncbi.nlm.nih.gov/articles/PMC10939838/), [TheraSpecs](https://www.theraspecs.com/blog/tinted-glasses-for-migraines-research-shows-fl41-tint-is-better/).
- **Green light (~525nm)** worsens migraine significantly less than other colors and can even soothe symptoms at low intensity. Blue, amber, and red wavelengths are most likely to trigger/worsen photophobia. Source: [Harvard Medical School](https://hms.harvard.edu/news/green-light-migraine-relief).
- **Warm white / low color temperature (2700–3000K)** has fewer blue-spectrum elements than bright white/daylight and is generally best for migraine sufferers.
- Conclusion applied to UI: avoid pure white or pure black; use a warm, dim, low-contrast palette; favor a desaturated sage-green accent (closest safe color per the green-light research) over blue or saturated red; disable animation/motion (flicker/motion is a separate known trigger).

Font research: [DeveloperUX](https://developerux.com/2026/03/27/best-fonts-for-dyslexia-research-and-insights/), [PMC5629233](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC5629233/) - OpenDyslexic has weak evidence of improving reading speed/accuracy but is the most recognized "dyslexia font" and some readers prefer it subjectively. Lexend has stronger evidence (Vanderbilt studies) of reading-speed gains and looks like a normal sans-serif. Both are offered as user choice since evidence and subjective preference diverge.

## Architecture

### Settings store

New `src/stores/settings.ts` (Pinia store), following the existing store conventions (`useMedocsFavorisStore`, `useDeclencheursStore`):

```ts
type ThemeChoice = "light" | "dark" | "auto" | "migraine";
type FontChoice = "none" | "lexend" | "opendyslexic";

interface SettingsState {
  theme: ThemeChoice;
  dyslexicFont: FontChoice;
}
```

- Persisted via the existing `getJSON`/`setJSON` helpers in `src/storage/storage.ts` under key `settings`.
- A `resolvedTheme` computed/getter resolves `'auto'` to `'light'` or `'dark'` based on `window.matchMedia('(prefers-color-scheme: dark)').matches`, re-evaluated live on OS scheme change (the store owns one `matchMedia` listener, added on store creation, removed never - store is a singleton for app lifetime, consistent with other stores).
- A `watchEffect` (or direct calls in the setters) applies state to the DOM:
  - `document.documentElement.setAttribute('data-theme', resolvedTheme)` - always one of `light`/`dark`/`migraine` (never `auto` itself; `auto` is resolved before reaching the DOM).
  - `document.documentElement.setAttribute('data-font', dyslexicFont)` if not `'none'`, otherwise `removeAttribute('data-font')`.
- Setters: `setTheme(t: ThemeChoice)`, `setDyslexicFont(f: FontChoice)`, both persist immediately via `setJSON`.
- On store creation, state is hydrated from `getJSON('settings', { theme: 'auto', dyslexicFont: 'none' })` and the DOM attributes are applied immediately (so there's no flash of unstyled/wrong theme - this runs synchronously during Pinia store init, before first paint, since the store is instantiated in `App.vue`'s setup or earlier).

### CSS: theme.css

Replace the current `@media (prefers-color-scheme: dark)`-only override with explicit attribute selectors. The existing light values become the implicit default (no attribute / `data-theme="light"`); add explicit blocks:

```css
:root {
  /* existing light values, unchanged */
}

[data-theme="dark"] {
  /* existing dark values, moved out of the media query, unchanged */
}

[data-theme="migraine"] {
  --color-bg: #2b2420;
  --color-surface: #3a322b;
  --color-text: #ddd4c8;
  --color-accent: #8fa876;
  --color-accent-contrast: #1c2117;
  --color-muted: #a89b8a;
  --color-danger: #c97b5f;
}

[data-theme="migraine"] *,
[data-theme="migraine"] *::before,
[data-theme="migraine"] *::after {
  animation: none !important;
  transition: none !important;
}
```

The `@media (prefers-color-scheme: dark)` block is removed from CSS entirely - "auto" behavior is now handled in JS by the settings store (resolving to an explicit `data-theme` value), not by the browser's media query cascade. This is a deliberate behavior-preserving refactor: before, every load without a manual preference followed the OS; after, the store computes the same result and writes it explicitly, but now a manual override is possible.

### chartTheme.ts fix

`useChartThemeColors()` currently bumps `themeVersion` only on a `matchMedia('(prefers-color-scheme: dark)')` change event - this misses manual theme switches entirely (a known gap, not previously exercised since there was no manual switch). Change it to watch the settings store's `resolvedTheme` (and `theme` for migraine) instead of/in addition to the raw media query, so chart colors update live on any theme change, including a manual switch to/from `migraine`.

### Fonts

Two font families self-hosted as static assets (offline-first PWA - no CDN dependency):

- `public/fonts/lexend-400.woff2`, `public/fonts/lexend-600.woff2` (Google Fonts, OFL license)
- `public/fonts/opendyslexic-regular.woff2`, `public/fonts/opendyslexic-bold.woff2` (OpenDyslexic project, free license)

New `src/styles/fonts.css`:

```css
@font-face {
  font-family: "Lexend";
  src: url("/fonts/lexend-400.woff2") format("woff2");
  font-weight: 400;
  font-display: swap;
}
@font-face {
  font-family: "Lexend";
  src: url("/fonts/lexend-600.woff2") format("woff2");
  font-weight: 600;
  font-display: swap;
}
@font-face {
  font-family: "OpenDyslexic";
  src: url("/fonts/opendyslexic-regular.woff2") format("woff2");
  font-weight: 400;
  font-display: swap;
}
@font-face {
  font-family: "OpenDyslexic";
  src: url("/fonts/opendyslexic-bold.woff2") format("woff2");
  font-weight: 700;
  font-display: swap;
}

[data-font="lexend"] body {
  font-family:
    "Lexend",
    system-ui,
    -apple-system,
    sans-serif;
}
[data-font="opendyslexic"] body {
  font-family:
    "OpenDyslexic",
    system-ui,
    -apple-system,
    sans-serif;
}
```

Imported in `main.ts` alongside the other style imports. Font files added to the PWA precache automatically via the existing `globPatterns` in `vite.config.ts` (woff2 needs adding to the glob pattern list, currently `**/*.{js,css,html,svg,png,ico}` - add `woff2`).

## UI: SettingsView.vue

New "Apparence" section inserted above the existing Export section, styled with the shared `form.css` pill classes (`.pill-group`, `.pill-btn`/`.pill-btn.active`) already used throughout the wizard, for visual consistency:

```
## Apparence

Thème
[ Clair ] [ Sombre ] [ Auto ] [ Migraine ]

Police
[ Normale ]        [ Lexend ]         [ OpenDyslexic ]
  Aa Bb Cc            Aa Bb Cc            Aa Bb Cc
  (rendu par défaut)  (rendu en Lexend)   (rendu en OpenDyslexic)
```

Each font pill shows a small preview string ("Aa Bb Cc Texte d'exemple") rendered live in that font (inline `style="font-family: ..."` referencing the same `@font-face` families, independent of the active `data-font` attribute, so all three previews are visible simultaneously regardless of the current selection).

Clicking a pill calls the store setter directly (`settings.setTheme('migraine')` / `settings.setDyslexicFont('lexend')`) - no local component state, no save/cancel (instant apply, consistent with how theme switches work everywhere else in the wild).

## Testing

- `src/stores/settings.test.ts` (new, TDD): resolution of `auto` to light/dark via mocked `matchMedia`, correct `data-theme`/`data-font` attribute application, persistence round-trip via `getJSON`/`setJSON`, default values when storage is empty.
- `SettingsView.vue` and the chartTheme.ts reactivity fix: no component-level test (existing convention - zero `.vue` unit tests), verified via `vue-tsc --noEmit` + manual/logical check that the watcher fires on store changes.
- Manual/visual verification recommended (no browser tool in this environment, same caveat as prior phases) for: pill preview rendering, migraine palette contrast/readability, font swap visibly applying.

## Out of scope

- No "reduce motion" toggle independent of migraine mode (migraine mode is the only thing that disables animations, per the architecture decision that it's a self-contained 4th theme).
- No per-component opt-out of the dyslexia font (it's global, applied at `body` level).
- No additional accessibility settings (text size, line spacing) beyond what's explicitly requested.
