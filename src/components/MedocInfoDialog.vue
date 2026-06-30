<template>
  <div class="dialog-backdrop">
    <div class="dialog-card">
      <div class="dialog-header">
        <div class="dialog-icon-wrap">
          <Pill :size="18" />
        </div>
        <div class="dialog-title-block">
          <h3 class="dialog-title">{{ medoc.nom }}</h3>
          <span v-if="medoc.heure" class="dialog-subtitle">Pris à {{ medoc.heure }}</span>
        </div>
        <AppModalCloseBtn @click="$emit('close')" />
      </div>

      <div v-if="medoc.description" class="dialog-section">
        <p class="dialog-description">{{ medoc.description }}</p>
      </div>

      <div v-if="medoc.posologieParJour || medoc.intervalleHeures" class="dialog-info-list">
        <div v-if="medoc.posologieParJour" class="dialog-info-row">
          <div class="info-icon-wrap"><RefreshCw :size="12" /></div>
          <div class="info-text">
            <span class="info-label">Posologie</span>
            <span class="info-value">{{ medoc.posologieParJour }} prise{{ medoc.posologieParJour > 1 ? 's' : '' }} par jour</span>
          </div>
        </div>
        <div v-if="medoc.intervalleHeures" class="dialog-info-row">
          <div class="info-icon-wrap"><Clock :size="12" /></div>
          <div class="info-text">
            <span class="info-label">Intervalle minimum</span>
            <span class="info-value">{{ medoc.intervalleHeures }}h entre deux prises</span>
          </div>
        </div>
      </div>

      <div class="dialog-footer">
        <button type="button" class="dialog-close-btn" @click="$emit('close')">Fermer</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Pill, Clock, RefreshCw } from 'lucide-vue-next'
import AppModalCloseBtn from './AppModalCloseBtn.vue'
import type { MedocPris } from '../types/migraine'

defineProps<{ medoc: MedocPris }>()
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
  padding: 1rem;
}
.dialog-card {
  background: var(--color-surface);
  color: var(--color-text);
  border-radius: 1rem;
  width: min(92vw, 340px);
  display: flex;
  flex-direction: column;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.25);
  overflow: hidden;
}

/* Header */
.dialog-header {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 1.1rem 1.1rem 0.75rem;
}
.dialog-icon-wrap {
  width: 2.2rem;
  height: 2.2rem;
  border-radius: 0.6rem;
  background: color-mix(in srgb, var(--color-accent) 14%, transparent);
  color: var(--color-accent);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-top: 0.1rem;
}
.dialog-title-block {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
}
.dialog-title {
  margin: 0;
  font-weight: 700;
  font-size: 1rem;
  line-height: 1.3;
}
.dialog-subtitle {
  font-size: 0.75rem;
  color: var(--color-muted);
}
/* Description */
.dialog-section {
  padding: 0 1.1rem 0.75rem;
}
.dialog-description {
  margin: 0;
  font-size: 0.85rem;
  color: var(--color-muted);
  line-height: 1.5;
}

/* Info rows */
.dialog-info-list {
  margin: 0 1.1rem 0.75rem;
  border-radius: 0.6rem;
  background: var(--color-bg);
  overflow: hidden;
}
.dialog-info-row {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  padding: 0.6rem 0.75rem;
  border-bottom: 1px solid color-mix(in srgb, var(--color-muted) 15%, transparent);
}
.dialog-info-row:last-child { border-bottom: none; }
.info-icon-wrap {
  width: 1.6rem;
  height: 1.6rem;
  border-radius: 0.4rem;
  background: color-mix(in srgb, var(--color-accent) 10%, transparent);
  color: var(--color-accent);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.info-text {
  display: flex;
  flex-direction: column;
  gap: 0.05rem;
}
.info-label {
  font-size: 0.68rem;
  color: var(--color-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  font-weight: 600;
}
.info-value {
  font-size: 0.85rem;
  font-weight: 500;
}

/* Footer */
.dialog-footer {
  padding: 0.75rem 1.1rem 1rem;
  display: flex;
  justify-content: flex-end;
}
.dialog-close-btn {
  background: transparent;
  border: 1px solid var(--color-danger);
  color: var(--color-danger);
  border-radius: 0.5rem;
  padding: 0.45rem 1.1rem;
  cursor: pointer;
  font-size: 0.85rem;
  font: inherit;
  transition: background 0.15s ease, color 0.15s ease;
}
.dialog-close-btn:hover {
  background: var(--color-danger);
  color: white;
}
</style>
