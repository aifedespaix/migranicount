<template>
  <div class="step">
    <div class="pill-group">
      <button v-for="f in favoris.favoris" :key="f.nom" type="button" class="pill-btn" @click="addFromFavori(f)">
        {{ f.nom }}
      </button>
    </div>

    <div v-for="(p, i) in model.medocs" :key="p.id" class="form-card medoc-row">
      <span class="medoc-nom">{{ p.nom }}</span>
      <TimeField v-model="model.medocs[i].heure" class="medoc-heure-inline" />
      <button type="button" class="icon-btn" @click="remove(i)" aria-label="Supprimer">✕</button>
    </div>

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

    <form class="medoc-add-form" @submit.prevent="addNew">
      <input v-model="nomInput" placeholder="Nom du médicament" required />
      <input v-model="descriptionInput" placeholder="Description (optionnel)" />
      <TimeField v-model="heureInput" />
      <button type="submit" class="pill-btn">+ Ajouter une prise</button>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
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

function addFromFavori(f: MedocFavori) {
  model.value.medocs.push({ id: newId(), nom: f.nom, description: f.description, heure: heureInput.value })
  favoris.registerUsage(f.nom, f.description)
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
.medoc-add-form {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: center;
  margin-top: 0.75rem;
}
.medoc-add-form input {
  padding: 0.5rem 0.75rem;
  border-radius: 0.5rem;
  border: 1px solid var(--color-muted);
  background: var(--color-surface);
  color: var(--color-text);
  flex: 1;
  min-width: 140px;
}
.icon-btn {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--color-danger);
  font-size: 1rem;
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
