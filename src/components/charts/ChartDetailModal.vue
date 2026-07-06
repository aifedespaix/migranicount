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
          <CalendarHeatmap v-else-if="chart === 'heatmap'" :migraines="migraines" :weeks="53" />
          <TagFrequencyChart v-else-if="chart === 'triggers'" :migraines="migraines" source="declencheurs" />
          <TagFrequencyChart v-else-if="chart === 'symptoms'" :migraines="migraines" source="symptomes" />
          <ZoneChart v-else-if="chart === 'zones'" :migraines="migraines" />
          <TimePatternsChart v-else-if="chart === 'time-patterns'" :migraines="migraines" />
          <MedicationChart v-else-if="chart === 'medication'" :migraines="migraines" />
        </div>
        <div class="chart-detail-stats">
          <TreatmentLegend
            v-if="treatments?.length && hasPeriodSelector"
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
            <p v-if="topMedoc"><strong>Médicament le plus efficace :</strong> {{ topMedoc.nom }} ({{ topMedoc.pctAvortee }}% sur {{ topMedoc.total }} prise(s))</p>
            <p v-else>Aucune donnée de médicament disponible.</p>
            <p v-for="r in reliefRanking" :key="r.nom">
              <strong>{{ r.nom }} :</strong> soulagement complet {{ Math.round((r.oui / r.total) * 100) }}%,
              partiel {{ Math.round((r.partiel / r.total) * 100) }}% (n={{ r.total }} renseignées)
            </p>
          </template>
          <template v-else-if="chart === 'duration'">
            <p><strong>Durée moyenne :</strong> {{ formatDuration(dStats.avgMin) }}</p>
            <p><strong>Durée maximale :</strong> {{ formatDuration(dStats.maxMin) }}</p>
          </template>
          <template v-else-if="chart === 'heatmap'">
            <p><strong>Total crises (12 mois) :</strong> {{ frequencyStats.total }}</p>
            <p v-if="frequencyStats.busiestMonth">
              <strong>Mois le plus chargé :</strong> {{ frequencyStats.busiestMonth.month }} ({{ frequencyStats.busiestMonth.count }} crise(s))
            </p>
          </template>
          <template v-else-if="chart === 'triggers'">
            <p v-if="topTrigger"><strong>Déclencheur le plus fréquent :</strong> {{ topTrigger.tag }} ({{ topTrigger.count }} crise(s))</p>
            <p v-else>Aucun déclencheur renseigné pour l'instant.</p>
          </template>
          <template v-else-if="chart === 'symptoms'">
            <p v-if="topSymptom"><strong>Symptôme le plus fréquent :</strong> {{ topSymptom.tag }} ({{ topSymptom.count }} crise(s))</p>
            <p v-else>Aucun symptôme renseigné pour l'instant.</p>
          </template>
          <template v-else-if="chart === 'zones'">
            <p v-if="topZone"><strong>Zone dominante :</strong> {{ zoneLabels[topZone.zone] }} ({{ topZone.count }} crise(s))</p>
            <p v-else>Aucune zone renseignée pour l'instant.</p>
          </template>
          <template v-else-if="chart === 'time-patterns'">
            <p v-if="topHour"><strong>Moment le plus fréquent :</strong> {{ topHour.label }} ({{ topHour.count }} crise(s))</p>
            <p v-if="topWeekday"><strong>Jour le plus fréquent :</strong> {{ topWeekday.label }} ({{ topWeekday.count }} crise(s))</p>
          </template>
          <template v-else-if="chart === 'medication'">
            <p><strong>Mois au-dessus du seuil de vigilance (≥8 j) :</strong> {{ overuseMonths }} sur 12</p>
            <p v-if="bestDelay">
              <strong>Meilleur taux d'avortement :</strong> prise {{ bestDelay.label }} ({{ bestDelay.pct }}% sur {{ bestDelay.total }} crise(s))
            </p>
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
import CalendarHeatmap from './CalendarHeatmap.vue'
import TagFrequencyChart from './TagFrequencyChart.vue'
import ZoneChart from './ZoneChart.vue'
import TimePatternsChart from './TimePatternsChart.vue'
import MedicationChart from './MedicationChart.vue'
import {
  frequencyTrendStats, intensityStats, durationStats, efficacyRanking,
  triggerFrequency, symptomFrequency, zoneDistribution, startHourDistribution,
  weekdayDistribution, medicationDaysPerMonth, abortionRateByDelay, reliefStats,
  type Period, type Zone,
} from '../../utils/stats'
import { formatDuration } from '../../utils/date'
import type { Migraine } from '../../types/migraine'
import type { TreatmentEntry } from '../../utils/treatmentColors'

type ChartType =
  | 'frequency' | 'intensity' | 'intensity-distribution' | 'medoc-efficacy' | 'duration'
  | 'heatmap' | 'triggers' | 'symptoms' | 'zones' | 'time-patterns' | 'medication'

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
    heatmap: 'Calendrier des crises',
    triggers: 'Déclencheurs',
    symptoms: 'Symptômes',
    zones: 'Zones touchées',
    'time-patterns': 'Patterns temporels',
    medication: 'Suivi médicamenteux',
  }
  return titles[props.chart]
})

const zoneLabels: Record<Zone, string> = {
  gauche: 'Gauche',
  droite: 'Droite',
  bilaterale: 'Bilatérale',
  nuque: 'Nuque',
}

const frequencyStats = computed(() => frequencyTrendStats(props.migraines))
const iStats = computed(() => intensityStats(props.migraines))
const dStats = computed(() => durationStats(props.migraines))
const topMedoc = computed(() => efficacyRanking(props.migraines)[0] ?? null)
const reliefRanking = computed(() => reliefStats(props.migraines).slice(0, 5))
const topTrigger = computed(() => triggerFrequency(props.migraines)[0] ?? null)
const topSymptom = computed(() => symptomFrequency(props.migraines)[0] ?? null)
const topZone = computed(() => {
  const withData = zoneDistribution(props.migraines).filter((z) => z.count > 0)
  if (!withData.length) return null
  return withData.reduce((max, z) => (z.count > max.count ? z : max))
})
const topHour = computed(() => {
  const dist = startHourDistribution(props.migraines)
  const best = dist.reduce((max, b) => (b.count > max.count ? b : max))
  return best.count > 0 ? best : null
})
const topWeekday = computed(() => {
  const dist = weekdayDistribution(props.migraines)
  const best = dist.reduce((max, b) => (b.count > max.count ? b : max))
  return best.count > 0 ? best : null
})
const overuseMonths = computed(
  () => medicationDaysPerMonth(props.migraines).filter((m) => m.days >= 8).length
)
const bestDelay = computed(() => {
  const withData = abortionRateByDelay(props.migraines).filter((b) => b.pct !== null)
  if (!withData.length) return null
  return withData.reduce((max, b) => (b.pct! > max.pct! ? b : max))
})

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
