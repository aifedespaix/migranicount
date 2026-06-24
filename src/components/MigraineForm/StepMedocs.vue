<template>
  <div class="step">
    <h2>Médicaments</h2>
    <div class="pill-group">
      <button v-for="f in favoris.favoris" :key="f.nom" type="button" class="pill-btn" @click="addFromFavori(f)">
        {{ f.nom }}
      </button>
    </div>
    <div v-for="(p, i) in model.medocs" :key="p.id" class="form-card">
      <span>{{ p.nom }} — {{ p.heure }}</span>
      <button type="button" class="icon-btn" @click="remove(i)" aria-label="Supprimer">✕</button>
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
import { nowHHmm } from '../../utils/date'
import { useMedocsFavorisStore } from '../../stores/medocsFavoris'
import TimeField from '../TimeField.vue'
import type { MigraineDraft } from './draft'
import type { MedocFavori } from '../../types/migraine'

const model = defineModel<MigraineDraft>({ required: true })
const favoris = useMedocsFavorisStore()

const nomInput = ref('')
const descriptionInput = ref('')
const heureInput = ref(nowHHmm())

function addFromFavori(f: MedocFavori) {
  model.value.medocs.push({ id: newId(), nom: f.nom, description: f.description, heure: nowHHmm() })
  favoris.registerUsage(f.nom, f.description)
}

function addNew() {
  if (!nomInput.value) return
  model.value.medocs.push({ id: newId(), nom: nomInput.value, description: descriptionInput.value || undefined, heure: heureInput.value })
  favoris.registerUsage(nomInput.value, descriptionInput.value || undefined)
  nomInput.value = ''
  descriptionInput.value = ''
  heureInput.value = nowHHmm()
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
</style>
