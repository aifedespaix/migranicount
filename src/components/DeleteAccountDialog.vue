<template>
  <div class="confirm-backdrop" @click.self="$emit('dismiss')">
    <div class="confirm-dialog" role="alertdialog" aria-modal="true">
      <h3>Supprimer mon compte</h3>
      <p>Cette action est irréversible. Toutes vos données seront définitivement effacées.</p>
      <p class="confirm-instruction">Tapez <strong>SUPPRIMER</strong> pour confirmer :</p>
      <input
        v-model="confirmText"
        type="text"
        class="confirm-input"
        placeholder="SUPPRIMER"
        :disabled="props.deleting"
        autocomplete="off"
      />
      <p v-if="props.error" class="confirm-error">{{ props.error }}</p>
      <div class="confirm-actions">
        <button type="button" class="btn-secondary" :disabled="props.deleting" @click="$emit('cancel')">
          Annuler
        </button>
        <button
          type="button"
          class="btn-danger"
          :disabled="confirmText !== 'SUPPRIMER' || props.deleting"
          @click="$emit('confirm')"
        >
          {{ props.deleting ? 'Suppression…' : 'Supprimer définitivement' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const props = defineProps<{
  deleting: boolean
  error: string
}>()

const confirmText = ref('')

defineEmits<{ confirm: []; cancel: []; dismiss: [] }>()
</script>

<style scoped>
.confirm-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 60;
}
.confirm-dialog {
  background: var(--color-surface);
  color: var(--color-text);
  border-radius: 0.75rem;
  padding: 1.5rem;
  width: min(90vw, 360px);
}
.confirm-dialog h3 {
  margin: 0 0 0.5rem;
  font-size: 1.05rem;
}
.confirm-dialog p {
  margin: 0 0 1.25rem;
  color: var(--color-muted);
  font-size: 0.9rem;
}
.confirm-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
}
.btn-secondary {
  background: none;
  border: 1px solid var(--color-muted);
  color: var(--color-text);
  border-radius: 0.5rem;
  padding: 0.5rem 1rem;
  cursor: pointer;
}
.btn-danger {
  background: var(--color-danger);
  color: white;
  border: none;
  border-radius: 0.5rem;
  padding: 0.5rem 1rem;
  cursor: pointer;
}
.confirm-instruction {
  margin: 0.75rem 0 0.4rem;
  font-size: 0.875rem;
  color: var(--color-text);
}
.confirm-input {
  width: 100%;
  box-sizing: border-box;
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--color-muted);
  border-radius: 0.5rem;
  background: var(--color-surface);
  color: var(--color-text);
  font: inherit;
  font-size: 0.9rem;
  margin-bottom: 0.75rem;
}
.confirm-input:disabled {
  opacity: 0.6;
}
.confirm-error {
  margin: 0 0 0.75rem;
  font-size: 0.875rem;
  color: var(--color-danger);
}
</style>
