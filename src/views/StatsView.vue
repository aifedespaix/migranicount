<template>
  <div class="stats-view">
    <h1>Migracount</h1>
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
    <section>
      <h2>Fréquence (12 derniers mois)</h2>
      <FrequencyChart :migraines="migraines.migraines" />
    </section>
    <section>
      <h2>Intensité moyenne</h2>
      <IntensityChart :migraines="migraines.migraines" />
    </section>
    <section>
      <h2>Efficacité des traitements</h2>
      <EfficacyChart :migraines="migraines.migraines" />
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useMigrainesStore } from '../stores/migraines'
import { formatRelative, formatDuration, todayISO } from '../utils/date'
import { averageDurationMinutes } from '../utils/stats'
import FrequencyChart from '../components/charts/FrequencyChart.vue'
import IntensityChart from '../components/charts/IntensityChart.vue'
import EfficacyChart from '../components/charts/EfficacyChart.vue'

const migraines = useMigrainesStore()

const lastMigraine = computed(() =>
  [...migraines.migraines].sort((a, b) => (a.date < b.date ? 1 : -1))[0]
)

const thisMonthCount = computed(() =>
  migraines.migraines.filter((m) => m.date.slice(0, 7) === todayISO().slice(0, 7)).length
)
</script>
