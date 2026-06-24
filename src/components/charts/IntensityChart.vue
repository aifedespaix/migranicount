<template>
  <Line :data="chartData" :options="options" />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Line } from 'vue-chartjs'
import { Chart as ChartJS, LineElement, PointElement, CategoryScale, LinearScale, Tooltip, Legend } from 'chart.js'
import { averageIntensityByMonth } from '../../utils/stats'
import { useChartThemeColors, withAlpha } from '../../utils/chartTheme'
import type { Migraine } from '../../types/migraine'

ChartJS.register(LineElement, PointElement, CategoryScale, LinearScale, Tooltip, Legend)

const props = defineProps<{ migraines: Migraine[] }>()
const themeColors = useChartThemeColors()

const chartData = computed(() => {
  const data = averageIntensityByMonth(props.migraines)
  return {
    labels: data.map((d) => d.month.slice(5)),
    datasets: [
      {
        label: 'Intensité moyenne',
        data: data.map((d) => d.avg),
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
