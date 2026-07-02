<template>
  <div class="step">
    <div class="recap-row">
      <span class="recap-icon">📅</span>
      <div class="recap-content">
        <p class="recap-label">Date & durée</p>
        <p class="recap-value">{{ model.date }} · {{ model.heureDebut }} – {{ model.heureFin ?? 'en cours' }}</p>
      </div>
    </div>

    <div class="recap-row">
      <span class="recap-icon">🎯</span>
      <div class="recap-content">
        <p class="recap-label">Intensité</p>
        <p class="recap-value">
          <span class="intensity-badge" :style="{ background: intensityColorValue }">{{ model.intensite }}</span>
          {{ intensityLabelValue }}
        </p>
      </div>
    </div>

    <div class="recap-row" v-if="model.medocs.length">
      <span class="recap-icon">💊</span>
      <div class="recap-content">
        <p class="recap-label">Médicaments</p>
        <ul class="medoc-recap-list">
          <li v-for="m in model.medocs" :key="m.id">
            <button
              v-if="m.description || m.posologieParJour || m.intervalleHeures"
              type="button"
              class="medoc-recap-item medoc-recap-item--clickable"
              @click="activeMedoc = m"
            >
              <span class="medoc-recap-name">{{ m.nom }}</span>
              <span class="medoc-recap-time">{{ m.heure }}</span>
              <ChevronRight :size="13" class="medoc-recap-chevron" />
            </button>
            <div v-else class="medoc-recap-item medoc-recap-item--plain">
              <span class="medoc-recap-name">{{ m.nom }}</span>
              <span class="medoc-recap-time">{{ m.heure }}</span>
            </div>
          </li>
        </ul>
      </div>
    </div>

    <div class="recap-row" v-if="hasSymptoms">
      <span class="recap-icon">🤢</span>
      <div class="recap-content">
        <p class="recap-label">Symptômes</p>
        <div class="pill-group">
          <span v-if="model.avortee === true" class="pill-btn active">Avortée ✓</span>
          <span v-else-if="model.avortee === 'probable'" class="pill-btn active" style="background: var(--color-muted)">Avortée (probable)</span>
          <span v-for="s in model.symptomes" :key="s.id" class="pill-btn">{{ s.nom }}</span>
        </div>
      </div>
    </div>

    <div class="recap-row" v-if="zoneLabelValue">
      <span class="recap-icon">📍</span>
      <div class="recap-content">
        <p class="recap-label">Zone</p>
        <p class="recap-value">{{ zoneLabelValue }}</p>
      </div>
    </div>

    <div class="recap-row" v-if="model.declencheurs.length">
      <span class="recap-icon">🔥</span>
      <div class="recap-content">
        <p class="recap-label">Déclencheurs</p>
        <div class="pill-group">
          <span v-for="d in model.declencheurs" :key="d.id" class="pill-btn">{{ d.nom }}</span>
        </div>
      </div>
    </div>

    <div class="recap-row" v-if="model.notes">
      <span class="recap-icon">📝</span>
      <div class="recap-content">
        <p class="recap-label">Notes</p>
        <p class="recap-value">{{ model.notes }}</p>
      </div>
    </div>

    <div v-if="editId" class="recap-delete-zone">
      <button type="button" class="btn-delete-ghost" @click="$emit('delete')">
        Supprimer cette migraine
      </button>
    </div>

    <MedocInfoDialog v-if="activeMedoc" :medoc="activeMedoc" @close="activeMedoc = null" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { ChevronRight } from 'lucide-vue-next'
import { intensityColor, intensityLabel } from '../../utils/intensity'
import { zoneLabel } from '../../utils/zone'
import type { MigraineDraft } from './draft'
import type { MedocPris } from '../../types/migraine'
import MedocInfoDialog from '../MedocInfoDialog.vue'

defineProps<{ editId?: string }>()
defineEmits<{ delete: [] }>()

const model = defineModel<MigraineDraft>({ required: true })

const intensityColorValue = computed(() => intensityColor(model.value.intensite))
const intensityLabelValue = computed(() => intensityLabel(model.value.intensite))
const zoneLabelValue = computed(() => zoneLabel(model.value.zone))
const hasSymptoms = computed(
  () => model.value.avortee || model.value.symptomes.length > 0
)

const activeMedoc = ref<MedocPris | null>(null)
</script>

<style scoped>
.medoc-recap-list {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  margin: 0;
  padding: 0;
  list-style: none;
}
.medoc-recap-item {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  width: 100%;
  font: inherit;
  text-align: left;
}
.medoc-recap-item--clickable {
  background: color-mix(in srgb, var(--color-accent) 8%, transparent);
  border: 1px solid color-mix(in srgb, var(--color-accent) 25%, transparent);
  border-radius: 0.4rem;
  padding: 0.35rem 0.5rem;
  cursor: pointer;
  color: var(--color-text);
  transition: background 0.12s;
}
.medoc-recap-item--clickable:active {
  background: color-mix(in srgb, var(--color-accent) 18%, transparent);
}
.medoc-recap-item--plain {
  padding: 0.1rem 0;
  color: var(--color-text);
  opacity: 0.85;
  background: none;
  border: none;
}
.medoc-recap-name {
  flex: 1;
  font-size: 0.85rem;
}
.medoc-recap-time {
  font-size: 0.75rem;
  color: var(--color-muted);
  white-space: nowrap;
}
.medoc-recap-chevron {
  color: var(--color-accent);
  flex-shrink: 0;
}
.intensity-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1.5rem;
  height: 1.5rem;
  border-radius: 50%;
  color: #1c1726;
  font-weight: 700;
  font-size: 0.8rem;
  margin-right: 0.4rem;
}
.btn-delete-ghost {
  width: 100%;
  margin-top: 1.5rem;
  padding: 0.6rem;
  border-radius: 0.5rem;
  border: 1px solid var(--color-danger);
  background: transparent;
  color: var(--color-danger);
  font-size: 0.85rem;
  cursor: pointer;
}
.btn-delete-ghost:hover {
  background: color-mix(in srgb, var(--color-danger) 10%, transparent);
}
</style>
