<template>
  <div class="end-backdrop" @click.self="$emit('close')" @pointerdown.stop @touchstart.stop>
    <div class="end-sheet" role="dialog" aria-modal="true" aria-labelledby="end-sheet-title">
      <div class="end-grabber" aria-hidden="true"></div>
      <AppModalCloseBtn class="end-close" @click="$emit('close')" />
      <h3 id="end-sheet-title">Fin de la crise</h3>
      <p class="end-sub">
        Commencée {{ startLabel }} à {{ migraine.heureDebut }}
      </p>

      <p v-if="isStale" class="end-hint">
        Cette crise a commencé il y a plus de 24 h. Indique l'heure à laquelle elle s'est terminée.
      </p>

      <div v-else class="end-options">
        <button
          v-for="opt in options"
          :key="opt.label"
          type="button"
          class="end-option"
          :class="{ active: heure === opt.heure }"
          @click="heure = opt.heure"
        >
          <span class="end-option-label">{{ opt.label }}</span>
          <span class="end-option-time">{{ opt.heure }}</span>
        </button>
      </div>

      <div class="end-custom">
        <span class="end-custom-label">Heure de fin</span>
        <TimeField v-model="heure" />
        <span class="end-duration">Durée : {{ durationLabel }}</span>
      </div>

      <div v-if="unrated.length" class="end-relief">
        <p class="end-relief-title">Le traitement t'a soulagé ?</p>
        <div v-for="p in unrated" :key="p.id" class="end-relief-row">
          <span class="end-relief-nom">{{ p.nom }}</span>
          <div class="end-relief-pills">
            <button
              v-for="s in soulagementOptions"
              :key="s.value"
              type="button"
              class="pill-btn end-pill"
              :class="{ active: relief[p.id] === s.value }"
              @click="relief[p.id] = relief[p.id] === s.value ? undefined : s.value"
            >{{ s.label }}</button>
          </div>
        </div>
      </div>

      <div class="end-actions">
        <AppButton variant="muted" ghost size="lg" style="flex:1" @click="$emit('close')">
          Toujours en cours
        </AppButton>
        <AppButton variant="primary" size="lg" style="flex:1.4" @click="confirm">
          <Check :size="16" />
          Terminer
        </AppButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { Check } from 'lucide-vue-next'
import AppButton from './AppButton.vue'
import AppModalCloseBtn from './AppModalCloseBtn.vue'
import TimeField from './TimeField.vue'
import { useMigrainesStore } from '../stores/migraines'
import { useToastStore } from '../stores/toast'
import { formatDuration, formatMigraineTitleDate, formatRelative, nowHHmm } from '../utils/date'
import { durationMinutes, quickEndOptions, startedOverADayAgo } from '../utils/ongoing'
import type { Migraine, Soulagement } from '../types/migraine'

const props = defineProps<{ migraine: Migraine }>()
const emit = defineEmits<{ close: []; ended: [] }>()

const migraines = useMigrainesStore()
const toastStore = useToastStore()

const isStale = startedOverADayAgo(props.migraine)
const options = quickEndOptions(props.migraine)
const heure = ref(isStale ? props.migraine.heureDebut : nowHHmm())

const startLabel = computed(() => {
  const rel = formatRelative(props.migraine.date)
  return rel === "aujourd'hui" || rel === 'hier' ? rel : `le ${formatMigraineTitleDate(props.migraine.date)}`
})
const durationLabel = computed(() => formatDuration(durationMinutes(props.migraine.heureDebut, heure.value)))

const soulagementOptions: { value: Soulagement; label: string }[] = [
  { value: 'oui', label: 'Oui' },
  { value: 'partiel', label: 'Partiel' },
  { value: 'non', label: 'Non' },
]
const unrated = props.migraine.medocs.filter((p) => !p.soulagement)
const relief = reactive<Record<string, Soulagement | undefined>>({})

function confirm() {
  const snapshot: Migraine = JSON.parse(JSON.stringify(props.migraine))
  migraines.save({
    ...snapshot,
    heureFin: heure.value,
    medocs: snapshot.medocs.map((p) => (relief[p.id] ? { ...p, soulagement: relief[p.id] } : p)),
  })
  toastStore.add({
    type: 'success',
    message: `Crise terminée à ${heure.value} (${durationLabel.value})`,
    action: { label: 'Annuler', handler: () => migraines.save(snapshot) },
  })
  emit('ended')
  emit('close')
}
</script>

<style scoped>
.end-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  z-index: 60;
}
.end-sheet {
  position: relative;
  background: var(--color-surface);
  color: var(--color-text);
  width: 100%;
  max-width: 480px;
  max-height: 90dvh;
  overflow-y: auto;
  box-sizing: border-box;
  border-radius: 1rem 1rem 0 0;
  padding: 0.5rem 1.25rem max(1rem, env(safe-area-inset-bottom));
  text-align: left;
  animation: end-sheet-up 0.2s ease;
}
@keyframes end-sheet-up {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}
.end-grabber {
  width: 2.5rem;
  height: 0.25rem;
  border-radius: 0.25rem;
  background: color-mix(in srgb, var(--color-muted) 40%, transparent);
  margin: 0 auto 0.75rem;
}
.end-close {
  position: absolute;
  top: 0.75rem;
  right: 0.75rem;
}
h3 {
  margin: 0;
  font-size: 1.15rem;
}
.end-sub {
  margin: 0.15rem 0 1rem;
  font-size: 0.85rem;
  color: var(--color-muted);
}
.end-hint {
  margin: 0 0 1rem;
  padding: 0.6rem 0.75rem;
  border-radius: 0.5rem;
  background: color-mix(in srgb, var(--color-warning) 15%, transparent);
  font-size: 0.85rem;
}
.end-options {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem;
  margin-bottom: 1rem;
}
.end-option {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.1rem;
  min-height: 3.25rem;
  padding: 0.5rem 0.75rem;
  border-radius: 0.6rem;
  border: 1.5px solid color-mix(in srgb, var(--color-muted) 45%, transparent);
  background: var(--color-surface);
  color: var(--color-text);
  font: inherit;
  cursor: pointer;
}
.end-option.active {
  border-color: var(--color-accent);
  background: color-mix(in srgb, var(--color-accent) 12%, transparent);
}
.end-option-label {
  font-size: 0.9rem;
  font-weight: 600;
}
.end-option-time {
  font-size: 0.78rem;
  color: var(--color-muted);
}
.end-custom {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.6rem;
  margin-bottom: 1rem;
}
.end-custom-label {
  font-size: 0.85rem;
  color: var(--color-muted);
}
.end-duration {
  margin-left: auto;
  font-size: 0.85rem;
  font-weight: 600;
}
.end-relief {
  border-top: 1px solid var(--color-bg);
  padding-top: 0.75rem;
  margin-bottom: 1rem;
}
.end-relief-title {
  font-size: 0.85rem;
  color: var(--color-muted);
  margin: 0 0 0.5rem;
}
.end-relief-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.4rem;
}
.end-relief-nom {
  flex: 1;
  min-width: 0;
  font-size: 0.88rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.end-relief-pills {
  display: flex;
  gap: 0.3rem;
  flex-shrink: 0;
}
.end-pill {
  min-height: 2.25rem;
  padding: 0.3rem 0.7rem;
}
.end-actions {
  display: flex;
  gap: 0.5rem;
}
@media (min-width: 1024px) {
  .end-backdrop { align-items: center; }
  .end-sheet { border-radius: 1rem; padding-bottom: 1.25rem; }
  .end-grabber { visibility: hidden; }
}
</style>
