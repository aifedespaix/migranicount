<template>
  <Bar :data="chartData" :options="options" />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Bar } from 'vue-chartjs'
import { Chart as ChartJS, BarElement, CategoryScale, LinearScale, Tooltip } from 'chart.js'
import { monthlyFrequency, dailyFrequency, weeklyFrequency, type Period } from '../../utils/stats'
import { useChartThemeColors, withAlpha } from '../../utils/chartTheme'
import type { Migraine } from '../../types/migraine'

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip)

const props = defineProps<{ migraines: Migraine[]; period?: Period }>()
const themeColors = useChartThemeColors()

const chartData = computed(() => {
  const p = props.period ?? 'month'
  let items: { label: string; count: number }[]
  if (p === 'day') {
    items = dailyFrequency(props.migraines).map((d) => ({ label: d.day.slice(5), count: d.count }))
  } else if (p === 'week') {
    items = weeklyFrequency(props.migraines).map((d) => ({ label: d.week.slice(5), count: d.count }))
  } else {
    items = monthlyFrequency(props.migraines).map((d) => ({ label: d.month.slice(5), count: d.count }))
  }
  return {
    labels: items.map((d) => d.label),
    datasets: [{ label: 'Crises', data: items.map((d) => d.count), backgroundColor: themeColors.accent.value }],
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
      ticks: { color: themeColors.muted.value },
      grid: { color: withAlpha(themeColors.muted.value, 0.2) },
    },
  },
}))
</script>
