<template>
  <div class="unsaved-backdrop" @click.self="$emit('stay')">
    <div class="unsaved-dialog" role="alertdialog" aria-modal="true">
      <h3>{{ title }}</h3>
      <p>{{ message }}</p>
      <div class="unsaved-actions">
        <button type="button" class="btn-stay" @click="$emit('stay')">{{ stayLabel }}</button>
        <button type="button" class="btn-confirm" @click="$emit('confirm')">{{ confirmLabel }}</button>
        <button type="button" class="btn-discard" @click="$emit('discard')">{{ discardLabel }}</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  title: string
  message: string
  stayLabel: string
  confirmLabel: string
  discardLabel: string
}>()
defineEmits<{ stay: []; confirm: []; discard: [] }>()
</script>

<style scoped>
.unsaved-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 70;
}
.unsaved-dialog {
  background: var(--color-surface);
  color: var(--color-text);
  border-radius: 0.75rem;
  padding: 1.5rem;
  width: min(90vw, 360px);
}
.unsaved-dialog h3 {
  margin: 0 0 0.5rem;
  font-size: 1.05rem;
}
.unsaved-dialog p {
  margin: 0 0 1.25rem;
  color: var(--color-muted);
  font-size: 0.9rem;
}
.unsaved-actions {
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
.btn-confirm {
  background: none;
  border: 1px solid var(--color-accent);
  color: var(--color-accent);
  border-radius: 0.5rem;
  padding: 0.6rem 1rem;
  cursor: pointer;
  font-size: 0.9rem;
}
.btn-discard {
  background: none;
  border: 1px solid var(--color-muted);
  color: var(--color-muted);
  border-radius: 0.5rem;
  padding: 0.6rem 1rem;
  cursor: pointer;
  font-size: 0.9rem;
}
</style>
