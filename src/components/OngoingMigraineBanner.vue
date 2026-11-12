<template>
  <div v-if="ongoing.length" class="ongoing-banner" role="status">
    <div v-for="m in ongoing" :key="m.id" class="ongoing-row">
      <button type="button" class="ongoing-info" @click="$emit('edit', m.id)" :aria-label="`Compléter la crise ${sinceLabel(m)}`">
        <span class="ongoing-dot" aria-hidden="true"></span>
        <span class="ongoing-text">
          <strong>Crise en cours</strong>
          <span class="ongoing-since">{{ sinceLabel(m) }}</span>
        </span>
        <ChevronRight :size="16" class="ongoing-chevron" />
      </button>
      <button type="button" class="ongoing-end" @click="ending = m">
        <Check :size="15" />
        Terminer
      </button>
    </div>
    <EndMigraineSheet v-if="ending" :migraine="ending" @close="ending = null" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useNow } from '@vueuse/core'
import { Check, ChevronRight } from 'lucide-vue-next'
import EndMigraineSheet from './EndMigraineSheet.vue'
import { useMigrainesStore } from '../stores/migraines'
import { formatDuration, formatMigraineTitleDate } from '../utils/date'
import { elapsedMinutes, ongoingMigraines, startedOverADayAgo } from '../utils/ongoing'
import type { Migraine } from '../types/migraine'

defineEmits<{ edit: [id: string] }>()

const migraines = useMigrainesStore()
const now = useNow({ interval: 60_000 })
const ending = ref<Migraine | null>(null)

const ongoing = computed(() => ongoingMigraines(migraines.migraines))

function sinceLabel(m: Migraine): string {
  if (startedOverADayAgo(m, now.value)) {
    return `depuis ${formatMigraineTitleDate(m.date).toLowerCase()}, ${m.heureDebut}`
  }
  return `depuis ${formatDuration(elapsedMinutes(m, now.value))} · début ${m.heureDebut}`
}
</script>

<style scoped>
.ongoing-banner {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  padding: 0.5rem 0.75rem;
  background: color-mix(in srgb, var(--color-warning) 14%, var(--color-surface));
  border-bottom: 1px solid color-mix(in srgb, var(--color-warning) 45%, transparent);
  text-align: left;
}
.ongoing-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.ongoing-info {
  flex: 1;
  min-width: 0;
  min-height: 2.75rem;
  display: flex;
  align-items: center;
  gap: 0.6rem;
  background: none;
  border: none;
  padding: 0;
  color: var(--color-text);
  font: inherit;
  text-align: left;
  cursor: pointer;
}
.ongoing-dot {
  width: 0.6rem;
  height: 0.6rem;
  border-radius: 50%;
  background: var(--color-warning);
  flex-shrink: 0;
  animation: ongoing-pulse 2s ease-in-out infinite;
}
@keyframes ongoing-pulse {
  50% { opacity: 0.35; }
}
.ongoing-text {
  display: flex;
  flex-direction: column;
  min-width: 0;
  line-height: 1.25;
}
.ongoing-text strong {
  font-size: 0.9rem;
}
.ongoing-since {
  font-size: 0.78rem;
  color: var(--color-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ongoing-chevron {
  color: var(--color-muted);
  flex-shrink: 0;
}
.ongoing-end {
  flex-shrink: 0;
  min-height: 2.75rem;
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0 0.9rem;
  border-radius: 1.5rem;
  border: none;
  background: var(--color-accent);
  color: var(--color-accent-contrast);
  font: inherit;
  font-size: 0.88rem;
  font-weight: 600;
  cursor: pointer;
}
</style>
