<template>
  <div class="step">
    <div class="pill-group">
      <button
        type="button"
        class="pill-btn"
        :class="{ active: model.nausee }"
        @click="model.nausee = !model.nausee"
      >
        Nausée
      </button>
      <button
        type="button"
        class="pill-btn"
        :class="{ active: model.vomissement }"
        @click="model.vomissement = !model.vomissement"
      >
        Vomissement
      </button>
      <button
        type="button"
        class="pill-btn"
        :class="{ active: model.aura }"
        @click="model.aura = !model.aura"
      >
        Aura visuelle
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { MigraineDraft } from './draft'
const model = defineModel<MigraineDraft>({ required: true })
</script>
