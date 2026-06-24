<template>
  <div class="step">
    <h2>Intensité</h2>
    <input type="range" min="1" max="10" v-model.number="model.intensite" class="intensity-slider" />
    <p class="intensity-value" :style="{ color: trackColor }">{{ model.intensite }} / 10 — {{ label }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { intensityColor, intensityLabel } from '../../utils/intensity'
import type { MigraineDraft } from './draft'

const model = defineModel<MigraineDraft>({ required: true })

const trackColor = computed(() => intensityColor(model.value.intensite))
const label = computed(() => intensityLabel(model.value.intensite))
</script>

<style scoped>
.intensity-slider {
  width: 100%;
  height: 0.5rem;
  border-radius: 0.25rem;
  appearance: none;
  cursor: pointer;
  background: linear-gradient(to right, hsl(50, 80%, 50%), hsl(0, 80%, 50%));
  margin: 1rem 0;
}
.intensity-slider::-webkit-slider-thumb {
  appearance: none;
  width: 1.1rem;
  height: 1.1rem;
  border-radius: 50%;
  background: var(--color-surface);
  border: 2px solid var(--color-text);
  cursor: pointer;
}
.intensity-slider::-moz-range-thumb {
  width: 1.1rem;
  height: 1.1rem;
  border-radius: 50%;
  background: var(--color-surface);
  border: 2px solid var(--color-text);
  cursor: pointer;
}
.intensity-value {
  margin-top: 0.5rem;
  font-size: 1.1rem;
  font-weight: 600;
  text-align: center;
}
</style>
