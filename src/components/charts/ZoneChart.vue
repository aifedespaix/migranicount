<template>
  <Doughnut :data="chartData" :options="options" />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Doughnut } from 'vue-chartjs'
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js'
import { zoneDistribution, type Zone } from '../../utils/stats'
import { useChartThemeColors } from '../../utils/chartTheme'
import type { Migraine } from '../../types/migraine'

ChartJS.register(ArcElement, Tooltip, Legend)

const props = defineProps<{ migraines: Migraine[] }>()
const themeColors = useChartThemeColors()

const zoneLabels: Record<Zone, string> = {
  gauche: 'Gauche',
  droite: 'Droite',
  bilaterale: 'Bilatérale',
  nuque: 'Nuque',
}

// Couleur fixe par zone (jamais recyclée) : même famille que treatmentColors.
const zoneColors: Record<Zone, string> = {
  gauche: '#3b82f6',
  droite: '#10b981',
  bilaterale: '#a855f7',
  nuque: '#f59e0b',
}

const chartData = computed(() => {
  const dist = zoneDistribution(props.migraines).filter((z) => z.count > 0)
  return {
    labels: dist.map((z) => zoneLabels[z.zone]),
    datasets: [{
      data: dist.map((z) => z.count),
      backgroundColor: dist.map((z) => zoneColors[z.zone]),
      borderWidth: 2,
      borderColor: 'transparent',
    }],
  }
})

const options = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { position: 'bottom' as const, labels: { color: themeColors.text.value } },
  },
}))
</script>
