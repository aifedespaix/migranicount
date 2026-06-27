# Design — Save debounce & UX médocs pending entry

**Date :** 2026-06-27  
**Scope :** `MigraineFormModal.vue`, `StepMedocs.vue`, nouveau composant `PendingMedocDialog.vue`

---

## Contexte

Deux problèmes indépendants résolus dans ce spec :

1. **Save debounce :** La sauvegarde vers PocketBase ne se déclenche qu'au changement de step. Si l'utilisateur modifie des valeurs sans naviguer, les changements ne sont pas pushés. Le draft localStorage est déjà temps-réel via un watcher deep ; c'est la vraie sauvegarde (`migraines.save` + PocketBase) qui est absente entre les navigations.

2. **UX médocs :** L'utilisateur peut cliquer "Suiv." avec un médicament partiellement saisi (nom rempli, pas encore cliqué "Ajouter cette prise"), perdant silencieusement la saisie.

---

## Feature 1 — Save debounce

### Comportement cible

Après 1500ms sans changement du draft, `saveIfPossible()` est appelé automatiquement. S'applique en mode création ET mode édition (`editId` défini ou non).

### Implémentation

**Fichier :** `src/components/MigraineForm/MigraineFormModal.vue`

- Ajouter un timer de debounce (`debounceTimer: ReturnType<typeof setTimeout> | null`)
- Ajouter un second `watch(draft, ..., { deep: true })` qui :
  1. Clear le timer existant
  2. Lance un nouveau `setTimeout(() => saveIfPossible(), 1500)`
- Nettoyer le timer dans `onUnmounted`
- Les saves sur navigation (`goNext`, `goPrev`, `goToStep`, `closeForm`) sont conservées pour l'immédiateté

### Condition de save

`saveIfPossible()` vérifie déjà `canSaveDraft(draft.value)` (date + heureDebut requis) avant de sauvegarder — aucun changement nécessaire là.

---

## Feature 2 — UX médocs pending entry

### Comportement cible

Quand `nomInput.trim() !== ''` dans `StepMedocs` (médicament en cours de saisie, pas encore ajouté) :

1. Le bouton "Suiv." passe en style warning (amber/orange), reste cliquable
2. Si cliqué, une dialog s'affiche avec 3 options :
   - **"Compléter la saisie"** → ferme la dialog, reste sur le step médocs
   - **"Passer sans ajouter"** → navigue au step suivant, champs perdus
   - **"Ajouter et continuer"** → ajoute la prise (`submitPending()`), puis navigue

### Architecture

**`StepMedocs.vue`**
- Expose via `defineExpose` :
  - `hasPendingEntry: ComputedRef<boolean>` — `nomInput.value.trim() !== ''`
  - `submitPending(): void` — appelle `addNew()` en interne

**`MigraineFormModal.vue`**
- Ajouter `ref="activeStepRef"` sur `<component :is="steps[stepIndex]">`
- Computed `hasPendingMedoc`: `stepIndex.value === 2 && activeStepRef.value?.hasPendingEntry`
- Bouton "Suiv." : classe conditionnelle `action-btn-next--warning` quand `hasPendingMedoc`
- `goNext()` : si `hasPendingMedoc`, afficher `showPendingMedocDialog = true` au lieu de naviguer
- Handler dialog :
  - `onStay()` → ferme dialog
  - `onSkip()` → navigue (appelle la logique de `goNext()` sans vérif pending)
  - `onAddAndContinue()` → `activeStepRef.value.submitPending()`, puis navigue

**`PendingMedocDialog.vue`** (nouveau composant léger)
- Même style que `ConfirmDialog` existant
- Props : `title`, `message`
- Emits : `stay`, `skip`, `add-and-continue`
- 3 boutons : "Compléter la saisie" (accent), "Ajouter et continuer" (accent), "Passer sans ajouter" (muted/danger)

### Style bouton "Suiv." en warning

```css
.action-btn-next--warning {
  background: var(--color-warning, #f59e0b);
  color: white;
  border-color: var(--color-warning, #f59e0b);
  opacity: 0.9;
}
```

Si `--color-warning` n'est pas défini dans le thème, fallback sur `#f59e0b` (amber-500).

---

## Ce qui ne change pas

- Le watcher `watch(draft, saveDraft, { deep: true })` existant (draft → localStorage) reste inchangé
- `canSaveDraft` reste la seule condition de save (date + heureDebut)
- Les autres steps ne sont pas affectés par la feature médocs
