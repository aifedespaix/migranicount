<template>
  <div class="chart-detail-overlay" @click.self="$emit('close')">
    <div class="chart-detail-panel" role="dialog" aria-modal="true">
      <header class="chart-detail-header">
        <h2>{{ title }}</h2>
        <button class="close-btn" @click="$emit('close')" aria-label="Fermer">×</button>
      </header>
      <div class="chart-detail-body">
        <div class="chart-detail-chart">
          <FrequencyChart v-if="chart === 'frequency'" :migraines="migraines" />
          <IntensityChart v-else-if="chart === 'intensity'" :migraines="migraines" />
        </div>
        <div class="chart-detail-stats">
          <template v-if="chart === 'frequency'">
            <p><strong>Total crises (12 mois) :</strong> {{ frequencyStats.total }}</p>
            <p v-if="frequencyStats.busiestMonth">
              <strong>Mois le plus chargé :</strong> {{ frequencyStats.busiestMonth.month }} ({{ frequencyStats.busiestMonth.count }} crise(s))
            </p>
            <p v-if="frequencyStats.trendPct !== null">
              <strong>Tendance (3 derniers mois vs 3 précédents) :</strong>
              {{ frequencyStats.trendPct > 0 ? '+' : '' }}{{ frequencyStats.trendPct }}%
            </p>
          </template>
          <template v-else-if="chart === 'intensity'">
            <p><strong>Intensité moyenne :</strong> {{ avgIntensity }}/10</p>
            <ul class="stat-list">
              <li v-for="d in intensityDist" :key="d.level">Niveau {{ d.level }} : {{ d.count }} crise(s)</li>
            </ul>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue'
import FrequencyChart from './FrequencyChart.vue'
import IntensityChart from './IntensityChart.vue'
import { frequencyTrendStats, intensityDistribution, averageIntensity } from '../../utils/stats'
import type { Migraine } from '../../types/migraine'

const props = defineProps<{ chart: 'frequency' | 'intensity'; migraines: Migraine[] }>()
const emit = defineEmits<{ close: [] }>()

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') emit('close')
}

onMounted(() => document.addEventListener('keydown', handleKeydown))
onUnmounted(() => document.removeEventListener('keydown', handleKeydown))

const title = computed(() => {
  if (props.chart === 'frequency') return 'Fréquence (12 derniers mois)'
  return 'Intensité moyenne'
})

const frequencyStats = computed(() => frequencyTrendStats(props.migraines))
const intensityDist = computed(() => intensityDistribution(props.migraines))
const avgIntensity = computed(() => averageIntensity(props.migraines))
</script>

<style scoped>
.chart-detail-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 50;
}
.chart-detail-panel {
  background: var(--color-surface);
  color: var(--color-text);
  width: min(90vw, 960px);
  height: min(85vh, 720px);
  border-radius: 0.75rem;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.chart-detail-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid var(--color-muted);
}
.close-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: var(--color-text);
}
.chart-detail-body {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  padding: 1rem 1.5rem;
  gap: 1rem;
  overflow-y: auto;
}
.chart-detail-chart {
  flex: 1;
  min-height: 280px;
}
.stat-list {
  list-style: none;
  margin: 0;
  padding: 0;
}
.stat-list li {
  padding: 0.25rem 0;
}
</style>
