<template>
  <button class="close-btn" type="button" aria-label="Fermer" v-bind="$attrs">×</button>
</template>

<script setup lang="ts">
defineOptions({ inheritAttrs: false })
</script>

<style scoped>
.close-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  line-height: 1;
  cursor: pointer;
  color: var(--color-danger);
  padding: 0.25rem;
  transition: opacity 0.15s ease;
}
.close-btn:hover { opacity: 0.7; }
</style>
