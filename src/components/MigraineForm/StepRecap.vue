<template>
  <div class="step">
    <h2>Récapitulatif</h2>

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
        <p class="recap-value">{{ model.medocs.map((m) => `${m.nom} (${m.heure})`).join(', ') }}</p>
      </div>
    </div>

    <div class="recap-row" v-if="hasSymptoms">
      <span class="recap-icon">🤢</span>
      <div class="recap-content">
        <p class="recap-label">Symptômes</p>
        <div class="pill-group">
          <span v-if="model.avortee" class="pill-btn active">Avortée</span>
          <span v-if="model.nausee" class="pill-btn">Nausée</span>
          <span v-if="model.vomissement" class="pill-btn">Vomissement</span>
          <span v-if="model.aura" class="pill-btn">Aura</span>
        </div>
      </div>
    </div>

    <div class="recap-row" v-if="localisationLabelValue">
      <span class="recap-icon">📍</span>
      <div class="recap-content">
        <p class="recap-label">Localisation</p>
        <p class="recap-value">{{ localisationLabelValue }}</p>
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
import { computed } from 'vue'
import { intensityColor, intensityLabel } from '../../utils/intensity'
import { localisationLabel } from '../../utils/localisation'
import type { MigraineDraft } from './draft'

const model = defineModel<MigraineDraft>({ required: true })

const intensityColorValue = computed(() => intensityColor(model.value.intensite))
const intensityLabelValue = computed(() => intensityLabel(model.value.intensite))
const localisationLabelValue = computed(() => localisationLabel(model.value.localisation))
const hasSymptoms = computed(
  () => model.value.avortee || model.value.nausee || model.value.vomissement || model.value.aura
)
</script>

<style scoped>
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
