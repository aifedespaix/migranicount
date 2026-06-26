<template>
  <div class="month-picker" ref="rootRef">
    <button type="button" class="month-picker-trigger" @click="togglePopup">
      <span class="trigger-label">{{ displayLabel }}</span>
      <span class="trigger-icon">📅</span>
    </button>
    <Teleport to="body">
      <div v-if="showPopup" ref="popupRef" class="month-picker-popup" :style="popupStyle">
        <div class="month-picker-header">
          <button type="button" @click="viewYear--">‹</button>
          <span>{{ viewYear }}</span>
          <button type="button" @click="viewYear++">›</button>
        </div>
        <div class="month-grid">
          <button
            v-for="(name, i) in monthNames"
            :key="i"
            type="button"
            class="month-cell"
            :class="{ selected: isSelected(i), current: isCurrentMonth(i) }"
            @click="selectMonth(i)"
          >
            {{ name }}
          </button>
        </div>
        <div class="month-picker-footer">
          <button type="button" class="clear-btn" @click="clearMonth">Tous les mois</button>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'

const model = defineModel<string>({ required: true })

const rootRef = ref<HTMLElement | null>(null)
const popupRef = ref<HTMLElement | null>(null)
const showPopup = ref(false)
const popupStyle = ref({ top: '0px', left: '0px' })

const now = new Date()
const viewYear = ref(model.value ? parseInt(model.value.slice(0, 4)) : now.getFullYear())

const monthNames = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc']
const monthNamesFull = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre']

const displayLabel = computed(() => {
  if (!model.value) return 'Tous les mois'
  const [y, m] = model.value.split('-')
  return `${monthNamesFull[parseInt(m) - 1]} ${y}`
})

function isSelected(monthIndex: number) {
  if (!model.value) return false
  const [y, m] = model.value.split('-')
  return parseInt(y) === viewYear.value && parseInt(m) - 1 === monthIndex
}

function isCurrentMonth(monthIndex: number) {
  return viewYear.value === now.getFullYear() && monthIndex === now.getMonth()
}

function pad(n: number) {
  return String(n).padStart(2, '0')
}

function selectMonth(monthIndex: number) {
  model.value = `${viewYear.value}-${pad(monthIndex + 1)}`
  showPopup.value = false
}

function clearMonth() {
  model.value = ''
  showPopup.value = false
}

function updatePosition() {
  if (!rootRef.value) return
  const rect = rootRef.value.getBoundingClientRect()
  const popupW = popupRef.value?.offsetWidth ?? 220
  const popupH = popupRef.value?.offsetHeight ?? 220
  let top = rect.bottom + 4
  if (top + popupH > window.innerHeight) top = Math.max(8, rect.top - popupH - 4)
  let left = rect.left
  if (left + popupW > window.innerWidth - 8) left = window.innerWidth - popupW - 8
  left = Math.max(8, left)
  popupStyle.value = { top: `${top}px`, left: `${left}px` }
}

function togglePopup() {
  showPopup.value = !showPopup.value
  if (showPopup.value) {
    updatePosition()
    nextTick(updatePosition)
  }
}

function onOutsideClick(e: MouseEvent) {
  if (showPopup.value
    && !rootRef.value?.contains(e.target as Node)
    && !popupRef.value?.contains(e.target as Node)) {
    showPopup.value = false
  }
}

function onViewportChange() {
  if (showPopup.value) updatePosition()
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
.month-picker {
  position: relative;
  display: inline-flex;
}
.month-picker-trigger {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.5rem 0.75rem;
  border-radius: 0.5rem;
  border: 1px solid var(--color-muted);
  background: var(--color-surface);
  color: var(--color-text);
  font-size: 0.95rem;
  cursor: pointer;
  white-space: nowrap;
}
.month-picker-trigger:hover {
  border-color: var(--color-accent);
}
.trigger-icon {
  font-size: 1rem;
}
.month-picker-popup {
  position: fixed;
  z-index: 40;
  background: var(--color-surface);
  border: 1px solid var(--color-muted);
  border-radius: 0.5rem;
  padding: 0.75rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  width: 14rem;
}
.month-picker-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.5rem;
  font-weight: 600;
  font-size: 0.95rem;
}
.month-picker-header button {
  background: none;
  border: none;
  font-size: 1.1rem;
  cursor: pointer;
  color: var(--color-text);
  padding: 0.1rem 0.4rem;
}
.month-picker-header button:hover {
  color: var(--color-accent);
}
.month-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.25rem;
  margin-bottom: 0.5rem;
}
.month-cell {
  background: none;
  border: none;
  border-radius: 0.4rem;
  padding: 0.45rem 0.25rem;
  cursor: pointer;
  color: var(--color-text);
  font-size: 0.8rem;
  text-align: center;
}
.month-cell:hover {
  background: var(--color-bg);
}
.month-cell.current {
  border: 1px solid var(--color-accent);
}
.month-cell.selected {
  background: var(--color-accent);
  color: var(--color-accent-contrast);
}
.month-picker-footer {
  border-top: 1px solid var(--color-bg);
  padding-top: 0.5rem;
  text-align: center;
}
.clear-btn {
  background: none;
  border: none;
  color: var(--color-muted);
  font-size: 0.8rem;
  cursor: pointer;
  padding: 0.2rem 0.5rem;
  border-radius: 0.3rem;
}
.clear-btn:hover {
  color: var(--color-text);
  background: var(--color-bg);
}
</style>
