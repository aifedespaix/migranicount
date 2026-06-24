<template>
  <div class="step">
    <h2>Quand ?</h2>
    <label>Date <input type="date" v-model="model.date" /></label>
    <label>Heure de début <input type="time" v-model="model.heureDebut" /></label>
    <label>
      <input type="checkbox" :checked="model.heureFin === null" @change="toggleEnCours" />
      Crise en cours
    </label>
    <label v-if="model.heureFin !== null">
      Heure de fin <input type="time" v-model="model.heureFin" />
    </label>
  </div>
</template>

<script setup lang="ts">
import type { MigraineDraft } from './draft'

const model = defineModel<MigraineDraft>({ required: true })

function toggleEnCours(e: Event) {
  const checked = (e.target as HTMLInputElement).checked
  model.value.heureFin = checked ? null : model.value.heureDebut
}
</script>
