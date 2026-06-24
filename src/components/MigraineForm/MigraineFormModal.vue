<template>
  <div class="modal-backdrop" @click.self="requestClose">
    <div class="modal-sheet">
      <header class="modal-header">
        <div class="modal-header-text">
          <p class="modal-progress">Étape {{ stepIndex + 1 }} / {{ steps.length }}</p>
          <h1 class="modal-title">{{ stepTitles[stepIndex] }}</h1>
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

      <div class="modal-body">
        <component :is="steps[stepIndex]" v-model="draft" />
      </div>

      <div class="modal-actions">
        <button type="button" class="action-btn" :disabled="stepIndex === 0" @click="stepIndex--">
          Précédent
        </button>
        <button
          type="button"
          class="action-btn action-btn-primary"
          :disabled="stepIndex !== steps.length - 1"
          @click="submit"
        >
          Enregistrer
        </button>
        <button
          type="button"
          class="action-btn"
          :disabled="stepIndex === steps.length - 1"
          @click="stepIndex++"
        >
          Suivant
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
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import StepWhen from './StepWhen.vue'
import StepIntensity from './StepIntensity.vue'
import StepMedocs from './StepMedocs.vue'
import StepSymptoms from './StepSymptoms.vue'
import StepLocationTriggers from './StepLocationTriggers.vue'
import StepNotes from './StepNotes.vue'
import StepRecap from './StepRecap.vue'
import ConfirmDialog from '../ConfirmDialog.vue'
import { loadDraft, saveDraft, clearDraft } from './draft'
import { useMigrainesStore } from '../../stores/migraines'

const props = defineProps<{ editId?: string }>()
const emit = defineEmits<{ close: []; saved: [] }>()
const migraines = useMigrainesStore()

const steps = [StepWhen, StepIntensity, StepMedocs, StepSymptoms, StepLocationTriggers, StepNotes, StepRecap]
const stepTitles = ['Quand ?', 'Intensité', 'Médicaments', 'Symptômes', 'Localisation & déclencheurs', 'Notes', 'Récapitulatif']
const stepIndex = ref(props.editId ? steps.length - 1 : 0)
const draft = ref(props.editId ? { ...migraines.getById(props.editId)! } : loadDraft())
const initialSnapshot = props.editId ? JSON.stringify(draft.value) : null
const showConfirmDialog = ref(false)

const progressPercent = computed(() => ((stepIndex.value + 1) / steps.length) * 100)

watch(draft, (d) => { if (!props.editId) saveDraft(d) }, { deep: true })

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
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  border-radius: 1rem 1rem 0 0;
  overflow: hidden;
}
.modal-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 1.25rem 1.5rem 0.5rem;
}
.modal-progress {
  margin: 0 0 0.15rem;
  font-size: 0.75rem;
  color: var(--color-muted);
  text-transform: uppercase;
  letter-spacing: 0.03em;
}
.modal-title {
  margin: 0;
  font-size: 1.15rem;
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
  padding: 1.25rem 1.5rem;
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
.action-btn-primary {
  background: var(--color-accent);
  color: var(--color-accent-contrast);
  border-color: var(--color-accent);
}
.action-btn-primary:disabled {
  background: var(--color-muted);
  border-color: var(--color-muted);
  color: var(--color-surface);
  opacity: 0.6;
}
@media (min-width: 1024px) {
  .modal-backdrop {
    align-items: center;
    justify-content: center;
  }
  .modal-sheet {
    width: 480px;
    max-height: 85vh;
    border-radius: 1rem;
  }
}
</style>
