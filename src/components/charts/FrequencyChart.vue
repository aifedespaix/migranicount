<template>
  <Bar :data="chartData" :options="options" />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Bar } from 'vue-chartjs'
import { Chart as ChartJS, BarElement, CategoryScale, LinearScale, Tooltip, type Plugin } from 'chart.js'
import { monthlyFrequency, dailyFrequency, weeklyFrequency, type Period } from '../../utils/stats'
import { useChartThemeColors, withAlpha } from '../../utils/chartTheme'
import type { Migraine } from '../../types/migraine'

const TREATMENT_COLOR = 'rgba(16, 185, 129, 0.14)'

const treatmentBandPlugin: Plugin<'bar'> = {
  id: 'treatmentBands',
  beforeDraw(chart) {
    const cfg = (chart.options as any).plugins?.treatmentBands as
      | { bands: { startIdx: number; endIdx: number }[]; color: string }
      | undefined
    if (!cfg?.bands?.length) return
    const { ctx, chartArea } = chart
    if (!chartArea) return
    const { top, bottom } = chartArea
    const meta = chart.getDatasetMeta(0)
    if (!meta?.data?.length) return
    ctx.save()
    ctx.fillStyle = cfg.color
    for (const { startIdx, endIdx } of cfg.bands) {
      const startBar = meta.data[startIdx] as any
      const endBar = meta.data[endIdx] as any
      if (!startBar || !endBar) continue
      const hw = (startBar.width ?? 0) / 2
      const x = startBar.x - hw
      const w = endBar.x + hw - x
      ctx.fillRect(x, top, w, bottom - top)
    }
    ctx.restore()
  },
}

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip, treatmentBandPlugin)

const props = defineProps<{
  migraines: Migraine[]
  period?: Period
  treatmentTimeline?: { start: string; end: string | null }[]
}>()

const themeColors = useChartThemeColors()

const barItems = computed(() => {
  const p = props.period ?? 'month'
  if (p === 'day') {
    return dailyFrequency(props.migraines).map((d) => ({
      fullDate: d.day,
      label: d.day.slice(5),
      count: d.count,
    }))
  } else if (p === 'week') {
    return weeklyFrequency(props.migraines).map((d) => ({
      fullDate: d.week,
      label: d.week.slice(5),
      count: d.count,
    }))
  } else {
    return monthlyFrequency(props.migraines).map((d) => ({
      fullDate: d.month + '-01',
      label: d.month.slice(5),
      count: d.count,
    }))
  }
})

const treatmentBandIndices = computed<{ startIdx: number; endIdx: number }[]>(() => {
  const timeline = props.treatmentTimeline
  if (!timeline?.length) return []
  const today = new Date().toISOString().slice(0, 10)
  const p = props.period ?? 'month'
  const bands: { startIdx: number; endIdx: number }[] = []
  let current: { startIdx: number; endIdx: number } | null = null

  barItems.value.forEach((item, i) => {
    let barStart = item.fullDate
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
    const inTreatment = timeline.some((t) => {
      const tEnd = t.end ?? today
      return t.start <= barEnd && tEnd >= barStart
    })
    if (inTreatment) {
      if (!current) current = { startIdx: i, endIdx: i }
      else current.endIdx = i
    } else {
      if (current) { bands.push(current); current = null }
    }
  })
  if (current) bands.push(current)
  return bands
})

const chartData = computed(() => ({
  labels: barItems.value.map((d) => d.label),
  datasets: [{ label: 'Crises', data: barItems.value.map((d) => d.count), backgroundColor: themeColors.accent.value }],
}))

const options = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    treatmentBands: {
      bands: treatmentBandIndices.value,
      color: TREATMENT_COLOR,
    },
  },
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
