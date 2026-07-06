<template>
  <Line :data="chartData" :options="options" />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Line } from 'vue-chartjs'
import { Chart as ChartJS, LineElement, PointElement, CategoryScale, LinearScale, Tooltip, Legend, type Plugin } from 'chart.js'
import { averageIntensityByMonth, averageIntensityByDay, averageIntensityByWeek, type Period } from '../../utils/stats'
import { useChartThemeColors, withAlpha } from '../../utils/chartTheme'
import type { Migraine } from '../../types/migraine'
import type { TreatmentEntry } from '../../utils/treatmentColors'

const treatmentBandPlugin: Plugin<'line'> = {
  id: 'treatmentBandsLine',
  beforeDraw(chart) {
    const cfg = (chart.options as any).plugins?.treatmentBands as
      | { treatments: { bands: { startIdx: number; endIdx: number }[]; color: string }[] }
      | undefined
    if (!cfg?.treatments?.length) return
    const { ctx, chartArea, scales } = chart
    if (!chartArea || !scales.x) return
    const xScale = scales.x
    ctx.save()
    for (const treatment of cfg.treatments) {
      ctx.fillStyle = treatment.color
      for (const { startIdx, endIdx } of treatment.bands) {
        const xStart = xScale.getPixelForValue(startIdx)
        const xEnd = xScale.getPixelForValue(endIdx)
        const halfStep = (xScale.getPixelForValue(1) - xScale.getPixelForValue(0)) / 2
        ctx.fillRect(
          xStart - halfStep,
          chartArea.top,
          xEnd - xStart + halfStep * 2,
          chartArea.bottom - chartArea.top,
        )
      }
    }
    ctx.restore()
  },
}

ChartJS.register(LineElement, PointElement, CategoryScale, LinearScale, Tooltip, Legend, treatmentBandPlugin)

const props = defineProps<{ migraines: Migraine[]; period?: Period; treatments?: TreatmentEntry[] }>()
const themeColors = useChartThemeColors()

const fullDateItems = computed(() => {
  const p = props.period ?? 'month'
  if (p === 'day') return averageIntensityByDay(props.migraines).map((d) => d.day)
  if (p === 'week') return averageIntensityByWeek(props.migraines).map((d) => d.week)
  return averageIntensityByMonth(props.migraines).map((d) => d.month + '-01')
})

const treatmentBandData = computed(() => {
  const treatments = props.treatments
  if (!treatments?.length) return []
  const p = props.period ?? 'month'
  return treatments.map((t) => {
    const bands: { startIdx: number; endIdx: number }[] = []
    let current: { startIdx: number; endIdx: number } | null = null
    fullDateItems.value.forEach((fullDate, i) => {
      let barEnd: string
      if (p === 'month') {
        const d = new Date(fullDate + 'T00:00:00')
        barEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().slice(0, 10)
      } else if (p === 'week') {
        const d = new Date(fullDate + 'T00:00:00')
        barEnd = new Date(d.getTime() + 6 * 86400000).toISOString().slice(0, 10)
      } else {
        barEnd = fullDate
      }
      const inTreatment = t.periods.some((per) => per.start <= barEnd && per.end >= fullDate)
      if (inTreatment) {
        if (!current) current = { startIdx: i, endIdx: i }
        else current.endIdx = i
      } else {
        if (current) { bands.push(current); current = null }
      }
    })
    if (current) bands.push(current)
    return { bands, color: t.color.bg }
  })
})

const chartData = computed(() => {
  const p = props.period ?? 'month'
  let items: { label: string; avg: number | null }[]
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
        // null pour les périodes sans crise : la courbe saute ces points
        // (spanGaps) au lieu de plonger à un zéro trompeur.
        data: items.map((d) => d.avg),
        borderColor: themeColors.accent.value,
        backgroundColor: themeColors.accent.value,
        tension: 0.3,
        spanGaps: true,
      },
    ],
  }
})

const options = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { labels: { color: themeColors.text.value } },
    treatmentBands: { treatments: treatmentBandData.value },
  },
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
