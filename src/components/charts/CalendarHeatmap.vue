<template>
  <div class="heatmap-wrap">
    <div ref="scroller" class="heatmap-scroll">
      <div class="heatmap">
        <div class="heatmap-months">
          <span
            v-for="(col, i) in columns"
            :key="'m' + i"
            class="heatmap-month"
          >{{ col.monthLabel }}</span>
        </div>
        <div class="heatmap-grid">
          <div v-for="(col, i) in columns" :key="'w' + i" class="heatmap-col">
            <span
              v-for="day in col.days"
              :key="day.iso"
              class="heatmap-cell"
              :class="{ future: day.future }"
              :style="day.intensity ? { background: intensityColor(day.intensity) } : undefined"
              :title="day.future ? undefined : cellTitle(day)"
            />
          </div>
        </div>
      </div>
    </div>
    <div class="heatmap-legend">
      <span class="heatmap-legend-item">
        <span class="heatmap-cell" /> Aucune
      </span>
      <span v-for="l in legendLevels" :key="l" class="heatmap-legend-item">
        <span class="heatmap-cell" :style="{ background: intensityColor(l) }" />
        {{ intensityLabel(l) }}
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { intensityColor, intensityLabel } from '../../utils/intensity'
import type { Migraine } from '../../types/migraine'

const props = defineProps<{ migraines: Migraine[]; weeks?: number }>()

const scroller = ref<HTMLElement | null>(null)
const weekCount = computed(() => props.weeks ?? 17)
const legendLevels = [2, 5, 7, 9]

const monthNames = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc']

function toISO(d: Date): string {
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

const intensityByDay = computed(() => {
  const map = new Map<string, number>()
  for (const m of props.migraines) {
    map.set(m.date, Math.max(map.get(m.date) ?? 0, m.intensite))
  }
  return map
})

interface DayCell {
  iso: string
  future: boolean
  intensity: number | undefined
}

const columns = computed<{ monthLabel: string; days: DayCell[] }[]>(() => {
  const today = new Date()
  const todayISO = toISO(today)
  const dow = today.getDay()
  const monday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - (dow === 0 ? 6 : dow - 1))
  const cols: { monthLabel: string; days: DayCell[] }[] = []
  let prevMonth = -1
  for (let w = weekCount.value - 1; w >= 0; w--) {
    const weekStart = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() - w * 7)
    const days: DayCell[] = []
    for (let d = 0; d < 7; d++) {
      const date = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + d)
      const iso = toISO(date)
      days.push({ iso, future: iso > todayISO, intensity: intensityByDay.value.get(iso) })
    }
    const month = weekStart.getMonth()
    cols.push({ monthLabel: month !== prevMonth ? monthNames[month] : '', days })
    prevMonth = month
  }
  return cols
})

function cellTitle(day: DayCell): string {
  const d = new Date(day.iso + 'T00:00:00')
  const dateStr = d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })
  if (!day.intensity) return `${dateStr} — aucune crise`
  return `${dateStr} — ${day.intensity}/10 (${intensityLabel(day.intensity)})`
}

onMounted(() => {
  // Les semaines récentes sont à droite : on s'y positionne d'emblée.
  if (scroller.value) scroller.value.scrollLeft = scroller.value.scrollWidth
})
</script>

<style scoped>
.heatmap-wrap {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.heatmap-scroll {
  overflow-x: auto;
}
.heatmap {
  display: inline-flex;
  flex-direction: column;
  gap: 0.2rem;
}
.heatmap-months {
  display: flex;
  gap: 3px;
}
.heatmap-month {
  width: 0.75rem;
  flex-shrink: 0;
  font-size: 0.6rem;
  color: var(--color-muted);
  overflow: visible;
  white-space: nowrap;
}
.heatmap-grid {
  display: flex;
  gap: 3px;
}
.heatmap-col {
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.heatmap-cell {
  width: 0.75rem;
  height: 0.75rem;
  border-radius: 2px;
  background: color-mix(in srgb, var(--color-muted) 14%, transparent);
  flex-shrink: 0;
}
.heatmap-cell.future {
  background: transparent;
}
.heatmap-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem 0.75rem;
  align-items: center;
}
.heatmap-legend-item {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.68rem;
  color: var(--color-muted);
}
</style>
