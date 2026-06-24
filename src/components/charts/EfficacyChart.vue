<template>
  <Bar :data="chartData" :options="options" />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Bar } from 'vue-chartjs'
import { Chart as ChartJS, BarElement, CategoryScale, LinearScale, Tooltip } from 'chart.js'
import { medocEfficacy } from '../../utils/stats'
import type { Migraine } from '../../types/migraine'

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip)

const props = defineProps<{ migraines: Migraine[] }>()

const chartData = computed(() => {
  const data = medocEfficacy(props.migraines).filter((d) => d.total >= 2)
  return {
    labels: data.map((d) => d.nom),
    datasets: [{ label: '% crises avortées', data: data.map((d) => d.pctAvortee), backgroundColor: '#8b5cf6' }],
  }
})

const options = { indexAxis: 'y' as const, responsive: true, scales: { x: { min: 0, max: 100 } } }
</script>
