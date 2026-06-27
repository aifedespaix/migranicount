<template>
  <div class="date-field" ref="rootRef">
    <!-- Mobile: native OS date picker -->
    <template v-if="isMobile">
      <input
        type="date"
        class="date-field-input date-field-native"
        :value="model"
        @change="onNativeChange"
      />
      <button
        v-if="model !== todayIso"
        type="button"
        class="date-today-btn"
        @click="selectDay(todayIso)"
        title="Aujourd'hui"
      >
        Auj.
      </button>
    </template>

    <!-- Desktop: custom calendar popup -->
    <template v-else>
      <input
        type="text"
        class="date-field-input"
        v-model="textValue"
        placeholder="JJ/MM/AAAA"
        @blur="onBlur"
        @keydown.enter="onEnter"
        @click="openPopup"
      />
      <button type="button" class="date-field-icon" @click="togglePopup" aria-label="Choisir une date">
        <CalendarDays :size="16" />
      </button>
      <Teleport to="body">
        <div v-if="showPopup" ref="popupRef" class="date-field-popup" :style="popupStyle">
          <div class="calendar-header">
            <button type="button" class="calendar-nav-btn" @click="shiftPeriod(-1)">‹</button>
            <div class="calendar-header-labels">
              <button type="button" class="calendar-label-btn" @click="viewMode = 'month'">
                {{ monthNames[viewMonth] }}
              </button>
              <button type="button" class="calendar-label-btn" @click="viewMode = 'year'">
                {{ viewYear }}
              </button>
            </div>
            <button type="button" class="calendar-nav-btn" @click="shiftPeriod(1)">›</button>
          </div>

          <!-- Mode jour -->
          <template v-if="viewMode === 'day'">
            <div class="calendar-weekdays">
              <span v-for="wd in weekdayLabels" :key="wd">{{ wd }}</span>
            </div>
            <div class="calendar-grid">
              <button
                v-for="cell in grid.flat()"
                :key="cell.iso"
                type="button"
                class="calendar-cell"
                :class="{ 'out-of-month': !cell.inCurrentMonth, selected: cell.iso === model, today: cell.iso === todayIso }"
                @click="selectDay(cell.iso)"
              >
                {{ cell.day }}
              </button>
            </div>
          </template>

          <!-- Mode mois -->
          <div v-else-if="viewMode === 'month'" class="picker-grid">
            <button
              v-for="(name, i) in monthNames"
              :key="i"
              type="button"
              class="picker-cell"
              :class="{ active: i === viewMonth }"
              @click="selectMonth(i)"
            >
              {{ name.slice(0, 3) }}
            </button>
          </div>

          <!-- Mode année -->
          <div v-else-if="viewMode === 'year'" class="picker-grid">
            <button
              v-for="y in yearRange"
              :key="y"
              type="button"
              class="picker-cell"
              :class="{ active: y === viewYear }"
              @click="selectYear(y)"
            >
              {{ y }}
            </button>
          </div>

          <div class="calendar-footer">
            <button
              type="button"
              class="today-btn"
              :class="{ 'today-btn--current': model === todayIso }"
              @click="selectDay(todayIso)"
            >
              Aujourd'hui
            </button>
          </div>
        </div>
      </Teleport>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { CalendarDays } from 'lucide-vue-next'
import { useMediaQuery } from '@vueuse/core'
import { buildCalendarGrid } from '../utils/calendar'
import { parseLooseISODate, todayISO } from '../utils/date'

const model = defineModel<string>({ required: true })

const isMobile = useMediaQuery('(pointer: coarse)')

const rootRef = ref<HTMLElement | null>(null)
const popupRef = ref<HTMLElement | null>(null)
const textValue = ref(model.value)
const showPopup = ref(false)
const popupStyle = ref({ top: '0px', left: '0px' })
const todayIso = todayISO()

type ViewMode = 'day' | 'month' | 'year'
const viewMode = ref<ViewMode>('day')

const initial = model.value ? new Date(model.value + 'T00:00:00') : new Date()
const viewYear = ref(initial.getFullYear())
const viewMonth = ref(initial.getMonth())

const weekdayLabels = ['Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa', 'Di']
const monthNames = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
]

const yearRange = computed(() => {
  const base = viewYear.value
  return Array.from({ length: 12 }, (_, i) => base - 5 + i)
})

const grid = computed(() => buildCalendarGrid(viewYear.value, viewMonth.value))

watch(model, (v) => { textValue.value = v })

function onNativeChange(e: Event) {
  const val = (e.target as HTMLInputElement).value
  if (val) model.value = val
}

function updatePopupPosition() {
  if (!rootRef.value) return
  const rect = rootRef.value.getBoundingClientRect()
  const popupWidth = popupRef.value?.offsetWidth ?? 256
  const popupHeight = popupRef.value?.offsetHeight ?? 280
  let top = rect.bottom + 4
  if (top + popupHeight > window.innerHeight) {
    top = Math.max(8, rect.top - popupHeight - 4)
  }
  let left = rect.left
  if (left + popupWidth > window.innerWidth - 8) {
    left = window.innerWidth - popupWidth - 8
  }
  left = Math.max(8, left)
  popupStyle.value = { top: `${top}px`, left: `${left}px` }
}

function openPopup() {
  if (showPopup.value) return
  showPopup.value = true
  viewMode.value = 'day'
  updatePopupPosition()
  nextTick(updatePopupPosition)
}

function togglePopup() {
  if (showPopup.value) {
    showPopup.value = false
  } else {
    openPopup()
  }
}

function shiftPeriod(dir: -1 | 1) {
  if (viewMode.value === 'day') {
    if (dir === -1) prevMonth()
    else nextMonth()
  } else if (viewMode.value === 'year') {
    viewYear.value += dir * 12
  }
}

function prevMonth() {
  if (viewMonth.value === 0) { viewMonth.value = 11; viewYear.value-- }
  else viewMonth.value--
}

function nextMonth() {
  if (viewMonth.value === 11) { viewMonth.value = 0; viewYear.value++ }
  else viewMonth.value++
}

function selectDay(iso: string) {
  model.value = iso
  textValue.value = iso
  showPopup.value = false
}

function selectMonth(i: number) {
  viewMonth.value = i
  viewMode.value = 'day'
}

function selectYear(y: number) {
  viewYear.value = y
  viewMode.value = 'month'
}

function onBlur() {
  const parsed = parseLooseISODate(textValue.value)
  if (parsed) {
    model.value = parsed
    textValue.value = parsed
  } else {
    textValue.value = model.value
  }
}

function onEnter() {
  onBlur()
}

function onOutsideClick(e: MouseEvent) {
  if (!showPopup.value) return
  const root = rootRef.value
  const popup = popupRef.value
  if (root && root.contains(e.target as Node)) return
  if (popup && popup.contains(e.target as Node)) return
  showPopup.value = false
}

function onViewportChange() {
  if (showPopup.value) updatePopupPosition()
}

onMounted(() => {
  document.addEventListener('mousedown', onOutsideClick)
  window.addEventListener('scroll', onViewportChange, true)
  window.addEventListener('resize', onViewportChange)
})
onUnmounted(() => {
  document.removeEventListener('mousedown', onOutsideClick)
  window.removeEventListener('scroll', onViewportChange, true)
  window.removeEventListener('resize', onViewportChange)
})
</script>

<style scoped>
.date-field {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
}
.date-field-input {
  padding: 0.5rem 0.75rem;
  border-radius: 0.5rem;
  border: 1px solid var(--color-muted);
  background: var(--color-surface);
  color: var(--color-text);
  font-size: 0.95rem;
  width: 9rem;
  cursor: pointer;
}
.date-field-native {
  width: auto;
  min-width: 9rem;
}
.date-today-btn {
  background: none;
  border: 1px solid var(--color-muted);
  border-radius: 0.4rem;
  color: var(--color-accent);
  font-size: 0.75rem;
  padding: 0.25rem 0.5rem;
  cursor: pointer;
  white-space: nowrap;
}
.date-field-icon {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--color-muted);
  display: flex;
  align-items: center;
}
.date-field-popup {
  position: fixed;
  z-index: 40;
  background: var(--color-surface);
  border: 1px solid var(--color-muted);
  border-radius: 0.5rem;
  padding: 0.75rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  width: 16rem;
}
.calendar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.5rem;
}
.calendar-nav-btn {
  background: none;
  border: none;
  font-size: 1.1rem;
  cursor: pointer;
  color: var(--color-text);
  padding: 0.2rem 0.4rem;
  border-radius: 0.3rem;
}
.calendar-nav-btn:hover {
  background: var(--color-bg);
}
.calendar-header-labels {
  display: flex;
  gap: 0.2rem;
}
.calendar-label-btn {
  background: none;
  border: none;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  color: var(--color-text);
  padding: 0.15rem 0.35rem;
  border-radius: 0.3rem;
}
.calendar-label-btn:hover {
  background: var(--color-bg);
}
.calendar-weekdays {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  text-align: center;
  font-size: 0.75rem;
  color: var(--color-muted);
  margin-bottom: 0.25rem;
}
.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 0.15rem;
}
.calendar-cell {
  background: none;
  border: none;
  padding: 0.4rem 0;
  border-radius: 0.4rem;
  cursor: pointer;
  color: var(--color-text);
  font-size: 0.85rem;
}
.calendar-cell:hover {
  background: var(--color-bg);
}
.calendar-cell.out-of-month {
  color: var(--color-muted);
  opacity: 0.5;
}
.calendar-cell.today {
  border: 1px solid var(--color-accent);
}
.calendar-cell.selected {
  background: var(--color-accent);
  color: var(--color-accent-contrast);
}
.picker-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.3rem;
  margin-top: 0.25rem;
}
.picker-cell {
  background: none;
  border: none;
  padding: 0.5rem 0.3rem;
  border-radius: 0.4rem;
  cursor: pointer;
  color: var(--color-text);
  font-size: 0.85rem;
  text-align: center;
}
.picker-cell:hover {
  background: var(--color-bg);
}
.picker-cell.active {
  background: var(--color-accent);
  color: var(--color-accent-contrast);
}
.calendar-footer {
  margin-top: 0.5rem;
  display: flex;
  justify-content: center;
  border-top: 1px solid var(--color-bg);
  padding-top: 0.4rem;
}
.today-btn {
  background: none;
  border: none;
  color: var(--color-accent);
  font-size: 0.8rem;
  cursor: pointer;
  padding: 0.2rem 0.5rem;
  border-radius: 0.3rem;
  opacity: 0.8;
}
.today-btn:hover {
  opacity: 1;
  background: color-mix(in srgb, var(--color-accent) 10%, transparent);
}
.today-btn--current {
  font-weight: 700;
}
</style>
