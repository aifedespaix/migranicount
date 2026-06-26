<template>
  <div class="dialog-backdrop" @click.self="$emit('close')">
    <div class="dialog-card">
      <h3 class="dialog-title">{{ medoc.nom }}</h3>
      <p v-if="medoc.description" class="dialog-description">{{ medoc.description }}</p>
      <template v-if="medoc.posologieParJour || medoc.intervalleHeures">
        <p v-if="medoc.posologieParJour" class="dialog-field">{{ medoc.posologieParJour }}× par jour</p>
        <p v-if="medoc.intervalleHeures" class="dialog-field">≥ {{ medoc.intervalleHeures }}h entre deux prises</p>
      </template>
      <button type="button" class="dialog-close" @click="$emit('close')">Fermer</button>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  medoc: { nom: string; description?: string; posologieParJour?: number; intervalleHeures?: number }
}>()
defineEmits<{ close: [] }>()
</script>

<style scoped>
.dialog-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 60;
}
.dialog-card {
  background: var(--color-surface);
  color: var(--color-text);
  border-radius: 0.75rem;
  padding: 1.5rem;
  width: min(90vw, 320px);
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.dialog-title {
  margin: 0 0 0.25rem;
  font-weight: 600;
  font-size: 1rem;
}
.dialog-description {
  margin: 0;
  font-size: 0.85rem;
  color: var(--color-muted);
}
.dialog-field {
  margin: 0;
  font-size: 0.9rem;
  color: var(--color-text);
}
.dialog-close {
  margin-top: 0.75rem;
  align-self: flex-end;
  background: transparent;
  border: 1px solid var(--color-muted);
  color: var(--color-text);
  border-radius: 0.5rem;
  padding: 0.5rem 1rem;
  cursor: pointer;
  font-size: 0.9rem;
}
.dialog-close:hover {
  background: color-mix(in srgb, var(--color-muted) 15%, transparent);
}
</style>
