<template>
  <div class="time-patterns">
    <div class="time-patterns-block">
      <h3>Heure de début</h3>
      <div class="time-patterns-chart">
        <Bar :data="hourData" :options="barOptions" />
      </div>
    </div>
    <div class="time-patterns-block">
      <h3>Jour de la semaine</h3>
      <div class="time-patterns-chart">
        <Bar :data="weekdayData" :options="barOptions" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Bar } from 'vue-chartjs'
import { Chart as ChartJS, BarElement, CategoryScale, LinearScale, Tooltip } from 'chart.js'
import { startHourDistribution, weekdayDistribution } from '../../utils/stats'
import { useChartThemeColors, withAlpha } from '../../utils/chartTheme'
import type { Migraine } from '../../types/migraine'

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip)

const props = defineProps<{ migraines: Migraine[] }>()
const themeColors = useChartThemeColors()

const hourData = computed(() => {
  const dist = startHourDistribution(props.migraines)
  return {
    labels: dist.map((d) => d.label),
    datasets: [{
      label: 'Crises',
      data: dist.map((d) => d.count),
      backgroundColor: themeColors.accent.value,
      borderRadius: 4,
    }],
  }
})

const weekdayData = computed(() => {
  const dist = weekdayDistribution(props.migraines)
  return {
    labels: dist.map((d) => d.label),
    datasets: [{
      label: 'Crises',
      data: dist.map((d) => d.count),
      backgroundColor: themeColors.accent.value,
      borderRadius: 4,
    }],
  }
})

const barOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  scales: {
    x: {
      ticks: { color: themeColors.muted.value },
      grid: { display: false },
    },
    y: {
      beginAtZero: true,
      ticks: { color: themeColors.muted.value, stepSize: 1 },
      grid: { color: withAlpha(themeColors.muted.value, 0.2) },
    },
  },
}))
</script>

<style scoped>
.time-patterns {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  height: 100%;
}
.time-patterns-block {
  flex: 1;
  min-height: 160px;
  display: flex;
  flex-direction: column;
}
.time-patterns-block h3 {
  margin: 0 0 0.35rem;
  font-size: 0.8rem;
  color: var(--color-muted);
  font-weight: 600;
}
.time-patterns-chart {
  flex: 1;
  min-height: 0;
  position: relative;
}
</style>
