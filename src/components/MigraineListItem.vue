<template>
  <li class="migraine-card" @click="$emit('click')">
    <div class="row header-row">
      <span class="date">{{ formatRelative(migraine.date) }}</span>
      <span class="intensity" :style="{ background: intensityColor }">{{ migraine.intensite }}</span>
    </div>
    <div class="row detail-row muted">
      <span>{{ durationLabel }}</span>
      <span v-if="migraine.medocs.length">{{ migraine.medocs.map(m => m.nom).join(', ') }}</span>
    </div>
    <div class="row badges-row" v-if="hasBadges">
      <span v-if="migraine.avortee" class="badge">Avortée</span>
      <span v-if="migraine.nausee" class="badge subtle">🤢 Nausée</span>
      <span v-if="migraine.vomissement" class="badge subtle">🤮 Vomissement</span>
      <span v-if="migraine.aura" class="badge subtle">✨ Aura</span>
      <span v-if="localisationLabel" class="badge subtle">📍 {{ localisationLabel }}</span>
    </div>
  </li>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { formatRelative, formatDuration } from '../utils/date'
import type { Migraine } from '../types/migraine'

const props = defineProps<{ migraine: Migraine }>()
defineEmits<{ click: [] }>()

const LOCALISATION_LABELS: Record<NonNullable<Migraine['localisation']>, string> = {
  gauche: 'Gauche',
  droite: 'Droite',
  bilaterale: 'Bilatérale',
  nuque: 'Nuque',
}

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

const localisationLabel = computed(() =>
  props.migraine.localisation ? LOCALISATION_LABELS[props.migraine.localisation] : null
)

const hasBadges = computed(
  () =>
    props.migraine.avortee ||
    props.migraine.nausee ||
    props.migraine.vomissement ||
    props.migraine.aura ||
    localisationLabel.value !== null
)
</script>

<style scoped>
.migraine-card {
  background: var(--color-surface);
  border: 1px solid transparent;
  border-radius: 0.75rem;
  padding: 1rem;
  cursor: pointer;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
  transition: border-color 0.15s ease, transform 0.15s ease;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.migraine-card:hover {
  border-color: var(--color-accent);
  transform: translateY(-2px);
}
.row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}
.header-row .date {
  font-weight: 600;
}
.intensity {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1.75rem;
  height: 1.75rem;
  border-radius: 50%;
  color: #1c1726;
  font-weight: 700;
  font-size: 0.85rem;
}
.detail-row {
  font-size: 0.9rem;
  justify-content: flex-start;
  gap: 1rem;
}
.muted {
  color: var(--color-muted);
}
.badges-row {
  justify-content: flex-start;
  flex-wrap: wrap;
  gap: 0.4rem;
}
.badge {
  font-size: 0.75rem;
  padding: 0.2rem 0.5rem;
  border-radius: 1rem;
  background: var(--color-danger);
  color: white;
}
.badge.subtle {
  background: var(--color-bg);
  color: var(--color-muted);
  border: 1px solid var(--color-muted);
}
</style>
