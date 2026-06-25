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
          <span>{{ formatDuration(averageDurationMinutes(migraines.migraines)) }}</span>
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
        >{{ { day: 'Jour', week: 'Semaine', month: 'Mois' }[p] }}</button>
      </div>

      <div class="charts-grid">
        <button class="chart-card" @click="openDetail('frequency')">
          <h2>Fréquence</h2>
          <div class="chart-wrap"><FrequencyChart :migraines="migraines.migraines" :period="period" /></div>
        </button>
        <button class="chart-card" @click="openDetail('intensity')">
          <h2>Intensité moyenne</h2>
          <div class="chart-wrap"><IntensityChart :migraines="migraines.migraines" :period="period" /></div>
        </button>
      </div>
    </template>

    <ChartDetailModal
      v-if="activeDetail"
      :chart="activeDetail"
      :migraines="migraines.migraines"
      @close="activeDetail = null"
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
import { formatRelative, formatDuration, todayISO } from '../utils/date'
import { averageDurationMinutes, defaultPeriod, type Period } from '../utils/stats'
import FrequencyChart from '../components/charts/FrequencyChart.vue'
import IntensityChart from '../components/charts/IntensityChart.vue'
import ChartDetailModal from '../components/charts/ChartDetailModal.vue'
import MigraineFormModal from '../components/MigraineForm/MigraineFormModal.vue'
import { useToastStore } from '../stores/toast'

const migraines = useMigrainesStore()
const toastStore = useToastStore()
const period = ref<Period>(defaultPeriod(migraines.migraines))
const activeDetail = ref<'frequency' | 'intensity' | null>(null)
const emptyStateFormOpen = ref(false)

function openDetail(chart: 'frequency' | 'intensity') {
  activeDetail.value = chart
}

function onEmptyStateSaved() {
  emptyStateFormOpen.value = false
  toastStore.add({ message: 'Migraine enregistrée !', type: 'success', persistent: false })
}

const lastMigraine = computed(() =>
  [...migraines.migraines].sort((a, b) => (a.date < b.date ? 1 : -1))[0]
)

const thisMonthCount = computed(() =>
  migraines.migraines.filter((m) => m.date.slice(0, 7) === todayISO().slice(0, 7)).length
)
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
.charts-grid {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;
}
@media (orientation: landscape) {
  .charts-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
.chart-card {
  background: var(--color-surface);
  border: 1px solid transparent;
  border-radius: 0.5rem;
  padding: 0.75rem;
  display: flex;
  flex-direction: column;
  min-height: 0;
  cursor: pointer;
  text-align: left;
  font: inherit;
  color: inherit;
  transition: border-color 0.15s ease, transform 0.15s ease;
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
  flex: 1;
  min-height: 0;
  height: 180px;
  position: relative;
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
</style>
