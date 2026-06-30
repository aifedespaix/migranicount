<template>
  <div
    ref="wrapperRef"
    class="tooltip-wrapper"
    @mouseenter="show"
    @mouseleave="hide"
    @focusin="show"
    @focusout="hide"
  >
    <slot />
    <Teleport to="body">
      <div
        v-if="visible && content"
        class="tooltip-popup"
        :style="popupStyle"
        role="tooltip"
      >
        {{ content }}
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick } from 'vue'

const props = withDefaults(defineProps<{
  content: string
  placement?: 'top' | 'bottom'
}>(), {
  placement: 'bottom',
})

const wrapperRef = ref<HTMLElement | null>(null)
const visible = ref(false)
const popupStyle = ref<Record<string, string>>({})

function show() {
  visible.value = true
  nextTick(position)
}

function hide() {
  visible.value = false
}

function position() {
  if (!wrapperRef.value) return
  const rect = wrapperRef.value.getBoundingClientRect()
  const cx = rect.left + rect.width / 2
  const style: Record<string, string> = {
    position: 'fixed',
    left: `${cx}px`,
    transform: 'translateX(-50%)',
    zIndex: '9999',
  }
  if (props.placement === 'top') {
    style.top = ''
    style.bottom = `${window.innerHeight - rect.top + 6}px`
  } else {
    style.bottom = ''
    style.top = `${rect.bottom + 6}px`
  }
  popupStyle.value = style
}
</script>

<style scoped>
.tooltip-wrapper {
  position: relative;
  display: inline-flex;
}
</style>

<style>
.tooltip-popup {
  position: fixed;
  white-space: nowrap;
  padding: 0.3rem 0.6rem;
  background: var(--color-surface);
  border: 1px solid var(--color-muted);
  border-radius: 0.4rem;
  font-size: 0.72rem;
  color: var(--color-text);
  pointer-events: none;
  z-index: 9999;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}
</style>
