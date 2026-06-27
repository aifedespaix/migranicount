<template>
  <div class="dialog-backdrop" @click.self="$emit('close')">
    <div class="dialog-card">
      <div class="dialog-header">
        <Pill :size="16" class="dialog-icon" />
        <h3 class="dialog-title">{{ medoc.nom }}</h3>
      </div>

      <p v-if="medoc.description" class="dialog-description">{{ medoc.description }}</p>

      <div v-if="medoc.posologieParJour || medoc.intervalleHeures" class="dialog-info-list">
        <div v-if="medoc.posologieParJour" class="dialog-info-row">
          <RefreshCw :size="13" class="info-icon" />
          <span>{{ medoc.posologieParJour }}× par jour</span>
        </div>
        <div v-if="medoc.intervalleHeures" class="dialog-info-row">
          <Clock :size="13" class="info-icon" />
          <span>≥ {{ medoc.intervalleHeures }}h entre deux prises</span>
        </div>
      </div>

      <button type="button" class="dialog-close" @click="$emit('close')">Fermer</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Pill, Clock, RefreshCw } from 'lucide-vue-next'

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
  border-radius: 0.85rem;
  padding: 1.25rem 1.25rem 1rem;
  width: min(90vw, 300px);
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
}
.dialog-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.dialog-icon {
  color: var(--color-accent);
  flex-shrink: 0;
}
.dialog-title {
  margin: 0;
  font-weight: 700;
  font-size: 1rem;
}
.dialog-description {
  margin: 0;
  font-size: 0.85rem;
  color: var(--color-muted);
  line-height: 1.4;
}
.dialog-info-list {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  background: var(--color-bg);
  border-radius: 0.5rem;
  padding: 0.6rem 0.75rem;
}
.dialog-info-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.85rem;
}
.info-icon {
  color: var(--color-accent);
  flex-shrink: 0;
}
.dialog-close {
  margin-top: 0.25rem;
  align-self: flex-end;
  background: transparent;
  border: 1px solid var(--color-muted);
  color: var(--color-text);
  border-radius: 0.5rem;
  padding: 0.4rem 1rem;
  cursor: pointer;
  font-size: 0.85rem;
}
.dialog-close:hover {
  background: color-mix(in srgb, var(--color-muted) 15%, transparent);
}
</style>
