# Migraine Form/Wizard Redesign

Part 3 of 5 in the broader UI/UX overhaul (Home → List → **Form** → Settings → README).

## Goals

- Modal structure: clear step title + progress indicator, a top-right close (X) button, scrollable body, and a sticky bottom action bar.
- Bottom action bar always shows three buttons in fixed positions — Précédent (left), Enregistrer (center), Suivant (right) — disabled (greyed) rather than hidden when not applicable, so there's no layout jump between steps.
- Closing in create mode is communicated as non-destructive (draft is preserved); closing in edit mode with unmodified data closes immediately, but with modified data triggers a custom (non-native) confirmation dialog.
- Replace native `<input type="date">`/`<input type="time">` with reusable custom `DateField`/`TimeField` components: a typeable text input plus an icon button opening a calendar/time popup.
- Visually polish each step (slider gradient + intensity label, pill-toggle symptom buttons, card-style médoc rows, restyled textarea) without restructuring their data model.
- Rebuild `StepRecap` as an icon-based, grouped summary consistent with the card style introduced in the Migraine list (Part 2).

## Modal structure & bottom action bar

`MigraineFormModal.vue` header changes from a bare "Étape X / N" line to: step title (taken from the active step's own `<h2>`, or a small label map) + a progress bar/dots, with an `×` icon button top-right that calls `requestClose()` instead of `close()` directly.

Bottom action bar, always rendered with all three buttons present:

```
[ Précédent ]           [ Enregistrer ]           [ Suivant ]
```

- **Précédent**: `disabled` when `stepIndex === 0`.
- **Suivant**: `disabled` when `stepIndex === steps.length - 1` (last step, Récapitulatif).
- **Enregistrer**: `disabled` unless `stepIndex === steps.length - 1`. When enabled, calls the existing `submit()` logic.

Disabled buttons are visually greyed (lower opacity, `cursor: not-allowed`, no hover effect) but remain in the DOM at the same position — no layout shift between steps.

## Close confirmation behavior

`requestClose()` replaces the direct `close()` call on the `×` button:

- **Create mode** (`!props.editId`): the `×` button carries a `title="Fermer (brouillon conservé)"` tooltip and, since the draft is already autosaved via the existing `watch(draft, ...)` + `saveDraft`, closes immediately — no confirmation needed, the data is genuinely not lost.
- **Edit mode** (`props.editId` set): on mount, a snapshot of the original record (`migraines.getById(props.editId)`) is kept. `requestClose()` does a shallow-ish equality check (`JSON.stringify` comparison against the snapshot, consistent with this codebase's lack of a deep-diff utility) — if unchanged, close immediately; if changed, show a new `ConfirmDialog` component ("Annuler les modifications ?" / "Continuer l'édition" / "Quitter sans enregistrer") before emitting `close`.

`ConfirmDialog.vue` is a small, generic, reusable modal-over-modal component (`props: { title: string; message: string; confirmLabel: string; cancelLabel: string }`, `emits: { confirm: []; cancel: [] }`), styled consistently with the app's existing surface/accent tokens — not a native `confirm()`.

## `DateField` / `TimeField` components

Both follow the same pattern: a text `<input>` (typeable, loosely validated) plus an icon button that toggles a popup, closed on outside click or on selection.

- **`DateField.vue`** — `defineModel<string>()` bound to an ISO `YYYY-MM-DD` string. Popup is a month calendar grid: navigable prev/next month header, weekday labels, clickable day cells (today and selected day visually marked). Typing directly into the text input is accepted if it parses as a valid `YYYY-MM-DD`-ish date; invalid text is left as-is until it resolves to a valid date (no aggressive reformatting while typing).
- **`TimeField.vue`** — `defineModel<string>()` bound to an `HH:mm` string. Popup shows two independently scrollable columns (hours `00`-`23`, minutes `00`-`59`); clicking a value in either column updates that part of the model and keeps the popup open until both are set or the user clicks outside/confirms.

Both replace the native inputs in:
- `StepWhen.vue`: date, heure de début, heure de fin (when not "en cours").
- `StepMedocs.vue`: heure de prise in the "add médoc" form.

## Per-step visual polish

- **`StepIntensity.vue`**: keep the `<input type="range">`, restyle the track with a gradient consistent with the existing intensity-color formula (already used for badges elsewhere), and add a text label under the numeric value mapping score ranges to French labels: 1-3 "Légère", 4-6 "Modérée", 7-8 "Forte", 9-10 "Sévère".
- **`StepSymptoms.vue`**: nausée/vomissement/aura/avortée become toggle pill buttons (`<button :class="{ active: ... }">`), styled like the existing localisation buttons in `StepLocationTriggers.vue`, instead of native checkboxes.
- **`StepMedocs.vue`**: médoc rows become small cards (consistent radius/shadow with the list/dashboard card style); the "add" form keeps its fields but uses `TimeField` for heure and slightly better spacing/labels.
- **`StepLocationTriggers.vue`**: minor visual polish only (consistent spacing/active-state styling with the rest of the form) — no structural change, it already uses pill buttons.
- **`StepNotes.vue`**: restyled `<textarea>` (consistent border/focus treatment) plus a character counter below it.

## `StepRecap` rebuild

Replaces the plain `<ul>` of text lines with grouped, icon-labeled rows, consistent with the migraine card style from the List redesign (Part 2):

- 📅 Date & durée (relative date if helpful, start/end time or "en cours")
- 🎯 Intensité (colored badge, same hue formula as elsewhere, plus the French label from StepIntensity's mapping)
- 💊 Médicaments (chip-style list of `nom (heure)`, or "aucun")
- 🤢 Symptômes (nausée/vomissement/aura/avortée shown only when true, as small badges — same conditional-badge pattern as `MigraineListItem` from Part 2)
- 📍 Localisation (French label, only when set)
- 🔥 Déclencheurs (chip list, only when non-empty)
- 📝 Notes (only when non-empty)

Empty/false fields are omitted rather than shown as "non" or "aucun" text, to keep the recap focused on what's actually recorded (a presentation change only — the underlying `MigraineDraft` data is unaffected).

## Out of scope (handled in later phases of this overhaul)

- Settings/theme work (Part 4).
- README (Part 5).
- No changes to `MigraineDraft`'s shape, validation rules, or storage layer — this phase is presentation/interaction only.
