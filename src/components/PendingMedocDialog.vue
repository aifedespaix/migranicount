<template>
  <div class="pending-backdrop" @click.self="$emit('stay')">
    <div class="pending-dialog" role="alertdialog" aria-modal="true">
      <h3>Prise non ajoutée</h3>
      <p>Tu as saisi un médicament sans cliquer sur « Ajouter cette prise ».</p>
      <div class="pending-actions">
        <button type="button" class="btn-stay" @click="$emit('stay')">Compléter la saisie</button>
        <button type="button" class="btn-add" @click="$emit('add-and-continue')">Ajouter et continuer</button>
        <button type="button" class="btn-skip" @click="$emit('skip')">Passer sans ajouter</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineEmits<{ stay: []; skip: []; 'add-and-continue': [] }>()
</script>

<style scoped>
.pending-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 60;
}
.pending-dialog {
  background: var(--color-surface);
  color: var(--color-text);
  border-radius: 0.75rem;
  padding: 1.5rem;
  width: min(90vw, 360px);
}
.pending-dialog h3 {
  margin: 0 0 0.5rem;
  font-size: 1.05rem;
}
.pending-dialog p {
  margin: 0 0 1.25rem;
  color: var(--color-muted);
  font-size: 0.9rem;
}
.pending-actions {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.btn-stay {
  background: var(--color-accent);
  color: var(--color-accent-contrast);
  border: none;
  border-radius: 0.5rem;
  padding: 0.6rem 1rem;
  cursor: pointer;
  font-size: 0.9rem;
}
.btn-add {
  background: none;
  border: 1px solid var(--color-accent);
  color: var(--color-accent);
  border-radius: 0.5rem;
  padding: 0.6rem 1rem;
  cursor: pointer;
  font-size: 0.9rem;
}
.btn-skip {
  background: none;
  border: 1px solid var(--color-muted);
  color: var(--color-muted);
  border-radius: 0.5rem;
  padding: 0.6rem 1rem;
  cursor: pointer;
  font-size: 0.9rem;
}
</style>
