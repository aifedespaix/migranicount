<template>
  <div class="step">
    <div class="pill-group">
      <button
        v-for="nom in symptomes.symptomes()"
        :key="nom"
        type="button"
        class="pill-btn"
        :class="{ active: model.symptomes.includes(nom) }"
        @click="toggleSymptome(nom)"
      >
        {{ nom }}
      </button>
    </div>
    <form class="symptome-add-form" @submit.prevent="addCustom">
      <input v-model="customNom" placeholder="Ajouter un symptôme" />
      <button type="submit" class="pill-btn">Ajouter</button>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useSymptomesStore } from '../../stores/symptomes'
import type { MigraineDraft } from './draft'

const model = defineModel<MigraineDraft>({ required: true })
const symptomes = useSymptomesStore()
const customNom = ref('')

function toggleSymptome(nom: string) {
  const i = model.value.symptomes.indexOf(nom)
  if (i >= 0) model.value.symptomes.splice(i, 1)
  else model.value.symptomes.push(nom)
}

function addCustom() {
  if (!customNom.value) return
  symptomes.add(customNom.value)
  model.value.symptomes.push(customNom.value)
  customNom.value = ''
}
</script>

<style scoped>
.symptome-add-form {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.5rem;
}
.symptome-add-form input {
  padding: 0.5rem 0.75rem;
  border-radius: 0.5rem;
  border: 1px solid var(--color-muted);
  background: var(--color-surface);
  color: var(--color-text);
  flex: 1;
}
</style>
