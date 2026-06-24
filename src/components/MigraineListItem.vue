<template>
  <li class="list-item" @click="$emit('click')">
    <div class="row">
      <span class="date">{{ formatRelative(migraine.date) }}</span>
      <span class="intensity" :style="{ background: intensityColor }">{{ migraine.intensite }}</span>
    </div>
    <div class="row muted">
      <span>{{ durationLabel }}</span>
      <span v-if="migraine.medocs.length">{{ migraine.medocs.map(m => m.nom).join(', ') }}</span>
      <span v-if="migraine.avortee" class="badge">Avortée</span>
    </div>
  </li>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { formatRelative, formatDuration } from '../utils/date'
import type { Migraine } from '../types/migraine'

const props = defineProps<{ migraine: Migraine }>()
defineEmits<{ click: [] }>()

const durationLabel = computed(() => {
  if (!props.migraine.heureFin) return 'en cours'
  const [h1, m1] = props.migraine.heureDebut.split(':').map(Number)
  const [h2, m2] = props.migraine.heureFin.split(':').map(Number)
  return formatDuration(h2 * 60 + m2 - (h1 * 60 + m1))
})

const intensityColor = computed(() => {
  const hue = 50 - (props.migraine.intensite / 10) * 50
  return `hsl(${hue}, 80%, 50%)`
})
</script>
