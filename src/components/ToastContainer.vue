<template>
  <Teleport to="body">
    <div class="toast-container" aria-live="polite" aria-atomic="false">
      <TransitionGroup name="toast" tag="ul" class="toast-list">
        <li
          v-for="t in toast.toasts"
          :key="t.id"
          :class="['toast-item', `toast-${t.type}`]"
          @mouseenter="onPause(t.id)"
          @mouseleave="onResume(t.id)"
          @touchstart.passive="onPause(t.id)"
          @touchend.passive="onResume(t.id)"
        >
          <span class="toast-icon">{{ typeIcon(t.type) }}</span>
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
          <div
            v-if="t.duration > 0"
            class="toast-progress"
            :class="{ paused: paused.has(t.id) }"
            :style="{ '--toast-duration': t.duration + 'ms' }"
          />
        </li>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { onUnmounted, reactive, watch } from 'vue'
import { useToastStore, type ToastType } from '../stores/toast'

const toast = useToastStore()
const paused = reactive(new Set<string>())

// Per-toast timer: { startTime, remaining, timeoutId }
const timers = new Map<string, { startTime: number; remaining: number; timeoutId: ReturnType<typeof setTimeout> | null }>()

function typeIcon(type: ToastType): string {
  if (type === 'success') return '✓'
  if (type === 'danger') return '🗑'
  if (type === 'info') return '✎'
  return '⏳'
}

// Called when a toast is added (watched via the store)
watch(
  () => toast.toasts.map((t) => t.id),
  (newIds, oldIds) => {
    const added = newIds.filter((id) => !oldIds?.includes(id))
    for (const id of added) {
      const t = toast.toasts.find((x) => x.id === id)
      if (!t || t.duration <= 0) continue
      const info = { startTime: Date.now(), remaining: t.duration, timeoutId: null as ReturnType<typeof setTimeout> | null }
      timers.set(id, info)
      info.timeoutId = setTimeout(() => { toast.remove(id); timers.delete(id) }, t.duration)
    }
    // Clean up timers for removed toasts
    for (const [id, info] of timers) {
      if (!newIds.includes(id)) {
        if (info.timeoutId !== null) clearTimeout(info.timeoutId)
        timers.delete(id)
      }
    }
  },
  { immediate: true }
)

function onPause(id: string) {
  const info = timers.get(id)
  if (!info || info.timeoutId === null) return
  clearTimeout(info.timeoutId)
  info.remaining = Math.max(0, info.remaining - (Date.now() - info.startTime))
  info.timeoutId = null
  paused.add(id)
}

function onResume(id: string) {
  const info = timers.get(id)
  if (!info || info.timeoutId !== null) return
  paused.delete(id)
  info.startTime = Date.now()
  info.timeoutId = setTimeout(() => { toast.remove(id); timers.delete(id) }, info.remaining)
}

onUnmounted(() => {
  for (const info of timers.values()) {
    if (info.timeoutId !== null) clearTimeout(info.timeoutId)
  }
})
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
  padding: 0.65rem 0.9rem 0.85rem;
  border-radius: 0.5rem;
  font-size: 0.9rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  pointer-events: all;
  position: relative;
  overflow: hidden;
}
.toast-success { background: var(--color-success); color: var(--color-success-contrast); }
.toast-danger  { background: var(--color-danger);  color: white; }
.toast-info    { background: var(--color-info);    color: var(--color-info-contrast); }
.toast-pending {
  background: var(--color-surface);
  color: var(--color-text);
  border: 1px solid var(--color-muted);
}
.toast-icon { flex-shrink: 0; font-size: 1rem; }
.toast-message { flex: 1; }
.toast-action-btn {
  background: rgba(255,255,255,0.2);
  color: inherit;
  border: 1px solid rgba(255,255,255,0.4);
  border-radius: 0.35rem;
  padding: 0.25rem 0.6rem;
  font-size: 0.85rem;
  cursor: pointer;
  white-space: nowrap;
  font: inherit;
}
.toast-action-btn:hover { background: rgba(255,255,255,0.3); }
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
.toast-dismiss:hover { opacity: 1; }
.toast-progress {
  position: absolute;
  bottom: 0;
  left: 0;
  height: 3px;
  width: 100%;
  background: rgba(255, 255, 255, 0.5);
  transform-origin: left;
  animation: toast-progress-shrink var(--toast-duration) linear forwards;
}
.toast-pending .toast-progress { background: var(--color-muted); }
.toast-progress.paused { animation-play-state: paused; }
@keyframes toast-progress-shrink {
  from { transform: scaleX(1); }
  to   { transform: scaleX(0); }
}
.toast-enter-active { transition: transform 0.2s ease, opacity 0.2s ease; }
.toast-leave-active { transition: transform 0.18s ease, opacity 0.18s ease; }
.toast-enter-from   { transform: translateY(-1rem); opacity: 0; }
.toast-leave-to     { transform: translateY(-0.5rem); opacity: 0; }
@media (min-width: 1024px) {
  .toast-container { left: auto; right: 1.5rem; transform: none; }
}
</style>
