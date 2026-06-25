<template>
  <div class="step">
    <label class="field-label">
      <span>Date</span>
      <DateField v-model="model.date" />
    </label>
    <label class="field-label">
      <span>Heure de début</span>
      <TimeField v-model="model.heureDebut" />
    </label>
    <label class="field-label inline">
      <input type="checkbox" :checked="model.heureFin === null" @change="toggleEnCours" />
      Crise en cours
    </label>
    <label v-if="model.heureFin !== null" class="field-label">
      <span>Heure de fin</span>
      <TimeField v-model="heureFinModel" />
    </label>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import DateField from '../DateField.vue'
import TimeField from '../TimeField.vue'
import type { MigraineDraft } from './draft'

const model = defineModel<MigraineDraft>({ required: true })

const heureFinModel = computed({
  get: () => model.value.heureFin ?? '',
  set: (v: string) => {
    model.value.heureFin = v
  },
})

function toggleEnCours(e: Event) {
  const checked = (e.target as HTMLInputElement).checked
  model.value.heureFin = checked ? null : model.value.heureDebut
}
</script>
