<template>
  <div class="time-field" ref="rootRef">
    <!-- Mobile: native OS time picker -->
    <template v-if="isMobile">
      <input
        type="time"
        class="time-field-input time-field-native"
        :value="model"
        @change="onNativeChange"
      />
    </template>

    <!-- Desktop: custom scrollable columns -->
    <template v-else>
      <input
        type="text"
        class="time-field-input"
        v-model="textValue"
        placeholder="HH:mm"
        @blur="onBlur"
        @keydown.enter.prevent="onEnter"
        @click="openPopup"
      />
      <button type="button" class="time-field-icon" @click="togglePopup" aria-label="Choisir une heure">
        <Clock :size="16" />
      </button>
      <Teleport to="body">
        <div v-if="showPopup" ref="popupRef" class="time-field-popup" :style="popupStyle">
          <div class="time-columns">
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
          <div class="time-popup-footer">
            <button type="button" class="time-confirm-btn" @click="confirm">
              Confirmer
            </button>
          </div>
        </div>
      </Teleport>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { Clock } from 'lucide-vue-next'
import { useMediaQuery } from '@vueuse/core'
import { parseLooseTime } from '../utils/date'

const model = defineModel<string>({ required: true })

const isMobile = useMediaQuery('(pointer: coarse)')

const rootRef = ref<HTMLElement | null>(null)
const popupRef = ref<HTMLElement | null>(null)
const textValue = ref(model.value)
const showPopup = ref(false)
const popupStyle = ref({ top: '0px', left: '0px' })

const [initialHour, initialMinute] = model.value.split(':')
const selectedHour = ref(initialHour)
const selectedMinute = ref(initialMinute)

const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'))
const minutes = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'))

watch(model, (v) => {
  textValue.value = v
  const [h, m] = v.split(':')
  selectedHour.value = h
  selectedMinute.value = m
})

function onNativeChange(e: Event) {
  const val = (e.target as HTMLInputElement).value
  if (val) model.value = val
}

function updatePopupPosition() {
  if (!rootRef.value) return
  const rect = rootRef.value.getBoundingClientRect()
  const popupWidth = popupRef.value?.offsetWidth ?? 160
  const popupHeight = popupRef.value?.offsetHeight ?? 200
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

function scrollToSelected() {
  nextTick(() => {
    const cols = popupRef.value?.querySelectorAll('.time-column')
    if (!cols) return
    const hBtn = cols[0]?.querySelector('.time-cell.selected') as HTMLElement | null
    const mBtn = cols[1]?.querySelector('.time-cell.selected') as HTMLElement | null
    hBtn?.scrollIntoView({ block: 'center' })
    mBtn?.scrollIntoView({ block: 'center' })
  })
}

function openPopup() {
  if (showPopup.value) return
  showPopup.value = true
  updatePopupPosition()
  nextTick(() => {
    updatePopupPosition()
    scrollToSelected()
  })
}

function togglePopup() {
  if (showPopup.value) {
    showPopup.value = false
  } else {
    openPopup()
  }
}

function applySelection() {
  model.value = `${selectedHour.value}:${selectedMinute.value}`
  textValue.value = model.value
}

function confirm() {
  applySelection()
  showPopup.value = false
}

function pickHour(h: string) {
  selectedHour.value = h
  applySelection()
}

function pickMinute(m: string) {
  selectedMinute.value = m
  applySelection()
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
    const popupEl = popupRef.value
    if (popupEl && popupEl.contains(e.target as Node)) return
    showPopup.value = false
  }
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
  cursor: pointer;
}
.time-field-native {
  width: auto;
  min-width: 5rem;
}
.time-field-icon {
  background: none;
  border: none;
  font-size: 1.2rem;
  cursor: pointer;
  color: var(--color-muted);
  display: flex;
  align-items: center;
}
.time-field-popup {
  position: fixed;
  z-index: 40;
  background: var(--color-surface);
  border: 1px solid var(--color-muted);
  border-radius: 0.5rem;
  padding: 0.5rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.time-columns {
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
.time-popup-footer {
  border-top: 1px solid var(--color-bg);
  padding-top: 0.4rem;
  display: flex;
  justify-content: center;
}
.time-confirm-btn {
  background: var(--color-accent);
  color: var(--color-accent-contrast);
  border: none;
  border-radius: 0.4rem;
  padding: 0.3rem 1rem;
  font-size: 0.8rem;
  cursor: pointer;
  font-weight: 600;
  width: 100%;
}
.time-confirm-btn:hover {
  opacity: 0.9;
}
</style>
