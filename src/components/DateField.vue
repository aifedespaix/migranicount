<template>
  <div class="date-field" ref="rootRef">
    <input
      type="text"
      class="date-field-input"
      v-model="textValue"
      placeholder="JJ/MM/AAAA"
      @blur="onBlur"
      @keydown.enter="onEnter"
    />
    <button type="button" class="date-field-icon" @click="togglePopup" aria-label="Choisir une date">📅</button>
    <div v-if="showPopup" class="date-field-popup">
      <div class="calendar-header">
        <button type="button" @click="prevMonth">‹</button>
        <span>{{ monthLabel }}</span>
        <button type="button" @click="nextMonth">›</button>
      </div>
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
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { buildCalendarGrid } from '../utils/calendar'
import { parseLooseISODate, todayISO } from '../utils/date'

const model = defineModel<string>({ required: true })

const rootRef = ref<HTMLElement | null>(null)
const textValue = ref(model.value)
const showPopup = ref(false)
const todayIso = todayISO()

const initial = model.value ? new Date(model.value + 'T00:00:00') : new Date()
const viewYear = ref(initial.getFullYear())
const viewMonth = ref(initial.getMonth())

const weekdayLabels = ['Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa', 'Di']
const monthNames = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
]
const monthLabel = computed(() => `${monthNames[viewMonth.value]} ${viewYear.value}`)
const grid = computed(() => buildCalendarGrid(viewYear.value, viewMonth.value))

watch(model, (v) => { textValue.value = v })

function togglePopup() {
  showPopup.value = !showPopup.value
}

function prevMonth() {
  if (viewMonth.value === 0) {
    viewMonth.value = 11
    viewYear.value--
  } else {
    viewMonth.value--
  }
}

function nextMonth() {
  if (viewMonth.value === 11) {
    viewMonth.value = 0
    viewYear.value++
  } else {
    viewMonth.value++
  }
}

function selectDay(iso: string) {
  model.value = iso
  textValue.value = iso
  showPopup.value = false
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
  if (showPopup.value && rootRef.value && !rootRef.value.contains(e.target as Node)) {
    showPopup.value = false
  }
}

onMounted(() => document.addEventListener('mousedown', onOutsideClick))
onUnmounted(() => document.removeEventListener('mousedown', onOutsideClick))
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
}
.date-field-icon {
  background: none;
  border: none;
  font-size: 1.2rem;
  cursor: pointer;
}
.date-field-popup {
  position: absolute;
  top: 100%;
  left: 0;
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
  font-weight: 600;
}
.calendar-header button {
  background: none;
  border: none;
  font-size: 1.1rem;
  cursor: pointer;
  color: var(--color-text);
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
</style>
