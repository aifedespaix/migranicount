<template>
  <Transition name="notice-slide">
    <div v-if="visible" class="analytics-notice" role="status" aria-live="polite">
      <p class="notice-text">
        Migracount utilise des statistiques anonymes, sans cookie, pour m'aider à améliorer
        l'app. <RouterLink to="/confidentialite/" @click="dismiss">En savoir plus</RouterLink>.
      </p>
      <div class="notice-actions">
        <button type="button" class="notice-btn notice-btn-secondary" @click="disable">
          Désactiver
        </button>
        <button type="button" class="notice-btn notice-btn-primary" @click="dismiss">
          Ok
        </button>
      </div>
      <button type="button" class="notice-close" aria-label="Fermer" @click="dismiss">×</button>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useSettingsStore } from '../stores/settings'
import { getJSON, setJSON } from '../storage/storage'

const SEEN_KEY = 'analytics-notice-seen'

const settings = useSettingsStore()
const seen = ref(getJSON<boolean>(SEEN_KEY, false))
const visible = ref(!seen.value && settings.analyticsEnabled)

function markSeen() {
  seen.value = true
  setJSON(SEEN_KEY, true)
  visible.value = false
}

function dismiss() {
  markSeen()
}

function disable() {
  settings.setAnalyticsEnabled(false)
  markSeen()
}
</script>

<style scoped>
.analytics-notice {
  position: fixed;
  left: 50%;
  bottom: calc(3.5rem + 0.75rem);
  transform: translateX(-50%);
  z-index: 40;
  width: min(92vw, 460px);
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem 0.75rem;
  padding: 0.85rem 2.25rem 0.85rem 1rem;
  border-radius: 0.75rem;
  background: var(--color-surface);
  color: var(--color-text);
  border: 1px solid color-mix(in srgb, var(--color-muted) 25%, transparent);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.18);
}
@media (min-width: 1024px) {
  .analytics-notice {
    left: auto;
    right: 1.5rem;
    bottom: 1.5rem;
    transform: none;
  }
}
.notice-text {
  flex: 1 1 100%;
  margin: 0;
  font-size: 0.85rem;
  line-height: 1.45;
}
.notice-text a {
  color: var(--color-accent);
}
.notice-actions {
  display: flex;
  gap: 0.5rem;
  margin-left: auto;
}
.notice-btn {
  font: inherit;
  font-size: 0.82rem;
  padding: 0.4rem 0.85rem;
  border-radius: 0.5rem;
  cursor: pointer;
}
.notice-btn-secondary {
  background: none;
  border: 1px solid var(--color-muted);
  color: var(--color-text);
}
.notice-btn-primary {
  background: var(--color-accent);
  border: 1px solid var(--color-accent);
  color: var(--color-accent-contrast);
}
.notice-close {
  position: absolute;
  top: 0.4rem;
  right: 0.5rem;
  background: none;
  border: none;
  font-size: 1.15rem;
  line-height: 1;
  color: var(--color-muted);
  cursor: pointer;
  padding: 0.25rem;
}
.notice-close:hover {
  color: var(--color-text);
}
.notice-slide-enter-active,
.notice-slide-leave-active {
  transition: transform 0.25s ease, opacity 0.25s ease;
}
.notice-slide-enter-from,
.notice-slide-leave-to {
  transform: translateX(-50%) translateY(1rem);
  opacity: 0;
}
@media (min-width: 1024px) {
  .notice-slide-enter-from,
  .notice-slide-leave-to {
    transform: translateY(1rem);
  }
}
@media (prefers-reduced-motion: reduce) {
  .notice-slide-enter-active,
  .notice-slide-leave-active {
    transition: opacity 0.15s ease;
  }
  .notice-slide-enter-from,
  .notice-slide-leave-to {
    transform: none;
  }
}
</style>
