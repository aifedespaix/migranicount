<template>
  <span class="badge-host">
    <slot />
    <span v-if="count > 0" class="badge-count">{{ count > 99 ? '99+' : count }}</span>
  </span>
</template>

<script setup lang="ts">
defineProps<{ count: number }>()
</script>

<style scoped>
.badge-host {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.badge-count {
  position: absolute;
  top: -4px;
  right: -6px;
  background: var(--color-accent);
  color: var(--color-accent-contrast);
  font-size: 0.5rem;
  font-weight: 700;
  border-radius: 9999px;
  min-width: 0.85rem;
  height: 0.85rem;
  padding: 0 0.2rem;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
  pointer-events: none;
}
</style>
