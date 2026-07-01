# Formulaire & Modale de Saisie - Stepper, Ergonomie, Boutons, Swipe

Domaine 1 sur 6 d'un lot d'améliorations UI/UX plus large (Formulaire/Modale → Médicaments → Toasts → Layout Global → Graphiques → Correctif PWA). Chaque domaine a son propre spec/plan/implémentation.

## Goals

- Séparer "Localisation" et "Déclencheurs" en deux étapes distinctes du stepper.
- Sur mobile, la modale occupe au moins les 2/3 de l'écran et le footer d'actions reste ancré en bas sans saut de layout.
- Boutons d'action stylisés et cohérents : Enregistrer (vert, désactivé sauf champs obligatoires remplis), Suivant (bleu plein), Précédent (bleu ghost) - chacun avec une icône Lucide.
- Navigation par swipe gauche/droite entre étapes, avec animation de transition qui indique le sens de navigation, cohérente avec la navigation par boutons.

## Dépendances ajoutées

- `lucide-vue-next` - icônes (`Save`, `ArrowRight`, `ArrowLeft`).
- `@vueuse/core` - composable `useSwipe`.

## Séparation du stepper

`StepLocationTriggers.vue` est remplacé par deux composants :

- **`StepLocation.vue`** - uniquement le pill-group de localisation (`gauche`/`droite`/`bilaterale`/`nuque`), repris tel quel depuis la partie haute de l'ancien composant.
- **`StepTriggers.vue`** - le pill-group de déclencheurs existants + le formulaire d'ajout de déclencheur personnalisé, repris tel quel depuis la partie basse de l'ancien composant.

Dans `MigraineFormModal.vue`, le tableau `steps` passe de 7 à 8 entrées :

```
StepWhen, StepIntensity, StepMedocs, StepSymptoms, StepLocation, StepTriggers, StepNotes, StepRecap
```

Et `stepTitles` correspondant :

```
['Quand ?', 'Intensité', 'Médicaments', 'Symptômes', 'Localisation', 'Déclencheurs', 'Notes', 'Récapitulatif']
```

`StepLocationTriggers.vue` est supprimé. Aucun changement à `MigraineDraft` ni au modèle de données - uniquement la présentation/navigation.

## Ergonomie de la modale (mobile)

Dans `MigraineFormModal.vue` (`<style scoped>`), la règle mobile (par défaut, hors media query `min-width: 1024px`) sur `.modal-sheet` gagne `min-height: 66.6667vh` en plus du `max-height: 90vh` existant :

```css
.modal-sheet {
  min-height: 66.6667vh;
  max-height: 90vh;
  /* display: flex; flex-direction: column; - déjà présent */
}
```

Le footer (`.modal-actions`) n'a pas besoin de `position: fixed` ou `sticky` : il est déjà hors du conteneur scrollable (`.modal-body` a `flex: 1; overflow-y: auto`), donc dans un sheet flex-column, il reste mécaniquement ancré en bas quelle que soit la hauteur du contenu de l'étape - `min-height` garantit juste que le sheet (et donc le footer) ne se contracte pas sous les 2/3 de l'écran sur une étape courte (ex: StepLocation).

La règle desktop (`@media (min-width: 1024px)`) garde son `width: 480px; max-height: 85vh` sans `min-height` (pas de contrainte 2/3 écran sur desktop, qui n'est pas concerné par la demande).

## Boutons d'action

Nouvelles variables CSS dans `theme.css`, ajoutées aux 3 blocs de thème (`:root`, `[data-theme="dark"]`, `[data-theme="migraine"]`), avec des teintes cohérentes par palette :

```css
:root {
  /* ...existant... */
  --color-success: #2f9e58;
  --color-success-contrast: #ffffff;
  --color-info: #3b82f6;
  --color-info-contrast: #ffffff;
}
[data-theme="dark"] {
  --color-success: #4ade80;
  --color-success-contrast: #1c1726;
  --color-info: #60a5fa;
  --color-info-contrast: #1c1726;
}
[data-theme="migraine"] {
  --color-success: #7c9a5e;
  --color-success-contrast: #1c2117;
  --color-info: #6f8fae;
  --color-info-contrast: #1c2117;
}
```

Dans `MigraineFormModal.vue`, les trois boutons du footer deviennent :

- **Enregistrer** (`action-btn-save`) : fond `--color-success`, texte `--color-success-contrast`, icône `Save` (lucide) avant le texte. `disabled` tant que `stepIndex !== steps.length - 1` OU que `!canSave` (voir validation ci-dessous). Reste visible/présent à toutes les étapes (juste désactivé), pas de layout shift.
- **Suivant** (`action-btn-next`) : fond `--color-info`, texte `--color-info-contrast`, icône `ArrowRight` (lucide) après le texte. `disabled` quand `stepIndex === steps.length - 1` (comportement actuel conservé).
- **Précédent** (`action-btn-prev`) : style "ghost" - fond transparent, `border: 1px solid var(--color-info)`, `color: var(--color-info)`, icône `ArrowLeft` (lucide) avant le texte. `disabled` quand `stepIndex === 0` (comportement actuel conservé).

### Validation "champs obligatoires"

Nouveau computed `canSave` dans `MigraineFormModal.vue` :

```ts
const canSave = computed(
  () => Boolean(draft.value.date) && Boolean(draft.value.heureDebut),
);
```

Le bouton Enregistrer est `:disabled="stepIndex !== steps.length - 1 || !canSave"`. Pas de changement à `StepWhen.vue` ni à `draft.ts` - `date`/`heureDebut` ont déjà des valeurs par défaut non vides (`todayISO()`/`nowHHmm()`), donc en pratique le bouton n'est désactivé que si l'utilisateur vide manuellement ces champs.

## Navigation par swipe

`useSwipe` (de `@vueuse/core`) est appliqué sur la ref du conteneur `.modal-body` dans `MigraineFormModal.vue` :

```ts
import { useSwipe } from "@vueuse/core";

const modalBodyRef = ref<HTMLElement | null>(null);
const transitionName = ref<"slide-next" | "slide-prev">("slide-next");

function goNext() {
  if (stepIndex.value >= steps.length - 1) return;
  transitionName.value = "slide-next";
  stepIndex.value++;
}
function goPrev() {
  if (stepIndex.value <= 0) return;
  transitionName.value = "slide-prev";
  stepIndex.value--;
}

useSwipe(modalBodyRef, {
  onSwipeEnd(_e, direction) {
    if (direction === "left") goNext();
    else if (direction === "right") goPrev();
  },
});
```

Les boutons Suivant/Précédent appellent désormais `goNext()`/`goPrev()` au lieu d'incrémenter/décrémenter `stepIndex` directement, pour que `transitionName` soit cohérent quel que soit le déclencheur (bouton ou swipe).

`.modal-body` reçoit `ref="modalBodyRef"`.

### Animation de transition

`<component :is="steps[stepIndex]" v-model="draft" />` est enveloppé dans `<Transition :name="transitionName">` avec un `:key="stepIndex"` pour forcer le remplacement du composant à chaque changement d'étape.

CSS des transitions (dans `MigraineFormModal.vue`) :

```css
.slide-next-enter-active,
.slide-next-leave-active,
.slide-prev-enter-active,
.slide-prev-leave-active {
  transition:
    transform 0.22s ease,
    opacity 0.22s ease;
  position: absolute;
  width: 100%;
}
.slide-next-enter-from {
  transform: translateX(100%);
  opacity: 0;
}
.slide-next-leave-to {
  transform: translateX(-100%);
  opacity: 0;
}
.slide-prev-enter-from {
  transform: translateX(-100%);
  opacity: 0;
}
.slide-prev-leave-to {
  transform: translateX(100%);
  opacity: 0;
}
```

`.modal-body` doit avoir `position: relative; overflow: hidden` pendant la transition pour contenir les éléments positionnés en absolu (déjà `overflow-y: auto` - on garde le scroll vertical une fois la transition terminée, l'`overflow: hidden` horizontal additionnel n'affecte que le débordement latéral pendant l'anim).

Le thème `[data-theme="migraine"]` désactive déjà toutes les transitions/animations globalement (`* { transition: none !important }`), donc la transition de slide est automatiquement neutralisée dans ce thème - pas de traitement spécial à ajouter.

## Out of scope (autres domaines du lot)

- Gestion des médicaments, toasts, layout global (header/nav/swipe inter-pages), graphiques, correctif PWA - domaines 2 à 6, traités séparément.
- Aucun changement à la logique de sauvegarde (`submit()`), au brouillon (`draft.ts`), ou au store `migraines`.
