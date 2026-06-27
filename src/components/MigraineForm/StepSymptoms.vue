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
    <form class="add-form" @submit.prevent="addCustom">
      <div class="add-input-group" :class="{ focused: isFocused }">
        <input
          v-model="customNom"
          placeholder="Ajouter un symptôme"
          class="add-input"
          @focus="isFocused = true"
          @blur="isFocused = false"
        />
        <button type="submit" class="add-btn" :disabled="!customNom.trim()">
          <Plus :size="13" />
          Ajouter
        </button>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Plus } from 'lucide-vue-next'
import { useSymptomesStore } from '../../stores/symptomes'
import type { MigraineDraft } from './draft'

const model = defineModel<MigraineDraft>({ required: true })
const symptomes = useSymptomesStore()
const customNom = ref('')
const isFocused = ref(false)

function toggleSymptome(nom: string) {
  const i = model.value.symptomes.indexOf(nom)
  if (i >= 0) model.value.symptomes.splice(i, 1)
  else model.value.symptomes.push(nom)
}

function addCustom() {
  if (!customNom.value.trim()) return
  symptomes.add(customNom.value)
  model.value.symptomes.push(customNom.value)
  customNom.value = ''
}
</script>

<style scoped>
.step {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.pill-group {
  padding-bottom: 0.75rem;
}

.add-form {
  position: sticky;
  bottom: -1.25rem;
  margin: 0 -1.5rem -1.25rem;
  padding: 0.6rem 1.5rem 1rem;
  background: var(--color-surface);
  border-top: 1px solid color-mix(in srgb, var(--color-muted) 20%, transparent);
}

.add-input-group {
  display: flex;
  align-items: center;
  border: 1.5px solid var(--color-muted);
  border-radius: 0.6rem;
  background: var(--color-bg);
  overflow: hidden;
  transition: border-color 0.15s;
}

.add-input-group.focused {
  border-color: var(--color-accent);
}

.add-input {
  flex: 1;
  padding: 0.55rem 0.75rem;
  border: none;
  background: transparent;
  color: var(--color-text);
  font-size: 0.9rem;
  min-width: 0;
}

.add-input:focus {
  outline: none;
}

.add-btn {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.55rem 0.8rem;
  background: var(--color-accent);
  color: var(--color-accent-contrast);
  border: none;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  flex-shrink: 0;
}

.add-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
</style>
