<template>
  <Bar :data="chartData" :options="options" />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Bar } from 'vue-chartjs'
import { Chart as ChartJS, BarElement, CategoryScale, LinearScale, Tooltip } from 'chart.js'
import { durationDistribution } from '../../utils/stats'
import { useChartThemeColors, withAlpha } from '../../utils/chartTheme'
import type { Migraine } from '../../types/migraine'

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip)

const props = defineProps<{ migraines: Migraine[] }>()
const themeColors = useChartThemeColors()

const chartData = computed(() => {
  const dist = durationDistribution(props.migraines)
  return {
    labels: dist.map((d) => d.label),
    datasets: [{ label: 'Crises', data: dist.map((d) => d.count), backgroundColor: themeColors.accent.value, borderRadius: 4 }],
  }
})

const options = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  scales: {
    x: {
      ticks: { color: themeColors.muted.value },
      grid: { color: withAlpha(themeColors.muted.value, 0.2) },
    },
    y: {
      beginAtZero: true,
      ticks: { color: themeColors.muted.value, stepSize: 1 },
      grid: { color: withAlpha(themeColors.muted.value, 0.2) },
    },
  },
}))
</script>
