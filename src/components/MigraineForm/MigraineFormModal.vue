<template>
  <div class="modal-backdrop" @click.self="requestClose" @pointerdown.stop>
    <div class="modal-sheet">
      <header class="modal-header">
        <div class="modal-title-row">
          <span class="modal-form-title">{{ props.editId ? 'Modifier une migraine' : 'Référencer une migraine' }}</span>
        </div>
        <div class="stepper-nav" ref="stepperNavRef" role="tablist">
          <button
            v-for="(icon, i) in stepIcons"
            :key="i"
            type="button"
            class="stepper-btn"
            :class="{ active: i === stepIndex, past: props.editId ? i !== stepIndex : i < stepIndex }"
            role="tab"
            :aria-selected="i === stepIndex"
            :aria-label="stepTitles[i]"
            @click="goToStep(i)"
          >
            <component :is="icon" :size="14" />
            <span class="stepper-label">{{ stepShortTitles[i] }}</span>
          </button>
        </div>
        <button
          type="button"
          class="modal-close-btn"
          :title="props.editId ? 'Fermer' : 'Fermer (brouillon conservé)'"
          aria-label="Fermer"
          @click="requestClose"
        >
          ×
        </button>
      </header>
      <div class="progress-bar">
        <div class="progress-bar-fill" :style="{ width: progressPercent + '%' }"></div>
      </div>

      <div class="modal-body" :class="{ transitioning: isTransitioning }" ref="modalBodyRef" :style="transitionBodyStyle">
        <div class="modal-body-inner">
          <Transition
            :name="transitionName"
            @before-enter="onBeforeEnter"
            @after-leave="onAfterLeave"
          >
            <component :is="steps[stepIndex]" v-model="draft" :key="stepIndex" />
          </Transition>
        </div>
      </div>

      <div class="modal-actions">
        <button
          type="button"
          class="action-btn action-btn-prev"
          :style="prevVisible ? {} : { visibility: 'hidden' }"
          @click="goPrev"
        >
          <ArrowLeft :size="16" />
          Préc.
        </button>
        <button
          type="button"
          class="action-btn action-btn-save"
          :disabled="!canSave"
          @click="submit"
        >
          <Save :size="16" />
          Enregistrer
        </button>
        <button
          type="button"
          class="action-btn action-btn-next"
          :style="nextVisible ? {} : { visibility: 'hidden' }"
          @click="goNext"
        >
          Suiv.
          <ArrowRight :size="16" />
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { useSwipe } from '@vueuse/core'
import { Save, ArrowRight, ArrowLeft, Clock, Gauge, Pill, Heart, MapPin, Zap, FileText, CheckSquare } from 'lucide-vue-next'
import { nextStepIndex, prevStepIndex } from './stepNav'
import StepWhen from './StepWhen.vue'
import StepIntensity from './StepIntensity.vue'
import StepMedocs from './StepMedocs.vue'
import StepSymptoms from './StepSymptoms.vue'
import StepLocation from './StepLocation.vue'
import StepTriggers from './StepTriggers.vue'
import StepNotes from './StepNotes.vue'
import StepRecap from './StepRecap.vue'
import { loadDraft, saveDraft, clearDraft, canSaveDraft, loadDraftStep, saveDraftStep } from './draft'
import { useMigrainesStore } from '../../stores/migraines'

const props = defineProps<{ editId?: string }>()
const emit = defineEmits<{ close: []; saved: [] }>()
const migraines = useMigrainesStore()

const steps = [StepWhen, StepIntensity, StepMedocs, StepSymptoms, StepLocation, StepTriggers, StepNotes, StepRecap]
const stepTitles = ['Quand ?', 'Intensité', 'Médicaments', 'Symptômes', 'Zone', 'Déclencheurs', 'Notes', 'Récapitulatif']
const stepShortTitles = ['Quand', 'Intensité', 'Médocs', 'Symptômes', 'Zone', 'Déclencheurs', 'Notes', 'Récap']
const stepIcons = [Clock, Gauge, Pill, Heart, MapPin, Zap, FileText, CheckSquare]

const stepIndex = ref(props.editId ? steps.length - 1 : loadDraftStep())
const draft = ref(props.editId ? { ...migraines.getById(props.editId)! } : loadDraft())

const progressPercent = computed(() => ((stepIndex.value + 1) / steps.length) * 100)
const canSave = computed(() => canSaveDraft(draft.value))

const modalBodyRef = ref<HTMLElement | null>(null)
const stepperNavRef = ref<HTMLElement | null>(null)
const transitionName = ref<'slide-next' | 'slide-prev'>('slide-next')
const isTransitioning = ref(false)
const transitionBodyHeight = ref<number | null>(null)

const transitionBodyStyle = computed(() =>
  transitionBodyHeight.value !== null
    ? { minHeight: transitionBodyHeight.value + 'px' }
    : {}
)

const prevVisible = computed(() => stepIndex.value > 0)
const nextVisible = computed(() => stepIndex.value < steps.length - 1)

function onBeforeEnter() {
  transitionBodyHeight.value = modalBodyRef.value?.offsetHeight ?? null
  isTransitioning.value = true
}

function onAfterLeave() {
  isTransitioning.value = false
  transitionBodyHeight.value = null
}

function goNext() {
  const next = nextStepIndex(stepIndex.value, steps.length)
  if (next === stepIndex.value) return
  transitionName.value = 'slide-next'
  stepIndex.value = next
  if (!props.editId) saveDraftStep(stepIndex.value)
}

function goPrev() {
  const prev = prevStepIndex(stepIndex.value, steps.length)
  if (prev === stepIndex.value) return
  transitionName.value = 'slide-prev'
  stepIndex.value = prev
  if (!props.editId) saveDraftStep(stepIndex.value)
}

function goToStep(i: number) {
  if (i === stepIndex.value) return
  transitionName.value = i > stepIndex.value ? 'slide-next' : 'slide-prev'
  stepIndex.value = i
  if (!props.editId) saveDraftStep(stepIndex.value)
}

useSwipe(modalBodyRef, {
  onSwipeEnd(_event, direction) {
    if (direction === 'left') goNext()
    else if (direction === 'right') goPrev()
  },
})

watch(draft, (d) => { if (!props.editId) saveDraft(d) }, { deep: true })

watch(stepIndex, async (i) => {
  await nextTick()
  const btn = stepperNavRef.value?.querySelectorAll('.stepper-btn')[i] as HTMLElement | undefined
  btn?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
})

function requestClose() {
  emit('close')
}

function submit() {
  migraines.save(draft.value)
  if (!props.editId) clearDraft()
  emit('saved')
}
</script>

<style scoped>
.modal-backdrop {
  position: fixed;
  top: 3.5rem;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.4);
  z-index: 30;
}
.modal-sheet {
  background: var(--color-surface);
  width: 100%;
  box-sizing: border-box;
  height: calc(100dvh - 3.5rem);
  display: flex;
  flex-direction: column;
  border-radius: 0;
  overflow: hidden;
}
.modal-header {
  display: flex;
  flex-direction: column;
  padding: 0.6rem 1rem 0.4rem;
  gap: 0.3rem;
}
.modal-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.modal-form-title {
  font-size: 0.7rem;
  font-weight: 600;
  color: var(--color-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.modal-header {
  position: relative;
}
.modal-close-btn {
  position: absolute;
  top: 0.5rem;
  right: 0.75rem;
  background: none;
  border: none;
  font-size: 1.5rem;
  line-height: 1;
  cursor: pointer;
  color: var(--color-muted);
  padding: 0.25rem;
}
.stepper-nav {
  display: flex;
  gap: 0.2rem;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
  padding-right: 2rem;
}
.stepper-nav::-webkit-scrollbar { display: none; }
.stepper-btn {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.2rem;
  padding: 0.3rem 0.5rem;
  border-radius: 0.4rem;
  border: 1px solid transparent;
  background: none;
  cursor: pointer;
  color: var(--color-muted);
  scroll-snap-align: start;
  min-width: 3rem;
}
.stepper-btn.past {
  color: var(--color-accent);
  opacity: 0.6;
}
.stepper-btn.active {
  color: var(--color-accent);
  border-color: var(--color-accent);
  background: color-mix(in srgb, var(--color-accent) 10%, transparent);
}
.stepper-label {
  font-size: 0.55rem;
  white-space: nowrap;
}
.progress-bar {
  height: 0.25rem;
  background: var(--color-bg);
  margin: 0 1.5rem;
  border-radius: 0.25rem;
  overflow: hidden;
}
.progress-bar-fill {
  height: 100%;
  background: var(--color-accent);
  transition: width 0.2s ease;
}
.modal-body {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  display: flex;
  flex-direction: column;
  position: relative;
}
.modal-body.transitioning {
  overflow: hidden;
}
.modal-body-inner {
  margin: auto;
  width: 100%;
  padding: 1.25rem 1.5rem;
  box-sizing: border-box;
  flex-shrink: 0;
  position: relative;
}
.slide-next-enter-active,
.slide-next-leave-active,
.slide-prev-enter-active,
.slide-prev-leave-active {
  transition: transform 0.22s ease, opacity 0.22s ease;
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  padding: 1.25rem 1.5rem;
}
.slide-next-enter-from {
  transform: translateX(100%);
  opacity: 0;
}
.slide-next-leave-to {
  transform: translateX(-100%);
  opacity: 0;
}
.slide-prev-enter-from {
  transform: translateX(-100%);
  opacity: 0;
}
.slide-prev-leave-to {
  transform: translateX(100%);
  opacity: 0;
}
.modal-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  border-top: 1px solid var(--color-bg);
  flex-shrink: 0;
}
.action-btn {
  flex: 1;
  min-width: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  padding: 0.6rem 0.5rem;
  border-radius: 0.5rem;
  border: 1px solid var(--color-muted);
  background: var(--color-surface);
  color: var(--color-text);
  font-size: 0.85rem;
  cursor: pointer;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.action-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.action-btn-save {
  background: var(--color-success);
  color: var(--color-success-contrast);
  border-color: var(--color-success);
}
.action-btn-save:disabled {
  background: var(--color-muted);
  border-color: var(--color-muted);
  color: var(--color-surface);
  opacity: 0.6;
}
.action-btn-next {
  background: var(--color-info);
  color: var(--color-info-contrast);
  border-color: var(--color-info);
}
.action-btn-prev {
  background: transparent;
  color: var(--color-info);
  border-color: var(--color-info);
}
@media (min-width: 1024px) {
  .modal-backdrop {
    top: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 2rem;
  }
  .modal-sheet {
    width: 480px;
    height: calc(100dvh - 4rem);
    border-radius: 1rem;
  }
}
</style>
