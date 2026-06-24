<template>
  <div class="confirm-backdrop" @click.self="$emit('cancel')">
    <div class="confirm-dialog" role="alertdialog" aria-modal="true">
      <h3>{{ title }}</h3>
      <p>{{ message }}</p>
      <div class="confirm-actions">
        <button type="button" class="btn-secondary" @click="$emit('cancel')">{{ cancelLabel }}</button>
        <button type="button" class="btn-danger" @click="$emit('confirm')">{{ confirmLabel }}</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{ title: string; message: string; confirmLabel: string; cancelLabel: string }>()
defineEmits<{ confirm: []; cancel: [] }>()
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
</style>
