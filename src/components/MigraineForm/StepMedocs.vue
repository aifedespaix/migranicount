<template>
  <div class="step">
    <h2>Médicaments</h2>
    <div class="favoris">
      <button v-for="f in favoris.favoris" :key="f.nom" type="button" @click="addFromFavori(f)">
        {{ f.nom }}
      </button>
    </div>
    <div v-for="(p, i) in model.medocs" :key="p.id" class="medoc-row">
      <span>{{ p.nom }} — {{ p.heure }}</span>
      <button type="button" @click="remove(i)">Supprimer</button>
    </div>
    <form @submit.prevent="addNew">
      <input v-model="nomInput" placeholder="Nom du médicament" required />
      <input v-model="descriptionInput" placeholder="Description (optionnel)" />
      <input type="time" v-model="heureInput" required />
      <button type="submit">+ Ajouter une prise</button>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { newId } from '../../utils/uuid'
import { nowHHmm } from '../../utils/date'
import { useMedocsFavorisStore } from '../../stores/medocsFavoris'
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
