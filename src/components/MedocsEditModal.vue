<template>
  <div class="medocs-edit-backdrop" @click.self="$emit('close')">
    <div class="medocs-edit-dialog" role="dialog" aria-modal="true">
      <h3>Modifier les médicaments</h3>
      <div v-for="f in favoris.favoris" :key="f.nom" class="medoc-edit-row">
        <p class="medoc-edit-nom">{{ f.nom }}</p>
        <textarea v-model="descriptions[f.nom]" placeholder="Description (optionnel)" rows="2" />
      </div>
      <p v-if="favoris.favoris.length === 0" class="medoc-edit-empty">Aucun médicament enregistré.</p>
      <div class="medocs-edit-actions">
        <button type="button" class="btn-secondary" @click="$emit('close')">Annuler</button>
        <button type="button" class="btn-primary" @click="save">Enregistrer</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive } from 'vue'
import { useMedocsFavorisStore } from '../stores/medocsFavoris'

const emit = defineEmits<{ close: [] }>()
const favoris = useMedocsFavorisStore()

const descriptions = reactive<Record<string, string>>(
  Object.fromEntries(favoris.favoris.map((f) => [f.nom, f.description ?? '']))
)

function save() {
  for (const f of favoris.favoris) {
    favoris.updateDescription(f.nom, descriptions[f.nom])
  }
  emit('close')
}
</script>

<style scoped>
.medocs-edit-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 60;
}
.medocs-edit-dialog {
  background: var(--color-surface);
  color: var(--color-text);
  border-radius: 0.75rem;
  padding: 1.5rem;
  width: min(90vw, 420px);
  max-height: 80vh;
  overflow-y: auto;
}
.medocs-edit-dialog h3 {
  margin: 0 0 1rem;
  font-size: 1.05rem;
}
.medoc-edit-row {
  margin-bottom: 0.75rem;
}
.medoc-edit-nom {
  margin: 0 0 0.3rem;
  font-weight: 600;
}
.medoc-edit-row textarea {
  width: 100%;
  padding: 0.5rem 0.75rem;
  border-radius: 0.5rem;
  border: 1px solid var(--color-muted);
  background: var(--color-bg);
  color: var(--color-text);
  font: inherit;
  resize: vertical;
  box-sizing: border-box;
}
.medoc-edit-empty {
  color: var(--color-muted);
  font-size: 0.9rem;
}
.medocs-edit-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-top: 1rem;
}
.btn-secondary {
  background: none;
  border: 1px solid var(--color-muted);
  color: var(--color-text);
  border-radius: 0.5rem;
  padding: 0.5rem 1rem;
  cursor: pointer;
}
.btn-primary {
  background: var(--color-accent);
  color: var(--color-accent-contrast);
  border: none;
  border-radius: 0.5rem;
  padding: 0.5rem 1rem;
  cursor: pointer;
}
</style>
