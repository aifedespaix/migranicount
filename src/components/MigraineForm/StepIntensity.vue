<template>
  <div class="step">
    <h2>Intensité</h2>
    <input type="range" min="1" max="10" v-model.number="model.intensite" :style="{ accentColor: trackColor }" />
    <p class="intensity-value">{{ model.intensite }} / 10</p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { MigraineDraft } from './draft'

const model = defineModel<MigraineDraft>({ required: true })

const trackColor = computed(() => {
  const hue = 50 - (model.value.intensite / 10) * 50
  return `hsl(${hue}, 80%, 50%)`
})
</script>
