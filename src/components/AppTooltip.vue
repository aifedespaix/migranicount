<template>
  <div class="tooltip-wrapper" :class="`tooltip--${placement}`" :data-tooltip="content">
    <slot />
  </div>
</template>

<script setup lang="ts">
withDefaults(defineProps<{ content: string; placement?: 'top' | 'bottom' }>(), {
  placement: 'bottom',
})
</script>

<style scoped>
.tooltip-wrapper {
  position: relative;
  display: inline-flex;
}
.tooltip-wrapper::after {
  content: attr(data-tooltip);
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  white-space: nowrap;
  padding: 0.3rem 0.6rem;
  background: var(--color-surface);
  border: 1px solid var(--color-muted);
  border-radius: 0.4rem;
  font-size: 0.72rem;
  color: var(--color-text);
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.15s ease;
  z-index: 100;
  box-shadow: 0 2px 8px rgba(0,0,0,0.12);
}
.tooltip--bottom::after {
  top: calc(100% + 0.35rem);
}
.tooltip--top::after {
  bottom: calc(100% + 0.35rem);
}
.tooltip-wrapper:hover::after {
  opacity: 1;
}
</style>
