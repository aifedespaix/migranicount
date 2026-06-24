<template>
  <Line :data="chartData" :options="options" />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Line } from 'vue-chartjs'
import { Chart as ChartJS, LineElement, PointElement, CategoryScale, LinearScale, Tooltip } from 'chart.js'
import { averageIntensityByMonth } from '../../utils/stats'
import type { Migraine } from '../../types/migraine'

ChartJS.register(LineElement, PointElement, CategoryScale, LinearScale, Tooltip)

const props = defineProps<{ migraines: Migraine[] }>()

const chartData = computed(() => {
  const data = averageIntensityByMonth(props.migraines)
  return {
    labels: data.map((d) => d.month.slice(5)),
    datasets: [{ label: 'Intensité moyenne', data: data.map((d) => d.avg), borderColor: '#a78bfa', tension: 0.3 }],
  }
})

const options = { responsive: true, scales: { y: { min: 0, max: 10 } } }
</script>
