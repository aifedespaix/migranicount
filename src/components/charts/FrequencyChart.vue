<template>
  <Bar :data="chartData" :options="options" />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Bar } from 'vue-chartjs'
import { Chart as ChartJS, BarElement, CategoryScale, LinearScale, Tooltip, type Plugin } from 'chart.js'
import { monthlyFrequency, dailyFrequency, weeklyFrequency, type Period } from '../../utils/stats'
import { useChartThemeColors, withAlpha } from '../../utils/chartTheme'
import { intensityColor, intensityLabel } from '../../utils/intensity'
import type { Migraine } from '../../types/migraine'
import type { TreatmentEntry } from '../../utils/treatmentColors'

const treatmentBandPlugin: Plugin<'bar'> = {
  id: 'treatmentBands',
  beforeDraw(chart) {
    const cfg = (chart.options as any).plugins?.treatmentBands as
      | { treatments: { bands: { startIdx: number; endIdx: number }[]; color: string }[] }
      | undefined
    if (!cfg?.treatments?.length) return
    const { ctx, chartArea } = chart
    if (!chartArea) return
    const { top, bottom } = chartArea
    const meta = chart.getDatasetMeta(0)
    if (!meta?.data?.length) return
    ctx.save()
    for (const treatment of cfg.treatments) {
      ctx.fillStyle = treatment.color
      for (const { startIdx, endIdx } of treatment.bands) {
        const startBar = meta.data[startIdx] as any
        const endBar = meta.data[endIdx] as any
        if (!startBar || !endBar) continue
        const hw = (startBar.width ?? 0) / 2
        const x = startBar.x - hw
        const w = endBar.x + hw - x
        ctx.fillRect(x, top, w, bottom - top)
      }
    }
    ctx.restore()
  },
}

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip, treatmentBandPlugin)

const props = defineProps<{
  migraines: Migraine[]
  period?: Period
  treatments?: TreatmentEntry[]
}>()

const themeColors = useChartThemeColors()

const barItems = computed(() => {
  const p = props.period ?? 'month'
  if (p === 'day') {
    return dailyFrequency(props.migraines).map((d) => ({
      fullDate: d.day,
      label: d.day.slice(5),
      count: d.count,
      intensity: d.maxIntensity,
    }))
  } else if (p === 'week') {
    return weeklyFrequency(props.migraines).map((d) => ({
      fullDate: d.week,
      label: d.week.slice(5),
      count: d.count,
      intensity: d.avgIntensity,
    }))
  } else {
    return monthlyFrequency(props.migraines).map((d) => ({
      fullDate: d.month + '-01',
      label: d.month.slice(5),
      count: d.count,
      intensity: d.avgIntensity,
    }))
  }
})

const treatmentBandData = computed(() => {
  const treatments = props.treatments
  if (!treatments?.length) return []
  const p = props.period ?? 'month'
  return treatments.map((t) => {
    const bands: { startIdx: number; endIdx: number }[] = []
    let current: { startIdx: number; endIdx: number } | null = null
    barItems.value.forEach((item, i) => {
      const barStart = item.fullDate
      let barEnd: string
      if (p === 'month') {
        const d = new Date(item.fullDate + 'T00:00:00')
        barEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().slice(0, 10)
      } else if (p === 'week') {
        const d = new Date(item.fullDate + 'T00:00:00')
        barEnd = new Date(d.getTime() + 6 * 86400000).toISOString().slice(0, 10)
      } else {
        barEnd = barStart
      }
      const inTreatment = t.periods.some((per) => per.start <= barEnd && per.end >= barStart)
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

const isDayView = computed(() => (props.period ?? 'month') === 'day')

// En vue jour, il n'y a au plus qu'une crise par jour : la hauteur encode
// l'intensité (0-10) plutôt qu'un compte toujours égal à 1. En vue
// semaine/mois, la hauteur reste le nombre de crises et la couleur encode
// l'intensité moyenne de la période.
const chartData = computed(() => ({
  labels: barItems.value.map((d) => d.label),
  datasets: [
    {
      label: 'Crises',
      data: barItems.value.map((d) => (isDayView.value ? d.intensity : d.count)),
      backgroundColor: barItems.value.map((d) =>
        d.count > 0 ? intensityColor(d.intensity) : themeColors.accent.value
      ),
    },
  ],
}))

const options = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    treatmentBands: { treatments: treatmentBandData.value },
    tooltip: {
      callbacks: {
        label: (ctx: { dataIndex: number }) => {
          const item = barItems.value[ctx.dataIndex]
          if (!item || item.count === 0) return 'Aucune crise'
          if (isDayView.value) return `${item.intensity}/10 — ${intensityLabel(item.intensity)}`
          return `${item.count} crise(s) — intensité moy. ${item.intensity}/10`
        },
      },
    },
  },
  scales: {
    x: {
      ticks: { color: themeColors.muted.value },
      grid: { color: withAlpha(themeColors.muted.value, 0.2) },
    },
    y: {
      beginAtZero: true,
      ...(isDayView.value ? { max: 10 } : {}),
      ticks: { color: themeColors.muted.value },
      grid: { color: withAlpha(themeColors.muted.value, 0.2) },
    },
  },
}))
</script>
