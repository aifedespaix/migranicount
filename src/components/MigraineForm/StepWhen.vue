<template>
  <div class="step when-step">
    <div class="when-block">
      <span class="when-label">Date</span>
      <div class="when-row">
        <DateField v-model="model.date" />
        <button type="button" class="pill-btn quick-pill" :class="{ active: model.date === today }" @click="model.date = today">
          Aujourd'hui
        </button>
        <button type="button" class="pill-btn quick-pill" :class="{ active: model.date === yesterday }" @click="model.date = yesterday">
          Hier
        </button>
      </div>
    </div>

    <div class="when-block">
      <span class="when-label">Heure de début</span>
      <div class="when-row">
        <TimeField v-model="model.heureDebut" />
        <button type="button" class="pill-btn quick-pill" @click="model.heureDebut = nowHHmm()">Maintenant</button>
      </div>
    </div>

    <div class="when-block">
      <span class="when-label">La crise est…</span>
      <div class="segmented" role="radiogroup" aria-label="État de la crise">
        <button
          type="button"
          role="radio"
          class="segment"
          :class="{ active: model.heureFin === null }"
          :aria-checked="model.heureFin === null"
          @click="model.heureFin = null"
        >En cours</button>
        <button
          type="button"
          role="radio"
          class="segment"
          :class="{ active: model.heureFin !== null }"
          :aria-checked="model.heureFin !== null"
          @click="markEnded"
        >Terminée</button>
      </div>
      <p v-if="model.heureFin === null" class="when-hint">
        Tu pourras indiquer la fin plus tard, depuis l'accueil.
      </p>
    </div>

    <div v-if="model.heureFin !== null" class="when-block">
      <span class="when-label">Heure de fin</span>
      <div class="when-row">
        <TimeField v-model="heureFinModel" />
        <button type="button" class="pill-btn quick-pill" @click="model.heureFin = nowHHmm()">Maintenant</button>
        <span class="when-duration">Durée : {{ durationLabel }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import DateField from '../DateField.vue'
import TimeField from '../TimeField.vue'
import { formatDuration, nowHHmm, toISODate, todayISO } from '../../utils/date'
import { durationMinutes } from '../../utils/ongoing'
import type { MigraineDraft } from './draft'

const model = defineModel<MigraineDraft>({ required: true })

const today = todayISO()
const yesterday = toISODate(new Date(Date.now() - 86400000))

const heureFinModel = computed({
  get: () => model.value.heureFin ?? '',
  set: (v: string) => {
    model.value.heureFin = v
  },
})

const durationLabel = computed(() =>
  model.value.heureFin ? formatDuration(durationMinutes(model.value.heureDebut, model.value.heureFin)) : '',
)

function markEnded() {
  if (model.value.heureFin !== null) return
  // Crise du jour : elle vient sans doute de se terminer. Sinon on part du début, à ajuster.
  model.value.heureFin = model.value.date === today ? nowHHmm() : model.value.heureDebut
}
</script>

<style scoped>
.when-step {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}
.when-block {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}
.when-label {
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--color-muted);
}
.when-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem;
}
.quick-pill {
  min-height: 2.5rem;
}
.segmented {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.25rem;
  padding: 0.25rem;
  border-radius: 0.75rem;
  background: var(--color-bg);
}
.segment {
  min-height: 2.75rem;
  border: none;
  border-radius: 0.55rem;
  background: transparent;
  color: var(--color-muted);
  font: inherit;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
}
.segment.active {
  background: var(--color-accent);
  color: var(--color-accent-contrast);
}
.when-hint {
  font-size: 0.78rem;
  color: var(--color-muted);
  margin: 0;
}
.when-duration {
  font-size: 0.85rem;
  font-weight: 600;
  margin-left: auto;
}
</style>
