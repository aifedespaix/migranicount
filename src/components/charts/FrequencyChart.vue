<template>
  <Bar :data="chartData" :options="options" />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Bar } from 'vue-chartjs'
import { Chart as ChartJS, BarElement, CategoryScale, LinearScale, Tooltip } from 'chart.js'
import { monthlyFrequency } from '../../utils/stats'
import type { Migraine } from '../../types/migraine'

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip)

const props = defineProps<{ migraines: Migraine[] }>()

const chartData = computed(() => {
  const data = monthlyFrequency(props.migraines)
  return {
    labels: data.map((d) => d.month.slice(5)),
    datasets: [{ label: 'Crises', data: data.map((d) => d.count), backgroundColor: '#8b5cf6' }],
  }
})

const options = { responsive: true, plugins: { legend: { display: false } } }
</script>
