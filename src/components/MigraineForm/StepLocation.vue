<template>
  <div class="step">
    <div class="pill-group">
      <button
        v-for="opt in localisations"
        :key="opt"
        type="button"
        class="pill-btn"
        :class="{ active: model.zone === opt }"
        @click="model.zone = opt"
      >
        {{ labels[opt] }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { MigraineDraft } from './draft'

const model = defineModel<MigraineDraft>({ required: true })

const localisations = ['gauche', 'droite', 'bilaterale', 'nuque'] as const
const labels: Record<typeof localisations[number], string> = {
  gauche: 'Gauche', droite: 'Droite', bilaterale: 'Bilatérale', nuque: 'Nuque',
}
</script>
