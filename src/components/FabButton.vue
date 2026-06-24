<template>
  <button class="fab" @click="$emit('click')" aria-label="Ajouter une migraine">+</button>
</template>

<script setup lang="ts">
defineEmits<{ click: [] }>()
</script>

<style scoped>
.fab {
  position: fixed;
  bottom: 4.5rem;
  right: 1.25rem;
  width: 3.5rem;
  height: 3.5rem;
  border-radius: 50%;
  border: none;
  background: var(--color-accent);
  color: var(--color-accent-contrast);
  font-size: 1.75rem;
  box-shadow: 0 4px 12px rgba(0,0,0,0.25);
  cursor: pointer;
  z-index: 20;
}
@media (min-width: 1024px) {
  .fab { display: none; }
}
</style>
