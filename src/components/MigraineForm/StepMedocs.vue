<template>
  <div class="step">
    <!-- Raccourcis favoris -->
    <div v-if="favoris.favoris.length > 0" class="favorites-section">
      <p class="field-label">Raccourcis</p>
      <div class="pill-group">
        <button
          v-for="f in favoris.favoris"
          :key="f.nom"
          type="button"
          class="pill-btn"
          :class="{ active: nomInput === f.nom }"
          @click="prefillFromFavori(f)"
        >
          {{ f.nom }}
        </button>
      </div>
    </div>

    <!-- Formulaire d'ajout -->
    <form class="medoc-add-form" @submit.prevent="addNew">
      <div class="field-group">
        <label class="field-label" for="medoc-nom">Médicament</label>
        <input
          id="medoc-nom"
          v-model="nomInput"
          placeholder="Nom du médicament"
          required
          class="form-input"
        />
      </div>
      <div class="field-group">
        <label class="field-label" for="medoc-desc">Description</label>
        <input
          id="medoc-desc"
          v-model="descriptionInput"
          placeholder="Dosage, forme... (optionnel)"
          class="form-input"
        />
      </div>
      <div class="field-group">
        <label class="field-label">Heure de prise</label>
        <TimeField v-model="heureInput" />
      </div>
      <button type="submit" class="pill-btn pill-btn--primary">
        <Plus :size="15" />
        Ajouter cette prise
      </button>
    </form>

    <!-- Prises enregistrées -->
    <div v-if="model.medocs.length > 0" class="prises-section">
      <p class="field-label">Prises enregistrées</p>
      <div v-for="(p, i) in model.medocs" :key="p.id" class="form-card medoc-row">
        <span class="medoc-nom">{{ p.nom }}</span>
        <TimeField v-model="model.medocs[i].heure" class="medoc-heure-inline" />
        <button type="button" class="icon-btn" @click="remove(i)" aria-label="Supprimer">
          <X :size="14" />
        </button>
      </div>
    </div>

    <!-- Section avortée -->
    <div v-if="model.medocs.length > 0" class="avortee-section">
      <p class="field-label">Migraine avortée par ce traitement ?</p>
      <div class="pill-group">
        <button
          type="button"
          class="pill-btn"
          :class="{ active: model.avortee === true }"
          @click="model.avortee = true"
        >Oui</button>
        <button
          type="button"
          class="pill-btn"
          :class="{ active: model.avortee === 'probable' }"
          @click="model.avortee = 'probable'"
        >Probable</button>
        <button
          type="button"
          class="pill-btn"
          :class="{ active: model.avortee === false }"
          @click="model.avortee = false"
        >Non</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Plus, X } from 'lucide-vue-next'
import { newId } from '../../utils/uuid'
import { addMinutesToHHmm } from '../../utils/date'
import { capitalizeFirstLetter } from '../../utils/text'
import { useMedocsFavorisStore } from '../../stores/medocsFavoris'
import TimeField from '../TimeField.vue'
import type { MigraineDraft } from './draft'
import type { MedocFavori } from '../../types/migraine'

const model = defineModel<MigraineDraft>({ required: true })
const favoris = useMedocsFavorisStore()

const nomInput = ref('')
const descriptionInput = ref('')
const heureInput = ref(addMinutesToHHmm(model.value.heureDebut, 15))

function prefillFromFavori(f: MedocFavori) {
  nomInput.value = f.nom
  descriptionInput.value = f.description ?? ''
}

function addNew() {
  if (!nomInput.value) return
  const nom = capitalizeFirstLetter(nomInput.value)
  model.value.medocs.push({ id: newId(), nom, description: descriptionInput.value || undefined, heure: heureInput.value })
  favoris.registerUsage(nom, descriptionInput.value || undefined)
  nomInput.value = ''
  descriptionInput.value = ''
}

function remove(index: number) {
  model.value.medocs.splice(index, 1)
}
</script>

<style scoped>
.favorites-section {
  margin-bottom: 1rem;
}
.field-label {
  font-size: 0.75rem;
  color: var(--color-muted);
  font-weight: 500;
  margin-bottom: 0.25rem;
  display: block;
}
.medoc-add-form {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  padding: 0.75rem;
  background: var(--color-bg);
  border-radius: 0.5rem;
  margin-bottom: 0.75rem;
}
.field-group {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}
.form-input {
  padding: 0.5rem 0.75rem;
  border-radius: 0.5rem;
  border: 1px solid var(--color-muted);
  background: var(--color-surface);
  color: var(--color-text);
  font-size: 0.9rem;
}
.pill-btn--primary {
  background: var(--color-accent);
  color: var(--color-accent-contrast);
  border-color: var(--color-accent);
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  align-self: flex-start;
}
.prises-section {
  margin-top: 0.5rem;
  border-top: 1px solid var(--color-bg);
  padding-top: 0.75rem;
}
.icon-btn {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--color-danger);
  display: flex;
  align-items: center;
}
.medoc-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.medoc-nom {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.9rem;
}
.medoc-heure-inline {
  flex-shrink: 0;
}
.avortee-section {
  margin-top: 0.75rem;
  padding-top: 0.75rem;
  border-top: 1px solid var(--color-bg);
}
</style>
