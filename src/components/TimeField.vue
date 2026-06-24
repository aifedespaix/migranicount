<template>
  <div class="time-field" ref="rootRef">
    <input
      type="text"
      class="time-field-input"
      v-model="textValue"
      placeholder="HH:mm"
      @blur="onBlur"
      @keydown.enter="onEnter"
    />
    <button type="button" class="time-field-icon" @click="togglePopup" aria-label="Choisir une heure">🕐</button>
    <div v-if="showPopup" class="time-field-popup">
      <div class="time-column">
        <button
          v-for="h in hours"
          :key="h"
          type="button"
          class="time-cell"
          :class="{ selected: h === selectedHour }"
          @click="pickHour(h)"
        >
          {{ h }}
        </button>
      </div>
      <div class="time-column">
        <button
          v-for="m in minutes"
          :key="m"
          type="button"
          class="time-cell"
          :class="{ selected: m === selectedMinute }"
          @click="pickMinute(m)"
        >
          {{ m }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { parseLooseTime } from '../utils/date'

const model = defineModel<string>({ required: true })

const rootRef = ref<HTMLElement | null>(null)
const textValue = ref(model.value)
const showPopup = ref(false)

const [initialHour, initialMinute] = model.value.split(':')
const selectedHour = ref(initialHour)
const selectedMinute = ref(initialMinute)
const hourPicked = ref(false)
const minutePicked = ref(false)

const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'))
const minutes = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'))

watch(model, (v) => {
  textValue.value = v
  const [h, m] = v.split(':')
  selectedHour.value = h
  selectedMinute.value = m
})

function togglePopup() {
  showPopup.value = !showPopup.value
  if (showPopup.value) {
    hourPicked.value = false
    minutePicked.value = false
  }
}

function applyIfBothPicked() {
  if (hourPicked.value && minutePicked.value) {
    model.value = `${selectedHour.value}:${selectedMinute.value}`
    textValue.value = model.value
    showPopup.value = false
  }
}

function pickHour(h: string) {
  selectedHour.value = h
  hourPicked.value = true
  applyIfBothPicked()
}

function pickMinute(m: string) {
  selectedMinute.value = m
  minutePicked.value = true
  applyIfBothPicked()
}

function onBlur() {
  const parsed = parseLooseTime(textValue.value)
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
.time-field {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
}
.time-field-input {
  padding: 0.5rem 0.75rem;
  border-radius: 0.5rem;
  border: 1px solid var(--color-muted);
  background: var(--color-surface);
  color: var(--color-text);
  font-size: 0.95rem;
  width: 5rem;
}
.time-field-icon {
  background: none;
  border: none;
  font-size: 1.2rem;
  cursor: pointer;
}
.time-field-popup {
  position: absolute;
  top: 100%;
  left: 0;
  z-index: 40;
  background: var(--color-surface);
  border: 1px solid var(--color-muted);
  border-radius: 0.5rem;
  padding: 0.5rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  display: flex;
  gap: 0.5rem;
}
.time-column {
  max-height: 10rem;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}
.time-cell {
  background: none;
  border: none;
  padding: 0.3rem 0.75rem;
  cursor: pointer;
  color: var(--color-text);
  font-size: 0.85rem;
  text-align: center;
}
.time-cell:hover {
  background: var(--color-bg);
}
.time-cell.selected {
  background: var(--color-accent);
  color: var(--color-accent-contrast);
}
</style>
