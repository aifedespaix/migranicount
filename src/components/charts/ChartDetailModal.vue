<template>
  <BaseModal :z-index="50" @close="$emit('close')">
    <div class="chart-detail-panel" role="dialog" aria-modal="true">
      <header class="chart-detail-header">
        <h2>{{ title }}</h2>
      </header>

      <div v-if="hasPeriodSelector" class="period-selector">
        <button
          v-for="p in (['day', 'week', 'month'] as const)"
          :key="p"
          type="button"
          :class="['period-btn', { active: localPeriod === p }]"
          @click="localPeriod = p"
        >{{ periodLabels[p] }}</button>
      </div>

      <div class="chart-detail-body">
        <div class="chart-detail-chart">
          <FrequencyChart v-if="chart === 'frequency'" :migraines="migraines" :period="localPeriod" :treatments="activeTreatments" />
          <IntensityChart v-else-if="chart === 'intensity'" :migraines="migraines" :period="localPeriod" :treatments="activeTreatments" />
          <IntensityDistributionChart v-else-if="chart === 'intensity-distribution'" :migraines="migraines" />
          <MedocEfficacyChart v-else-if="chart === 'medoc-efficacy'" :migraines="migraines" />
          <DurationChart v-else-if="chart === 'duration'" :migraines="migraines" />
        </div>
        <div class="chart-detail-stats">
          <TreatmentLegend
            v-if="treatments?.length"
            :entries="treatments"
            :selected="localSelected"
            @update:selected="onSelectedChange"
          />
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
            <p><strong>Intensité moyenne :</strong> {{ iStats.avg }}/10</p>
            <p><strong>Maximum :</strong> {{ iStats.max }}/10</p>
            <p><strong>Crises sévères (≥7) :</strong> {{ iStats.severeCount }}</p>
          </template>
          <template v-else-if="chart === 'intensity-distribution'">
            <p><strong>Intensité moyenne :</strong> {{ iStats.avg }}/10</p>
            <p><strong>Crises sévères (≥7) :</strong> {{ iStats.severeCount }}</p>
          </template>
          <template v-else-if="chart === 'medoc-efficacy'">
            <p v-if="topMedoc"><strong>Médicament le plus efficace :</strong> {{ topMedoc.nom }} ({{ topMedoc.pctAvortee }}%)</p>
            <p v-else>Aucune donnée de médicament disponible.</p>
          </template>
          <template v-else-if="chart === 'duration'">
            <p><strong>Durée moyenne :</strong> {{ formatDuration(dStats.avgMin) }}</p>
            <p><strong>Durée maximale :</strong> {{ formatDuration(dStats.maxMin) }}</p>
          </template>
        </div>
      </div>
    </div>
  </BaseModal>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import BaseModal from '../BaseModal.vue'
import TreatmentLegend from './TreatmentLegend.vue'
import FrequencyChart from './FrequencyChart.vue'
import IntensityChart from './IntensityChart.vue'
import IntensityDistributionChart from './IntensityDistributionChart.vue'
import MedocEfficacyChart from './MedocEfficacyChart.vue'
import DurationChart from './DurationChart.vue'
import { frequencyTrendStats, intensityStats, durationStats, efficacyRanking, type Period } from '../../utils/stats'
import { formatDuration } from '../../utils/date'
import type { Migraine } from '../../types/migraine'
import type { TreatmentEntry } from '../../utils/treatmentColors'

type ChartType = 'frequency' | 'intensity' | 'intensity-distribution' | 'medoc-efficacy' | 'duration'

const props = defineProps<{
  chart: ChartType
  migraines: Migraine[]
  initialPeriod?: Period
  treatments?: TreatmentEntry[]
  selectedTreatments?: string[]
}>()
const emit = defineEmits<{ close: []; 'update:selectedTreatments': [string[]] }>()

const localPeriod = ref<Period>(props.initialPeriod ?? 'month')
const localSelected = ref<string[]>(props.selectedTreatments ?? props.treatments?.map((t) => t.name) ?? [])
watch(() => props.selectedTreatments, (v) => { if (v) localSelected.value = v })
function onSelectedChange(v: string[]) {
  localSelected.value = v
  emit('update:selectedTreatments', v)
}
const activeTreatments = computed(() =>
  props.treatments?.filter((t) => localSelected.value.includes(t.name)) ?? []
)
const hasPeriodSelector = computed(() => props.chart === 'frequency' || props.chart === 'intensity')

const periodLabels: Record<Period, string> = { day: 'Jour', week: 'Semaine', month: 'Mois' }

const title = computed(() => {
  const titles: Record<ChartType, string> = {
    frequency: 'Fréquence des crises',
    intensity: 'Intensité moyenne',
    'intensity-distribution': 'Distribution des intensités',
    'medoc-efficacy': 'Efficacité médicaments',
    duration: 'Durée des crises',
  }
  return titles[props.chart]
})

const frequencyStats = computed(() => frequencyTrendStats(props.migraines))
const iStats = computed(() => intensityStats(props.migraines))
const dStats = computed(() => durationStats(props.migraines))
const topMedoc = computed(() => efficacyRanking(props.migraines)[0] ?? null)

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') emit('close')
}

onMounted(() => document.addEventListener('keydown', handleKeydown))
onUnmounted(() => document.removeEventListener('keydown', handleKeydown))
</script>

<style scoped>
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
  flex-shrink: 0;
}
.period-selector {
  display: flex;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem 0;
  flex-shrink: 0;
}
.period-btn {
  padding: 0.3rem 0.75rem;
  border-radius: 1rem;
  border: 1px solid var(--color-muted);
  background: none;
  color: var(--color-muted);
  font: inherit;
  font-size: 0.82rem;
  cursor: pointer;
}
.period-btn.active {
  background: var(--color-accent);
  color: var(--color-accent-contrast);
  border-color: var(--color-accent);
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
  min-height: 240px;
}
</style>
