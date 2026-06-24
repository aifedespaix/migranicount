<template>
  <div class="step">
    <h2>Notes</h2>
    <textarea v-model="model.notes" rows="5" placeholder="Notes libres (optionnel)"></textarea>
  </div>
</template>

<script setup lang="ts">
import type { MigraineDraft } from './draft'
const model = defineModel<MigraineDraft>({ required: true })
</script>
