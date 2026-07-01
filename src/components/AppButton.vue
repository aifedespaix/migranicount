<template>
  <button
    class="app-btn"
    :class="[
      `app-btn--${variant}`,
      ghost && 'app-btn--ghost',
      size && `app-btn--${size}`,
    ]"
    v-bind="$attrs"
  >
    <slot />
  </button>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  variant?: 'primary' | 'danger' | 'muted' | 'info' | 'warning'
  ghost?: boolean
  size?: 'sm' | 'md' | 'lg'
}>(), {
  variant: 'muted',
  ghost: false,
})
</script>

<style scoped>
.app-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  border-radius: 0.5rem;
  border: 1px solid transparent;
  font: inherit;
  font-size: 0.85rem;
  cursor: pointer;
  padding: 0.5rem 1rem;
  white-space: nowrap;
  transition: background 0.15s ease, color 0.15s ease, border-color 0.15s ease, transform 0.1s ease;
  outline: none;
}
.app-btn:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
}
.app-btn:active { transform: scale(0.95); }
.app-btn:disabled { opacity: 0.45; cursor: not-allowed; pointer-events: none; }

.app-btn--sm { padding: 0.35rem 0.7rem; font-size: 0.8rem; }
.app-btn--lg { padding: 0.65rem 1.25rem; font-size: 0.95rem; }

/* ── Filled ─────────────────────────────────────────────────── */
.app-btn--danger:not(.app-btn--ghost) {
  background: var(--color-danger);
  color: white;
  border-color: var(--color-danger);
}
.app-btn--danger:not(.app-btn--ghost):hover {
  background: color-mix(in srgb, var(--color-danger) 82%, black);
}

.app-btn--info:not(.app-btn--ghost) {
  background: var(--color-info);
  color: var(--color-info-contrast);
  border-color: var(--color-info);
}
.app-btn--info:not(.app-btn--ghost):hover {
  background: color-mix(in srgb, var(--color-info) 82%, black);
}

.app-btn--primary:not(.app-btn--ghost) {
  background: var(--color-accent);
  color: var(--color-accent-contrast);
  border-color: var(--color-accent);
}
.app-btn--primary:not(.app-btn--ghost):hover {
  background: color-mix(in srgb, var(--color-accent) 82%, black);
}

.app-btn--warning:not(.app-btn--ghost) {
  background: var(--color-warning);
  color: var(--color-warning-contrast);
  border-color: var(--color-warning);
}
.app-btn--warning:not(.app-btn--ghost):hover {
  background: color-mix(in srgb, var(--color-warning) 82%, black);
}

.app-btn--muted:not(.app-btn--ghost) {
  background: color-mix(in srgb, var(--color-muted) 12%, transparent);
  color: var(--color-text);
  border-color: var(--color-muted);
}
.app-btn--muted:not(.app-btn--ghost):hover {
  background: color-mix(in srgb, var(--color-muted) 22%, transparent);
}

/* ── Hover shadow for filled variants ──────────────────────── */
.app-btn--primary:not(.app-btn--ghost):hover,
.app-btn--danger:not(.app-btn--ghost):hover,
.app-btn--info:not(.app-btn--ghost):hover,
.app-btn--warning:not(.app-btn--ghost):hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

/* ── Ghost ──────────────────────────────────────────────────── */
.app-btn--ghost.app-btn--danger {
  background: transparent;
  color: var(--color-danger);
  border-color: var(--color-danger);
}
.app-btn--ghost.app-btn--danger:hover {
  background: var(--color-danger);
  color: white;
}

.app-btn--ghost.app-btn--muted {
  background: transparent;
  color: var(--color-muted);
  border-color: var(--color-muted);
}
.app-btn--ghost.app-btn--muted:hover {
  background: color-mix(in srgb, var(--color-muted) 15%, transparent);
  color: var(--color-text);
  border-color: var(--color-text);
}

.app-btn--ghost.app-btn--info {
  background: transparent;
  color: var(--color-info);
  border-color: var(--color-info);
}
.app-btn--ghost.app-btn--info:hover {
  background: var(--color-info);
  color: var(--color-info-contrast);
}

.app-btn--ghost.app-btn--primary {
  background: transparent;
  color: var(--color-accent);
  border-color: var(--color-accent);
}
.app-btn--ghost.app-btn--primary:hover {
  background: var(--color-accent);
  color: var(--color-accent-contrast);
}

.app-btn--ghost.app-btn--warning {
  background: transparent;
  color: var(--color-warning);
  border-color: var(--color-warning);
}
.app-btn--ghost.app-btn--warning:hover {
  background: var(--color-warning);
  color: var(--color-warning-contrast);
}
</style>
