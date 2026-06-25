<template>
  <Teleport to="body">
    <div class="toast-container" aria-live="polite" aria-atomic="false">
      <TransitionGroup name="toast" tag="ul" class="toast-list">
        <li v-for="t in toast.toasts" :key="t.id" :class="['toast-item', `toast-${t.type}`]">
          <span class="toast-icon">{{ t.type === 'success' ? '✓' : '⏳' }}</span>
          <span class="toast-message">{{ t.message }}</span>
          <button
            v-if="t.action"
            type="button"
            class="toast-action-btn"
            @click="t.action!.handler()"
          >{{ t.action.label }}</button>
          <button
            type="button"
            class="toast-dismiss"
            aria-label="Fermer"
            @click="toast.remove(t.id)"
          >×</button>
        </li>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { useToastStore } from '../stores/toast'

const toast = useToastStore()
</script>

<style scoped>
.toast-container {
  position: fixed;
  top: 4.5rem;
  left: 50%;
  transform: translateX(-50%);
  z-index: 100;
  width: min(92vw, 400px);
  pointer-events: none;
}
.toast-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.toast-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.65rem 0.9rem;
  border-radius: 0.5rem;
  font-size: 0.9rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  pointer-events: all;
}
.toast-success {
  background: var(--color-success);
  color: var(--color-success-contrast);
}
.toast-pending {
  background: var(--color-surface);
  color: var(--color-text);
  border: 1px solid var(--color-muted);
}
.toast-icon {
  flex-shrink: 0;
  font-size: 1rem;
}
.toast-message {
  flex: 1;
}
.toast-action-btn {
  background: var(--color-accent);
  color: var(--color-accent-contrast);
  border: none;
  border-radius: 0.35rem;
  padding: 0.25rem 0.6rem;
  font-size: 0.85rem;
  cursor: pointer;
  white-space: nowrap;
}
.toast-dismiss {
  background: none;
  border: none;
  font-size: 1.1rem;
  cursor: pointer;
  color: inherit;
  opacity: 0.6;
  padding: 0 0.15rem;
  flex-shrink: 0;
}
.toast-dismiss:hover {
  opacity: 1;
}
.toast-enter-active {
  transition: transform 0.2s ease, opacity 0.2s ease;
}
.toast-leave-active {
  transition: transform 0.18s ease, opacity 0.18s ease;
}
.toast-enter-from {
  transform: translateY(-1rem);
  opacity: 0;
}
.toast-leave-to {
  transform: translateY(-0.5rem);
  opacity: 0;
}
@media (min-width: 1024px) {
  .toast-container {
    left: auto;
    right: 1.5rem;
    transform: none;
  }
}
</style>
