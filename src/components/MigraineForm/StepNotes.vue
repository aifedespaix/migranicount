<template>
  <div class="step">
    <h2>Notes</h2>
    <textarea
      v-model="model.notes"
      rows="5"
      maxlength="500"
      placeholder="Notes libres (optionnel)"
      class="notes-textarea"
    ></textarea>
    <p class="char-counter">{{ (model.notes ?? '').length }} / 500</p>
  </div>
</template>

<script setup lang="ts">
import type { MigraineDraft } from './draft'
const model = defineModel<MigraineDraft>({ required: true })
</script>

<style scoped>
.notes-textarea {
  width: 100%;
  box-sizing: border-box;
  padding: 0.75rem;
  border-radius: 0.5rem;
  border: 1px solid var(--color-muted);
  background: var(--color-surface);
  color: var(--color-text);
  font-family: inherit;
  font-size: 0.95rem;
  resize: vertical;
}
.char-counter {
  text-align: right;
  font-size: 0.8rem;
  color: var(--color-muted);
  margin: 0.25rem 0 0;
}
</style>
