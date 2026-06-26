<template>
  <div class="modal-backdrop" @click.self="requestClose" @pointerdown.stop>
    <div class="modal-sheet">
      <header class="modal-header">
        <div class="stepper-nav" ref="stepperNavRef" role="tablist">
          <button
            v-for="(label, i) in stepShortTitles"
            :key="i"
            type="button"
            class="stepper-btn"
            :class="{ active: i === stepIndex, past: i < stepIndex }"
            role="tab"
            :aria-selected="i === stepIndex"
            :aria-label="stepTitles[i]"
            @click="goToStep(i)"
          >
            <span class="stepper-num">{{ i + 1 }}</span>
            <span class="stepper-label">{{ label }}</span>
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

      <div class="modal-body" :class="{ transitioning: isTransitioning }" ref="modalBodyRef">
        <Transition
          :name="transitionName"
          @before-enter="isTransitioning = true"
          @after-leave="isTransitioning = false"
        >
          <component :is="steps[stepIndex]" v-model="draft" :key="stepIndex" />
        </Transition>
      </div>

      <div class="modal-actions">
        <button
          type="button"
          class="action-btn action-btn-prev"
          :style="prevLabel ? {} : { visibility: 'hidden' }"
          @click="goPrev"
        >
          <ArrowLeft :size="18" />
          {{ prevLabel }}
        </button>
        <button
          type="button"
          class="action-btn action-btn-save"
          :disabled="!canSave"
          @click="submit"
        >
          <Save :size="18" />
          Enregistrer
        </button>
        <button
          type="button"
          class="action-btn action-btn-next"
          :style="nextLabel ? {} : { visibility: 'hidden' }"
          @click="goNext"
        >
          {{ nextLabel }}
          <ArrowRight :size="18" />
        </button>
      </div>
    </div>

    <ConfirmDialog
      v-if="showConfirmDialog"
      title="Annuler les modifications ?"
      message="Vous avez des modifications non enregistrées. Voulez-vous vraiment fermer sans enregistrer ?"
      confirm-label="Quitter sans enregistrer"
      cancel-label="Continuer l'édition"
      @confirm="confirmDiscardClose"
      @cancel="showConfirmDialog = false"
      @dismiss="showConfirmDialog = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { useSwipe } from '@vueuse/core'
import { Save, ArrowRight, ArrowLeft } from 'lucide-vue-next'
import { nextStepIndex, prevStepIndex } from './stepNav'
import StepWhen from './StepWhen.vue'
import StepIntensity from './StepIntensity.vue'
import StepMedocs from './StepMedocs.vue'
import StepSymptoms from './StepSymptoms.vue'
import StepLocation from './StepLocation.vue'
import StepTriggers from './StepTriggers.vue'
import StepNotes from './StepNotes.vue'
import StepRecap from './StepRecap.vue'
import ConfirmDialog from '../ConfirmDialog.vue'
import { loadDraft, saveDraft, clearDraft, canSaveDraft, loadDraftStep, saveDraftStep } from './draft'
import { useMigrainesStore } from '../../stores/migraines'

const props = defineProps<{ editId?: string }>()
const emit = defineEmits<{ close: []; saved: [] }>()
const migraines = useMigrainesStore()

const steps = [StepWhen, StepIntensity, StepMedocs, StepSymptoms, StepLocation, StepTriggers, StepNotes, StepRecap]
const stepTitles = ['Quand ?', 'Intensité', 'Médicaments', 'Symptômes', 'Localisation', 'Déclencheurs', 'Notes', 'Récapitulatif']
const stepShortTitles = ['Quand', 'Intensité', 'Médocs', 'Symptômes', 'Lieu', 'Déclencheurs', 'Notes', 'Récap']
const stepIndex = ref(props.editId ? steps.length - 1 : loadDraftStep())
const draft = ref(props.editId ? { ...migraines.getById(props.editId)! } : loadDraft())
const initialSnapshot = props.editId ? JSON.stringify(draft.value) : null
const showConfirmDialog = ref(false)

const progressPercent = computed(() => ((stepIndex.value + 1) / steps.length) * 100)
const canSave = computed(() => canSaveDraft(draft.value))

const modalBodyRef = ref<HTMLElement | null>(null)
const stepperNavRef = ref<HTMLElement | null>(null)
const transitionName = ref<'slide-next' | 'slide-prev'>('slide-next')
const isTransitioning = ref(false)

const prevLabel = computed(() => stepIndex.value > 0 ? stepTitles[stepIndex.value - 1] : null)
const nextLabel = computed(() => stepIndex.value < steps.length - 1 ? stepTitles[stepIndex.value + 1] : null)

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

function isDirty(): boolean {
  if (!props.editId) return false
  return JSON.stringify(draft.value) !== initialSnapshot
}

function requestClose() {
  if (isDirty()) {
    showConfirmDialog.value = true
  } else {
    emit('close')
  }
}

function confirmDiscardClose() {
  showConfirmDialog.value = false
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
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: flex-end;
  z-index: 30;
}
.modal-sheet {
  background: var(--color-surface);
  width: 100%;
  max-width: 100vw;
  box-sizing: border-box;
  min-height: 66.6667vh;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  border-radius: 1rem 1rem 0 0;
  overflow: hidden;
}
.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1rem 0.5rem;
  gap: 0.5rem;
}
.stepper-nav {
  display: flex;
  gap: 0.25rem;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
  flex: 1;
  min-width: 0;
}
.stepper-nav::-webkit-scrollbar { display: none; }
.stepper-btn {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.15rem;
  padding: 0.3rem 0.5rem;
  border-radius: 0.4rem;
  border: 1px solid transparent;
  background: none;
  cursor: pointer;
  color: var(--color-muted);
  scroll-snap-align: start;
  min-width: 2.5rem;
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
.stepper-num {
  font-size: 0.65rem;
  font-weight: 700;
  line-height: 1;
}
.stepper-label {
  font-size: 0.6rem;
  white-space: nowrap;
}
.modal-close-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  line-height: 1;
  cursor: pointer;
  color: var(--color-muted);
  padding: 0.25rem;
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
  padding: 1.25rem 1.5rem;
  position: relative;
}
.modal-body.transitioning {
  overflow: hidden;
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
  gap: 0.75rem;
  padding: 1rem 1.5rem;
  border-top: 1px solid var(--color-bg);
}
.action-btn {
  flex: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  padding: 0.65rem 1rem;
  border-radius: 0.5rem;
  border: 1px solid var(--color-muted);
  background: var(--color-surface);
  color: var(--color-text);
  font-size: 0.9rem;
  cursor: pointer;
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
.action-btn-next:disabled {
  background: var(--color-muted);
  border-color: var(--color-muted);
  color: var(--color-surface);
  opacity: 0.6;
}
.action-btn-prev {
  background: transparent;
  color: var(--color-info);
  border-color: var(--color-info);
}
.action-btn-prev:disabled {
  color: var(--color-muted);
  border-color: var(--color-muted);
  opacity: 0.6;
}
@media (min-width: 1024px) {
  .modal-backdrop {
    align-items: flex-end;
    justify-content: center;
    padding-bottom: 2rem;
  }
  .modal-sheet {
    width: 480px;
    min-height: 0;
    max-height: calc(100dvh - 7rem);
    border-radius: 1rem;
  }
}
</style>
