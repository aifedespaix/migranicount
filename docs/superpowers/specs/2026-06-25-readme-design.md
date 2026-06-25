# README

## Goal

Part 5 (final) of the Migracount UI/UX overhaul. Write a quality `README.md` at the project root — none exists today.

## Scope

Personal project, no CI, no configured deployment, no external contributors. The README documents the project for the author's own future reference and anyone who clones the repo, not an open-source audience — no contribution guidelines or license section.

## Language

French, matching the app's UI.

## Structure

1. **Titre + description courte** — what Migracount is (PWA de suivi personnel des migraines), one or two sentences.
2. **Fonctionnalités** — grouped by the app's four sections (Accueil/dashboard, Liste, Formulaire, Réglages), plus PWA/offline/local-storage as a cross-cutting feature.
3. **Stack technique** — Vue 3, TypeScript, Pinia, Vue Router, Chart.js/vue-chartjs, Vite, vite-plugin-pwa, Vitest.
4. **Installation & lancement** — `npm install`, `npm run dev`, `npm run build`, `npm run test`, `npm run icons`, taken verbatim from `package.json`'s `scripts` block.
5. **Structure du projet** — a commented directory tree of `src/` (views, components, stores, storage, styles, utils) at a level useful for orientation, not an exhaustive file listing.
6. **Confidentialité des données** — 100% local storage (no backend, no network calls for app data), manual export/import as JSON from the Réglages screen.

## Out of scope

- No screenshots (no browser tool available to capture them in this environment; can be added later manually).
- No license section, no contribution guidelines, no badges/CI status (none of these apply to this personal, unpublished project).
- No changelog — git history already serves that purpose.
