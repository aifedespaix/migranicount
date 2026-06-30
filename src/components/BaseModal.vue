<template>
  <div class="base-backdrop" :style="{ '--z': zIndex }" @pointerdown.stop @touchstart.stop>
    <div class="base-panel">
      <AppModalCloseBtn class="base-close" @click="$emit('close')" />
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
import AppModalCloseBtn from './AppModalCloseBtn.vue'

withDefaults(defineProps<{ zIndex?: number }>(), { zIndex: 50 })
defineEmits<{ close: [] }>()
</script>

<style scoped>
.base-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: var(--z, 50);
}
.base-panel {
  background: var(--color-surface);
  color: var(--color-text);
  border-radius: 0.75rem;
  position: relative;
  overflow: hidden;
  max-height: 90dvh;
  overflow-y: auto;
}
.base-close {
  position: absolute;
  top: 0.5rem;
  right: 0.75rem;
  z-index: 1;
}
</style>
