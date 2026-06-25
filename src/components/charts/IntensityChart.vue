<template>
  <Line :data="chartData" :options="options" />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Line } from 'vue-chartjs'
import { Chart as ChartJS, LineElement, PointElement, CategoryScale, LinearScale, Tooltip, Legend } from 'chart.js'
import { averageIntensityByMonth, averageIntensityByDay, averageIntensityByWeek, type Period } from '../../utils/stats'
import { useChartThemeColors, withAlpha } from '../../utils/chartTheme'
import type { Migraine } from '../../types/migraine'

ChartJS.register(LineElement, PointElement, CategoryScale, LinearScale, Tooltip, Legend)

const props = defineProps<{ migraines: Migraine[]; period?: Period }>()
const themeColors = useChartThemeColors()

const chartData = computed(() => {
  const p = props.period ?? 'month'
  let items: { label: string; avg: number }[]
  if (p === 'day') {
    items = averageIntensityByDay(props.migraines).map((d) => ({ label: d.day.slice(5), avg: d.avg }))
  } else if (p === 'week') {
    items = averageIntensityByWeek(props.migraines).map((d) => ({ label: d.week.slice(5), avg: d.avg }))
  } else {
    items = averageIntensityByMonth(props.migraines).map((d) => ({ label: d.month.slice(5), avg: d.avg }))
  }
  return {
    labels: items.map((d) => d.label),
    datasets: [
      {
        label: 'Intensité moyenne',
        data: items.map((d) => d.avg),
        borderColor: themeColors.accent.value,
        backgroundColor: themeColors.accent.value,
        tension: 0.3,
      },
    ],
  }
})

const options = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { labels: { color: themeColors.text.value } } },
  scales: {
    x: {
      ticks: { color: themeColors.muted.value },
      grid: { color: withAlpha(themeColors.muted.value, 0.2) },
    },
    y: {
      min: 0,
      max: 10,
      ticks: { color: themeColors.muted.value },
      grid: { color: withAlpha(themeColors.muted.value, 0.2) },
    },
  },
}))
</script>
