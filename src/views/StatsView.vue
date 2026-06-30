<template>
  <div class="stats-view">
    <div v-if="migraines.migraines.length === 0" class="empty-state">
      <h1>Migracount</h1>
      <p>
        Migracount t'aide à suivre tes crises de migraine au fil du temps : intensité, durée,
        traitements pris et leur efficacité. Plus tu enregistres de crises, plus les statistiques
        deviennent utiles pour repérer des tendances.
      </p>
      <button class="cta-btn" @click="emptyStateFormOpen = true">Répertorier une migraine</button>
    </div>

    <template v-else>
      <div class="summary-cards">
        <div class="card">
          <strong>Dernière crise</strong>
          <span>{{ lastMigraine ? formatRelative(lastMigraine.date) : 'aucune' }}</span>
        </div>
        <div class="card">
          <strong>Durée moyenne</strong>
          <span>{{ formatDuration(avgDur.avgMin) }}</span>
        </div>
        <div class="card">
          <strong>Ce mois-ci</strong>
          <span>{{ thisMonthCount }} crise(s)</span>
        </div>
      </div>

      <div class="period-selector">
        <button
          v-for="p in (['day', 'week', 'month'] as const)"
          :key="p"
          type="button"
          :class="['period-btn', { active: period === p }]"
          @click="period = p"
        >{{ periodLabels[p] }}</button>
      </div>

      <button class="chart-card" @click="openDetail('frequency')">
        <h2>Fréquence des crises</h2>
        <div class="chart-wrap">
          <FrequencyChart :migraines="migraines.migraines" :period="period" :treatment-timeline="treatmentTimeline" />
        </div>
        <div v-if="treatmentTimeline.length" class="treatment-legend">
          <span class="treatment-swatch"></span>
          <span class="treatment-label">Traitement de fond actif</span>
        </div>
      </button>

      <div class="stats-buttons">
        <StatsButton title="Intensité" :facts="intensityFacts" @click="openDetail('intensity')" />
        <StatsButton title="Distribution des intensités" :facts="distributionFacts" @click="openDetail('intensity-distribution')" />
        <StatsButton title="Efficacité médicaments" :facts="efficacyFacts" @click="openDetail('medoc-efficacy')" />
        <StatsButton title="Durée des crises" :facts="durationFacts" @click="openDetail('duration')" />
        <StatsButton
          v-if="hasTraitementData"
          title="Traitement de fond"
          :facts="traitementFacts"
          @click="traitementEfficaciteOpen = true"
        />
      </div>
    </template>

    <ChartDetailModal
      v-if="activeDetail"
      :chart="activeDetail"
      :migraines="migraines.migraines"
      :initial-period="period"
      :treatment-timeline="treatmentTimeline"
      @close="activeDetail = null"
    />

    <TraitementEfficaciteModal
      v-if="traitementEfficaciteOpen"
      :migraines="migraines.migraines"
      :medocs="medocsFavoris.favoris"
      @close="traitementEfficaciteOpen = false"
    />

    <MigraineFormModal
      v-if="emptyStateFormOpen"
      @close="emptyStateFormOpen = false"
      @saved="onEmptyStateSaved"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useMigrainesStore } from '../stores/migraines'
import { useMedocsFavorisStore } from '../stores/medocsFavoris'
import { formatRelative, formatDuration, todayISO } from '../utils/date'
import {
  defaultPeriod, type Period,
  intensityStats, durationStats, efficacyRanking, intensityDistribution,
  buildActivePeriodTimeline, treatmentEfficacyAnalysis,
} from '../utils/stats'
import FrequencyChart from '../components/charts/FrequencyChart.vue'
import StatsButton from '../components/charts/StatsButton.vue'
import ChartDetailModal from '../components/charts/ChartDetailModal.vue'
import MigraineFormModal from '../components/MigraineForm/MigraineFormModal.vue'
import TraitementEfficaciteModal from '../components/TraitementEfficaciteModal.vue'
import { useToastStore } from '../stores/toast'

type ChartType = 'frequency' | 'intensity' | 'intensity-distribution' | 'medoc-efficacy' | 'duration'

const migraines = useMigrainesStore()
const medocsFavoris = useMedocsFavorisStore()
const toastStore = useToastStore()
const period = ref<Period>(defaultPeriod(migraines.migraines))
const activeDetail = ref<ChartType | null>(null)
const emptyStateFormOpen = ref(false)
const traitementEfficaciteOpen = ref(false)

const periodLabels: Record<Period, string> = { day: 'Jour', week: 'Semaine', month: 'Mois' }

function openDetail(chart: ChartType) {
  activeDetail.value = chart
}

function onEmptyStateSaved() {
  emptyStateFormOpen.value = false
  toastStore.add({ message: 'Migraine enregistrée !', type: 'success' })
}

const lastMigraine = computed(() =>
  [...migraines.migraines].sort((a, b) => (a.date < b.date ? 1 : -1))[0]
)

const thisMonthCount = computed(() =>
  migraines.migraines.filter((m) => m.date.slice(0, 7) === todayISO().slice(0, 7)).length
)

const iStats = computed(() => intensityStats(migraines.migraines))
const avgDur = computed(() => durationStats(migraines.migraines))

const intensityFacts = computed(() => [
  { value: `${iStats.value.avg}/10`, label: 'intensité moy.' },
  { value: `${iStats.value.max}/10`, label: 'max' },
  { value: String(iStats.value.severeCount), label: 'crises sévères (≥7)' },
])

const distributionFacts = computed(() => {
  const dist = intensityDistribution(migraines.migraines)
  const dominant = dist.reduce((max, d) => d.count > max.count ? d : max, { level: 0, count: 0 })
  return [
    { value: dominant.level ? `${dominant.level}/10` : '—', label: 'intensité dominante' },
    { value: String(iStats.value.severeCount), label: 'crises sévères (≥7)' },
  ]
})

const efficacyFacts = computed(() => {
  const best = efficacyRanking(migraines.migraines)[0]
  return [
    { value: best ? best.nom : '—', label: 'plus efficace' },
    { value: best ? `${best.pctAvortee}%` : '—', label: 'taux d\'avortivité' },
  ]
})

const durationFacts = computed(() => [
  { value: avgDur.value.avgMin > 0 ? formatDuration(avgDur.value.avgMin) : '—', label: 'durée moy.' },
  { value: avgDur.value.maxMin > 0 ? formatDuration(avgDur.value.maxMin) : '—', label: 'max' },
])

const treatmentTimeline = computed(() =>
  buildActivePeriodTimeline(medocsFavoris.favoris).map((t) => ({ start: t.start, end: t.end }))
)

const hasTraitementData = computed(() =>
  medocsFavoris.longTermMeds.some((m) => m.treatmentPeriods?.length)
)

const traitementFacts = computed(() => {
  const results = treatmentEfficacyAnalysis(migraines.migraines, medocsFavoris.favoris)
  const withData = results.filter((r) => r.reductionPct.freq !== null)
  if (!withData.length) {
    return [{ value: String(medocsFavoris.longTermMeds.length), label: 'traitement(s) suivi(s)' }]
  }
  const best = [...withData].sort((a, b) => (a.reductionPct.freq ?? 0) - (b.reductionPct.freq ?? 0))[0]
  return [
    { value: best.medoc, label: 'meilleure efficacité' },
    { value: `${Math.abs(best.reductionPct.freq!)}%`, label: best.reductionPct.freq! < 0 ? 'réduction fréquence' : 'augmentation' },
  ]
})
</script>

<style scoped>
.stats-view {
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 1rem 1.5rem;
  box-sizing: border-box;
  gap: 1rem;
  overflow-y: auto;
}
.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  gap: 1rem;
  max-width: 480px;
  margin: 0 auto;
}
.cta-btn {
  background: var(--color-accent);
  color: var(--color-accent-contrast);
  border: none;
  border-radius: 0.5rem;
  padding: 0.75rem 1.5rem;
  font-size: 1rem;
  cursor: pointer;
}
.summary-cards {
  display: flex;
  gap: 0.5rem;
  flex-shrink: 0;
}
.card {
  flex: 1;
  min-width: 0;
  background: var(--color-surface);
  border-radius: 0.5rem;
  padding: 0.6rem 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}
.card strong {
  font-size: 0.7rem;
  color: var(--color-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.card span {
  font-size: 0.875rem;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.period-selector {
  display: flex;
  gap: 0.5rem;
  flex-shrink: 0;
}
.period-btn {
  padding: 0.35rem 0.85rem;
  border-radius: 1rem;
  border: 1px solid var(--color-muted);
  background: none;
  color: var(--color-muted);
  font: inherit;
  font-size: 0.85rem;
  cursor: pointer;
}
.period-btn.active {
  background: var(--color-accent);
  color: var(--color-accent-contrast);
  border-color: var(--color-accent);
}
.chart-card {
  background: var(--color-surface);
  border: 1px solid transparent;
  border-radius: 0.5rem;
  padding: 0.75rem;
  display: flex;
  flex-direction: column;
  cursor: pointer;
  text-align: left;
  font: inherit;
  color: inherit;
  transition: border-color 0.15s ease, transform 0.15s ease;
  flex-shrink: 0;
}
.chart-card:hover {
  border-color: var(--color-accent);
  transform: translateY(-2px);
}
.chart-card h2 {
  margin: 0 0 0.5rem;
  font-size: 0.95rem;
}
.chart-wrap {
  height: 180px;
  position: relative;
}
.treatment-legend {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  margin-top: 0.5rem;
  font-size: 0.72rem;
  color: var(--color-muted);
}
.treatment-swatch {
  display: inline-block;
  width: 1rem;
  height: 0.65rem;
  border-radius: 0.2rem;
  background: rgba(16, 185, 129, 0.5);
  border: 1px solid rgba(16, 185, 129, 0.8);
  flex-shrink: 0;
}
.stats-buttons {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
</style>
