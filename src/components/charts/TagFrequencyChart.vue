<template>
  <Bar :data="chartData" :options="options" />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Bar } from 'vue-chartjs'
import { Chart as ChartJS, BarElement, CategoryScale, LinearScale, Tooltip } from 'chart.js'
import { triggerFrequency, symptomFrequency } from '../../utils/stats'
import { useChartThemeColors, withAlpha } from '../../utils/chartTheme'
import type { Migraine } from '../../types/migraine'

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip)

const props = defineProps<{ migraines: Migraine[]; source: 'declencheurs' | 'symptomes' }>()
const themeColors = useChartThemeColors()

const items = computed(() =>
  props.source === 'declencheurs' ? triggerFrequency(props.migraines) : symptomFrequency(props.migraines)
)

const chartData = computed(() => ({
  labels: items.value.map((d) => d.tag),
  datasets: [{
    label: 'Crises',
    data: items.value.map((d) => d.count),
    backgroundColor: themeColors.accent.value,
    borderRadius: 4,
  }],
}))

const options = computed(() => ({
  indexAxis: 'y' as const,
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  scales: {
    x: {
      beginAtZero: true,
      ticks: { color: themeColors.muted.value, stepSize: 1 },
      grid: { color: withAlpha(themeColors.muted.value, 0.2) },
    },
    y: {
      ticks: { color: themeColors.muted.value },
      grid: { display: false },
    },
  },
}))
</script>
