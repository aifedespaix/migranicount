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
              type="button"
              class="medoc-recap-item"
              :disabled="!m.description"
              @click="toggleExpanded(m.id)"
            >
              {{ m.nom }} ({{ m.heure }})
            </button>
            <p v-if="expandedId === m.id" class="medoc-recap-description">{{ m.description }}</p>
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
          <span v-for="s in model.symptomes" :key="s" class="pill-btn">{{ s }}</span>
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
          <span v-for="d in model.declencheurs" :key="d" class="pill-btn">{{ d }}</span>
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
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { intensityColor, intensityLabel } from '../../utils/intensity'
import { zoneLabel } from '../../utils/zone'
import type { MigraineDraft } from './draft'

const model = defineModel<MigraineDraft>({ required: true })

const intensityColorValue = computed(() => intensityColor(model.value.intensite))
const intensityLabelValue = computed(() => intensityLabel(model.value.intensite))
const zoneLabelValue = computed(() => zoneLabel(model.value.zone))
const hasSymptoms = computed(
  () => model.value.avortee || model.value.symptomes.length > 0
)

const expandedId = ref<string | null>(null)

function toggleExpanded(id: string) {
  expandedId.value = expandedId.value === id ? null : id
}
</script>

<style scoped>
.medoc-recap-list {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  margin: 0;
  padding: 0;
}
.medoc-recap-item {
  background: none;
  border: none;
  padding: 0;
  font: inherit;
  color: var(--color-text);
  text-align: left;
  cursor: pointer;
}
.medoc-recap-item:disabled {
  cursor: default;
  opacity: 0.7;
}
.medoc-recap-description {
  margin: 0.2rem 0 0;
  font-size: 0.85rem;
  color: var(--color-muted);
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
</style>
