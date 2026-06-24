<template>
  <div class="modal-backdrop" @click.self="close">
    <div class="modal-sheet">
      <div class="progress">Étape {{ stepIndex + 1 }} / {{ steps.length }}</div>
      <component :is="steps[stepIndex]" v-model="draft" />
      <div class="actions">
        <button v-if="stepIndex > 0" type="button" @click="stepIndex--">Précédent</button>
        <button v-if="stepIndex < steps.length - 1" type="button" @click="stepIndex++">Suivant</button>
        <button v-else type="button" @click="submit">Enregistrer</button>
        <button type="button" class="close-btn" @click="close">Fermer</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import StepWhen from './StepWhen.vue'
import StepIntensity from './StepIntensity.vue'
import StepMedocs from './StepMedocs.vue'
import StepSymptoms from './StepSymptoms.vue'
import StepLocationTriggers from './StepLocationTriggers.vue'
import StepNotes from './StepNotes.vue'
import StepRecap from './StepRecap.vue'
import { loadDraft, saveDraft, clearDraft } from './draft'
import { useMigrainesStore } from '../../stores/migraines'

const props = defineProps<{ editId?: string }>()
const emit = defineEmits<{ close: []; saved: [] }>()
const migraines = useMigrainesStore()

const steps = [StepWhen, StepIntensity, StepMedocs, StepSymptoms, StepLocationTriggers, StepNotes, StepRecap]
const stepIndex = ref(props.editId ? steps.length - 1 : 0)
const draft = ref(props.editId ? { ...migraines.getById(props.editId)! } : loadDraft())

watch(draft, (d) => { if (!props.editId) saveDraft(d) }, { deep: true })

function close() {
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
  position: fixed; inset: 0;
  background: rgba(0,0,0,0.4);
  display: flex; align-items: flex-end;
  z-index: 30;
}
.modal-sheet {
  background: var(--color-surface);
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  border-radius: 1rem 1rem 0 0;
  padding: 1.5rem;
}
@media (min-width: 1024px) {
  .modal-backdrop { align-items: center; justify-content: center; }
  .modal-sheet { width: 480px; border-radius: 1rem; }
}
</style>
