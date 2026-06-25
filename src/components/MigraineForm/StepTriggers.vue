<template>
  <div class="step">
    <div class="pill-group">
      <button
        v-for="tag in declencheurs.tags()"
        :key="tag"
        type="button"
        class="pill-btn"
        :class="{ active: model.declencheurs.includes(tag) }"
        @click="toggleTag(tag)"
      >
        {{ tag }}
      </button>
    </div>
    <form class="trigger-add-form" @submit.prevent="addCustomTag">
      <input v-model="customTag" placeholder="Ajouter un déclencheur" />
      <button type="submit" class="pill-btn">Ajouter</button>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useDeclencheursStore } from '../../stores/declencheurs'
import type { MigraineDraft } from './draft'

const model = defineModel<MigraineDraft>({ required: true })
const declencheurs = useDeclencheursStore()
const customTag = ref('')

function toggleTag(tag: string) {
  const i = model.value.declencheurs.indexOf(tag)
  if (i >= 0) model.value.declencheurs.splice(i, 1)
  else model.value.declencheurs.push(tag)
}

function addCustomTag() {
  if (!customTag.value) return
  declencheurs.register(customTag.value)
  model.value.declencheurs.push(customTag.value)
  customTag.value = ''
}
</script>

<style scoped>
.trigger-add-form {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.5rem;
}
.trigger-add-form input {
  padding: 0.5rem 0.75rem;
  border-radius: 0.5rem;
  border: 1px solid var(--color-muted);
  background: var(--color-surface);
  color: var(--color-text);
  flex: 1;
}
</style>
