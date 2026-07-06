<template>
  <div class="medication-charts">
    <div class="medication-block">
      <h3>Jours avec prise de médicament par mois</h3>
      <div class="medication-chart">
        <Bar :data="daysData" :options="daysOptions" />
      </div>
      <p class="medication-note">
        Au-delà de 8 jours de prise par mois (ligne pointillée), le risque de
        céphalée par abus médicamenteux augmente — parlez-en à votre médecin.
      </p>
    </div>
    <div class="medication-block">
      <h3>Taux d'avortement selon le délai de prise</h3>
      <div class="medication-chart">
        <Bar :data="delayData" :options="delayOptions" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Bar } from 'vue-chartjs'
import { Chart as ChartJS, BarElement, CategoryScale, LinearScale, Tooltip, type Plugin } from 'chart.js'
import { medicationDaysPerMonth, abortionRateByDelay } from '../../utils/stats'
import { useChartThemeColors, withAlpha } from '../../utils/chartTheme'
import type { Migraine } from '../../types/migraine'

const OVERUSE_WARNING = 8
const OVERUSE_DANGER = 10
const WARNING_COLOR = 'hsl(35, 85%, 50%)'
const DANGER_COLOR = 'hsl(0, 75%, 50%)'

const thresholdLinePlugin: Plugin<'bar'> = {
  id: 'overuseThreshold',
  afterDraw(chart) {
    const cfg = (chart.options as any).plugins?.overuseThreshold as
      | { value: number; color: string }
      | undefined
    if (!cfg) return
    const { ctx, chartArea, scales } = chart
    if (!chartArea || !scales.y) return
    const y = scales.y.getPixelForValue(cfg.value)
    if (y < chartArea.top || y > chartArea.bottom) return
    ctx.save()
    ctx.strokeStyle = cfg.color
    ctx.setLineDash([4, 4])
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(chartArea.left, y)
    ctx.lineTo(chartArea.right, y)
    ctx.stroke()
    ctx.restore()
  },
}

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip, thresholdLinePlugin)

const props = defineProps<{ migraines: Migraine[] }>()
const themeColors = useChartThemeColors()

const daysItems = computed(() => medicationDaysPerMonth(props.migraines))

const daysData = computed(() => ({
  labels: daysItems.value.map((d) => d.month.slice(5)),
  datasets: [{
    label: 'Jours avec médicament',
    data: daysItems.value.map((d) => d.days),
    backgroundColor: daysItems.value.map((d) =>
      d.days >= OVERUSE_DANGER ? DANGER_COLOR : d.days >= OVERUSE_WARNING ? WARNING_COLOR : themeColors.accent.value
    ),
    borderRadius: 4,
  }],
}))

const daysOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    overuseThreshold: { value: OVERUSE_WARNING, color: WARNING_COLOR },
    tooltip: {
      callbacks: {
        label: (ctx: { dataIndex: number }) => {
          const d = daysItems.value[ctx.dataIndex]
          if (!d) return ''
          const suffix = d.days >= OVERUSE_DANGER ? ' — seuil critique dépassé' : d.days >= OVERUSE_WARNING ? ' — seuil de vigilance atteint' : ''
          return `${d.days} jour(s) avec prise${suffix}`
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
      suggestedMax: OVERUSE_WARNING + 2,
      ticks: { color: themeColors.muted.value, stepSize: 2 },
      grid: { color: withAlpha(themeColors.muted.value, 0.2) },
    },
  },
}))

const delayItems = computed(() => abortionRateByDelay(props.migraines))

const delayData = computed(() => ({
  labels: delayItems.value.map((d) => d.label),
  datasets: [{
    label: '% avortée',
    data: delayItems.value.map((d) => d.pct),
    backgroundColor: themeColors.accent.value,
    borderRadius: 4,
  }],
}))

const delayOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      callbacks: {
        label: (ctx: { dataIndex: number }) => {
          const d = delayItems.value[ctx.dataIndex]
          if (!d || d.pct === null) return 'Aucune donnée'
          return `${d.avortee} avortée(s) / ${d.total} crise(s) (${d.pct}%)`
        },
      },
    },
  },
  scales: {
    x: {
      ticks: { color: themeColors.muted.value },
      grid: { display: false },
    },
    y: {
      beginAtZero: true,
      max: 100,
      ticks: { color: themeColors.muted.value, callback: (v: number | string) => v + '%' },
      grid: { color: withAlpha(themeColors.muted.value, 0.2) },
    },
  },
}))
</script>

<style scoped>
.medication-charts {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  height: 100%;
}
.medication-block {
  flex: 1;
  min-height: 180px;
  display: flex;
  flex-direction: column;
}
.medication-block h3 {
  margin: 0 0 0.35rem;
  font-size: 0.8rem;
  color: var(--color-muted);
  font-weight: 600;
}
.medication-chart {
  flex: 1;
  min-height: 0;
  position: relative;
}
.medication-note {
  margin: 0.4rem 0 0;
  font-size: 0.72rem;
  color: var(--color-muted);
}
</style>
