<template>
  <Bar :data="chartData" :options="options" />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Bar } from 'vue-chartjs'
import { Chart as ChartJS, BarElement, CategoryScale, LinearScale, Tooltip } from 'chart.js'
import { efficacyRanking } from '../../utils/stats'
import { useChartThemeColors, withAlpha } from '../../utils/chartTheme'
import type { Migraine } from '../../types/migraine'

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip)

const props = defineProps<{ migraines: Migraine[] }>()
const themeColors = useChartThemeColors()

const chartData = computed(() => {
  const ranking = efficacyRanking(props.migraines).slice(0, 8)
  return {
    labels: ranking.map((r) => r.nom),
    datasets: [{
      label: '% avortée',
      data: ranking.map((r) => r.pctAvortee),
      backgroundColor: themeColors.accent.value,
      borderRadius: 4,
    }],
  }
})

const options = computed(() => ({
  indexAxis: 'y' as const,
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  scales: {
    x: {
      max: 100,
      ticks: { color: themeColors.muted.value, callback: (v: number | string) => v + '%' },
      grid: { color: withAlpha(themeColors.muted.value, 0.2) },
    },
    y: {
      ticks: { color: themeColors.muted.value },
      grid: { display: false },
    },
  },
}))
</script>
