# Gestion des Médicaments - Heure par défaut, ajout rapide, récapitulatif, édition, capitalisation

Domaine 2 sur 6 d'un lot d'améliorations UI/UX plus large (Formulaire/Modale → **Médicaments** → Toasts → Layout Global → Graphiques → Correctif PWA). Chaque domaine a son propre spec/plan/implémentation. Domaine 1 (Formulaire/Modale) est terminé et mergé sur `master`.

## Goals

- Le champ heure d'un nouveau médicament se pré-remplit avec l'heure de début de la crise (`heureDebut`) + 15 minutes, plutôt que l'heure système actuelle.
- Les pills de médicaments favoris ("ajout rapide") utilisent cette même heure - actuellement renseignée dans le formulaire - plutôt que l'heure système actuelle au moment du clic.
- Le nom d'un médicament est automatiquement capitalisé (première lettre en majuscule, gestion correcte des accents) au moment de l'ajout.
- Dans le récapitulatif final du formulaire (`StepRecap`), cliquer sur un médicament ayant une description la déplie ; les médicaments sans description ne sont pas cliquables.
- Un bouton dans le header global de l'application permet d'éditer les descriptions des médicaments favoris, visible uniquement si au moins un favori existe.

## Heure par défaut et ajout rapide

Nouvelle fonction pure dans `src/utils/date.ts` :

```ts
export function addMinutesToHHmm(hhmm: string, minutes: number): string {
  const [h, m] = hhmm.split(":").map(Number);
  const total = (((h * 60 + m + minutes) % 1440) + 1440) % 1440;
  return `${pad(Math.floor(total / 60))}:${pad(total % 60)}`;
}
```

(Rebouclage sur 24h dans les deux sens - gère le cas où `heureDebut` est proche de minuit.)

Dans `src/components/MigraineForm/StepMedocs.vue` :

- `heureInput` s'initialise avec `ref(addMinutesToHHmm(model.value.heureDebut, 15))` au lieu de `ref(nowHHmm())`. `nowHHmm` n'est alors plus utilisé dans ce fichier et son import est retiré.
- `addFromFavori(f)` utilise `heureInput.value` au lieu de `nowHHmm()` pour le `heure` du nouveau `MedocPris` :

```ts
function addFromFavori(f: MedocFavori) {
  model.value.medocs.push({
    id: newId(),
    nom: f.nom,
    description: f.description,
    heure: heureInput.value,
  });
  favoris.registerUsage(f.nom, f.description);
}
```

- Après un ajout (pill ou formulaire manuel), `heureInput` n'est **pas** réinitialisé - `addNew()` retire la ligne `heureInput.value = nowHHmm()` qui existait précédemment, pour que la valeur reste celle que l'utilisateur a vue/ajustée, permettant d'ajouter plusieurs médicaments à la même heure sans ressaisie.

Ce comportement s'applique uniquement à la création d'une nouvelle crise. En mode édition (`props.editId` défini dans `MigraineFormModal.vue`), `model.value.heureDebut` est déjà celui de la crise existante, donc le calcul `+15min` reste cohérent sans traitement spécial.

## Capitalisation du nom des médicaments

Nouveau fichier `src/utils/text.ts` :

```ts
export function capitalizeFirstLetter(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}
```

`String.prototype.toUpperCase()` gère nativement les caractères accentués (`"élézol".charAt(0).toUpperCase()` produit `"É"`), donc aucune dépendance supplémentaire n'est nécessaire.

Dans `StepMedocs.vue`, `addNew()` applique cette fonction avant de pousser le médicament et avant l'enregistrement du favori (nécessite l'import `import { capitalizeFirstLetter } from '../../utils/text'`) :

```ts
function addNew() {
  if (!nomInput.value) return;
  const nom = capitalizeFirstLetter(nomInput.value);
  model.value.medocs.push({
    id: newId(),
    nom,
    description: descriptionInput.value || undefined,
    heure: heureInput.value,
  });
  favoris.registerUsage(nom, descriptionInput.value || undefined);
  nomInput.value = "";
  descriptionInput.value = "";
}
```

`addFromFavori(f)` n'a pas besoin de ré-appliquer la capitalisation : `f.nom` provient de la liste des favoris, qui sera elle-même capitalisée dès la prochaine saisie passant par `addNew()`. Les favoris déjà stockés en minuscule avant ce changement ne sont pas migrés rétroactivement - il n'existe pas de mécanisme de migration dans ce projet (cohérent avec l'absence de traitement de `SCHEMA_VERSION` au-delà de sa valeur constante actuelle) ; seules les nouvelles saisies sont normalisées.

## Récapitulatif - dépliage de la description au clic

Dans `src/components/MigraineForm/StepRecap.vue`, la ligne "Médicaments" remplace son `<p class="recap-value">` actuel (qui joint tous les médicaments en une seule chaîne) par une liste :

```html
<div class="recap-row" v-if="model.medocs.length">
  <span class="recap-icon">💊</span>
  <div class="recap-content">
    <p class="recap-label">Médicaments</p>
    <ul class="medoc-recap-list">
      <li v-for="m in model.medocs" :key="m.id">
        <button
          type="button"
          class="medoc-recap-item"
          :disabled="!m.description"
          @click="toggleExpanded(m.id)"
        >
          {{ m.nom }} ({{ m.heure }})
        </button>
        <p v-if="expandedId === m.id" class="medoc-recap-description">
          {{ m.description }}
        </p>
      </li>
    </ul>
  </div>
</div>
```

Script ajouté :

```ts
const expandedId = ref<string | null>(null);

function toggleExpanded(id: string) {
  expandedId.value = expandedId.value === id ? null : id;
}
```

Un médicament sans `description` a son bouton `disabled` - non cliquable, pas de curseur pointer (géré par la règle CSS existante `.action-btn:disabled` n'applique pas ici, donc une règle `.medoc-recap-item:disabled { cursor: default; opacity: 0.7; }` est ajoutée). Un seul médicament déplié à la fois : cliquer sur un autre médicament referme le précédent (le `ref` unique `expandedId` garantit ce comportement).

CSS ajoutée dans `<style scoped>` de `StepRecap.vue` :

```css
.medoc-recap-list {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}
.medoc-recap-item {
  background: none;
  border: none;
  padding: 0;
  font: inherit;
  color: var(--color-text);
  text-align: left;
  cursor: pointer;
}
.medoc-recap-item:disabled {
  cursor: default;
  opacity: 0.7;
}
.medoc-recap-description {
  margin: 0.2rem 0 0;
  font-size: 0.85rem;
  color: var(--color-muted);
}
```

## Édition globale des descriptions de médicaments (Header)

### Repository et store

Dans `src/storage/migraineRepository.ts`, nouvelle fonction :

```ts
export function updateMedocFavoriDescription(
  nom: string,
  description: string,
): void {
  const favoris = listMedocsFavoris();
  const existing = favoris.find((f) => f.nom === nom);
  if (!existing) return;
  existing.description = description || undefined;
  setJSON(MEDOCS_KEY, favoris);
}
```

Dans `src/stores/medocsFavoris.ts`, nouvelle action :

```ts
function updateDescription(nom: string, description: string): void {
  updateMedocFavoriDescription(nom, description);
  favoris.value = listMedocsFavoris();
}
```

(`updateMedocFavoriDescription` ajouté à l'import depuis `../storage/migraineRepository`, `updateDescription` ajouté au `return` du store.)

### `MedocsEditModal.vue` (nouveau composant)

`src/components/MedocsEditModal.vue` - modal-sheet centré, style cohérent avec `ConfirmDialog.vue` (`position: fixed; inset: 0` backdrop, `background: var(--color-surface)` sheet centré, `border-radius: 0.75rem`) :

```vue
<template>
  <div class="medocs-edit-backdrop" @click.self="$emit('close')">
    <div class="medocs-edit-dialog" role="dialog" aria-modal="true">
      <h3>Modifier les médicaments</h3>
      <div v-for="f in favoris.favoris" :key="f.nom" class="medoc-edit-row">
        <p class="medoc-edit-nom">{{ f.nom }}</p>
        <textarea
          v-model="descriptions[f.nom]"
          placeholder="Description (optionnel)"
          rows="2"
        />
      </div>
      <p v-if="favoris.favoris.length === 0" class="medoc-edit-empty">
        Aucun médicament enregistré.
      </p>
      <div class="medocs-edit-actions">
        <button type="button" class="btn-secondary" @click="$emit('close')">
          Annuler
        </button>
        <button type="button" class="btn-primary" @click="save">
          Enregistrer
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive } from "vue";
import { useMedocsFavorisStore } from "../stores/medocsFavoris";

const emit = defineEmits<{ close: [] }>();
const favoris = useMedocsFavorisStore();

const descriptions = reactive<Record<string, string>>(
  Object.fromEntries(favoris.favoris.map((f) => [f.nom, f.description ?? ""])),
);

function save() {
  for (const f of favoris.favoris) {
    favoris.updateDescription(f.nom, descriptions[f.nom]);
  }
  emit("close");
}
</script>

<style scoped>
.medocs-edit-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 60;
}
.medocs-edit-dialog {
  background: var(--color-surface);
  color: var(--color-text);
  border-radius: 0.75rem;
  padding: 1.5rem;
  width: min(90vw, 420px);
  max-height: 80vh;
  overflow-y: auto;
}
.medocs-edit-dialog h3 {
  margin: 0 0 1rem;
  font-size: 1.05rem;
}
.medoc-edit-row {
  margin-bottom: 0.75rem;
}
.medoc-edit-nom {
  margin: 0 0 0.3rem;
  font-weight: 600;
}
.medoc-edit-row textarea {
  width: 100%;
  padding: 0.5rem 0.75rem;
  border-radius: 0.5rem;
  border: 1px solid var(--color-muted);
  background: var(--color-bg);
  color: var(--color-text);
  font: inherit;
  resize: vertical;
  box-sizing: border-box;
}
.medoc-edit-empty {
  color: var(--color-muted);
  font-size: 0.9rem;
}
.medocs-edit-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-top: 1rem;
}
.btn-secondary {
  background: none;
  border: 1px solid var(--color-muted);
  color: var(--color-text);
  border-radius: 0.5rem;
  padding: 0.5rem 1rem;
  cursor: pointer;
}
.btn-primary {
  background: var(--color-accent);
  color: var(--color-accent-contrast);
  border: none;
  border-radius: 0.5rem;
  padding: 0.5rem 1rem;
  cursor: pointer;
}
</style>
```

`descriptions` est une copie de travail locale (objet réactif, clé = nom du favori) initialisée à l'ouverture du modal ; "Annuler" (ou clic sur le backdrop) ferme sans rien committer ; "Enregistrer" applique chaque description modifiée via `favoris.updateDescription(...)` puis ferme.

Modifier une description ici n'altère pas rétroactivement les crises déjà enregistrées : chaque `MedocPris` stocké dans une `Migraine` est un instantané indépendant de `description` au moment de l'ajout, comportement déjà existant via `registerMedocUsage` (aucun changement requis sur ce point).

### `HeaderNav.vue`

Nouveau bouton, visible uniquement si au moins un favori existe :

```html
<button
  v-if="favoris.favoris.length > 0"
  type="button"
  class="edit-medocs-btn"
  title="Modifier les médicaments"
  aria-label="Modifier les médicaments"
  @click="showMedocsEdit = true"
>
  <Pencil :size="18" />
</button>
```

```ts
import { ref } from "vue";
import { Pencil } from "lucide-vue-next";
import { useMedocsFavorisStore } from "../stores/medocsFavoris";
import MedocsEditModal from "./MedocsEditModal.vue";

const favoris = useMedocsFavorisStore();
const showMedocsEdit = ref(false);
```

Et dans le template, après la `<nav>` (ou à l'emplacement du bouton "+ Ajouter" existant) :

```html
<MedocsEditModal v-if="showMedocsEdit" @close="showMedocsEdit = false" />
```

L'état d'ouverture du modal est géré localement dans `HeaderNav.vue` - rien d'autre dans l'application ne déclenche ce modal, pas besoin de le faire remonter à `App.vue`.

## Out of scope (autres domaines du lot)

- Restylage général du Header (icônes de nav, logo, responsive) - Domaine 4.
- Toasts de confirmation - Domaine 3.
- Aucun changement à `MigraineDraft`, au schéma `Migraine`/`MedocPris`, ou à la logique de sauvegarde d'une crise au-delà de ce qui est décrit ci-dessus.
