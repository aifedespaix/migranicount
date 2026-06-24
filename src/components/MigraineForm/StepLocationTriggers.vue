<template>
  <div class="step">
    <h2>Localisation & déclencheurs</h2>
    <div class="localisation-options">
      <button v-for="opt in localisations" :key="opt" type="button"
        :class="{ active: model.localisation === opt }" @click="model.localisation = opt">
        {{ labels[opt] }}
      </button>
    </div>
    <div class="tags">
      <button v-for="tag in declencheurs.tags()" :key="tag" type="button"
        :class="{ active: model.declencheurs.includes(tag) }" @click="toggleTag(tag)">
        {{ tag }}
      </button>
    </div>
    <form @submit.prevent="addCustomTag">
      <input v-model="customTag" placeholder="Ajouter un déclencheur" />
      <button type="submit">Ajouter</button>
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

const localisations = ['gauche', 'droite', 'bilaterale', 'nuque'] as const
const labels: Record<typeof localisations[number], string> = {
  gauche: 'Gauche', droite: 'Droite', bilaterale: 'Bilatérale', nuque: 'Nuque',
}

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
