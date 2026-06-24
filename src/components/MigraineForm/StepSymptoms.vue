<template>
  <div class="step">
    <h2>Symptômes</h2>
    <label><input type="checkbox" v-model="model.nausee" /> Nausée</label>
    <label><input type="checkbox" v-model="model.vomissement" /> Vomissement</label>
    <label><input type="checkbox" v-model="model.aura" /> Aura visuelle</label>
    <label v-if="model.medocs.length > 0">
      <input type="checkbox" v-model="model.avortee" /> Migraine avortée par le médicament
    </label>
  </div>
</template>

<script setup lang="ts">
import type { MigraineDraft } from './draft'
const model = defineModel<MigraineDraft>({ required: true })
</script>
