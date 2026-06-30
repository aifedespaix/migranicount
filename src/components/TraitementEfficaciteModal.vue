<template>
  <div class="overlay" @click.self="$emit('close')" @keydown.escape="$emit('close')" @pointerdown.stop @touchstart.stop>
    <div class="panel" role="dialog" aria-modal="true">
      <header class="panel-header">
        <h2 class="panel-title">Efficacité des traitements de fond</h2>
        <button type="button" class="panel-close" aria-label="Fermer" @click="$emit('close')">×</button>
      </header>

      <div class="panel-body">
        <p v-if="!results.length" class="empty-state">
          Aucune période de traitement enregistrée.<br />
          Ajoutez des périodes depuis le répertoire (icône livre).
        </p>

        <div v-for="r in results" :key="r.medoc" class="result-card">
          <div class="result-card-header">
            <h3 class="result-medoc">{{ r.medoc }}</h3>
            <span class="result-periods-badge">
              {{ r.periods.length }} période{{ r.periods.length > 1 ? 's' : '' }}
              <span v-if="r.periods.some(p => !p.endDate)" class="ongoing-dot" title="En cours">●</span>
            </span>
          </div>

          <div class="comparison-grid">
            <div class="comparison-col comparison-col--header">
              <span></span>
              <span class="comparison-header">En traitement</span>
              <span class="comparison-header">Hors traitement</span>
            </div>
            <div class="comparison-col">
              <span class="comparison-label">Fréquence/mois</span>
              <span class="comparison-value comparison-value--in">{{ r.inPeriod.avgFreqPerMonth }}</span>
              <span class="comparison-value comparison-value--out">{{ r.outPeriod.avgFreqPerMonth }}</span>
            </div>
            <div class="comparison-col">
              <span class="comparison-label">Durée moyenne</span>
              <span class="comparison-value comparison-value--in">{{ formatDur(r.inPeriod.avgDurationMin) }}</span>
              <span class="comparison-value comparison-value--out">{{ formatDur(r.outPeriod.avgDurationMin) }}</span>
            </div>
            <div class="comparison-col">
              <span class="comparison-label">Intensité moy.</span>
              <span class="comparison-value comparison-value--in">{{ r.inPeriod.avgIntensity > 0 ? r.inPeriod.avgIntensity + '/10' : '—' }}</span>
              <span class="comparison-value comparison-value--out">{{ r.outPeriod.avgIntensity > 0 ? r.outPeriod.avgIntensity + '/10' : '—' }}</span>
            </div>
            <div class="comparison-col comparison-col--count">
              <span class="comparison-label">Crises comptées</span>
              <span class="comparison-value">{{ r.inPeriod.count }}</span>
              <span class="comparison-value">{{ r.outPeriod.count }}</span>
            </div>
          </div>

          <p v-if="r.reductionPct.freq !== null" class="result-summary">
            <span :class="r.reductionPct.freq < 0 ? 'result-positive' : 'result-negative'">
              {{ Math.abs(r.reductionPct.freq) }}%
              {{ r.reductionPct.freq < 0 ? 'de réduction' : 'd\'augmentation' }}
            </span>
            de fréquence en traitement
            <template v-if="r.reductionPct.duration !== null && r.inPeriod.avgDurationMin > 0">
              &nbsp;·&nbsp;
              <span :class="r.reductionPct.duration < 0 ? 'result-positive' : 'result-negative'">
                {{ Math.abs(r.reductionPct.duration) }}%
                {{ r.reductionPct.duration < 0 ? 'de réduction' : 'd\'augmentation' }}
              </span>
              de durée
            </template>
          </p>
          <p v-else class="result-insufficient">
            Données insuffisantes pour comparer ({{ r.inPeriod.count }} crise{{ r.inPeriod.count > 1 ? 's' : '' }} en traitement, {{ r.outPeriod.count }} hors traitement).
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue'
import { treatmentEfficacyAnalysis } from '../utils/stats'
import type { Migraine, MedocFavori } from '../types/migraine'

const props = defineProps<{
  migraines: Migraine[]
  medocs: MedocFavori[]
}>()

const emit = defineEmits<{ close: [] }>()

const results = computed(() => treatmentEfficacyAnalysis(props.migraines, props.medocs))

function formatDur(min: number): string {
  if (min <= 0) return '—'
  if (min < 60) return `${min} min`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m > 0 ? `${h}h${m.toString().padStart(2, '0')}` : `${h}h`
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') emit('close')
}
onMounted(() => window.addEventListener('keydown', onKeydown))
onUnmounted(() => window.removeEventListener('keydown', onKeydown))
</script>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
}
.panel {
  background: var(--color-surface);
  border-radius: 1rem;
  width: min(90vw, 680px);
  max-height: min(85vh, 640px);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.25rem 0.75rem;
  border-bottom: 1px solid var(--color-bg);
  flex-shrink: 0;
}
.panel-title {
  font-size: 1rem;
  font-weight: 600;
  margin: 0;
}
.panel-close {
  background: none;
  border: none;
  font-size: 1.5rem;
  line-height: 1;
  color: var(--color-danger);
  cursor: pointer;
  padding: 0.25rem;
  transition: opacity 0.15s ease;
}
.panel-close:hover { opacity: 0.7; }
.panel-body {
  flex: 1;
  overflow-y: auto;
  padding: 1rem 1.25rem 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.empty-state {
  text-align: center;
  color: var(--color-muted);
  font-size: 0.9rem;
  padding: 2rem 1rem;
  line-height: 1.6;
}

/* ─── Carte résultat ─────────────────────────────────────────────────────── */
.result-card {
  background: var(--color-bg);
  border-radius: 0.75rem;
  padding: 0.9rem 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}
.result-card-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.result-medoc {
  font-size: 0.95rem;
  font-weight: 600;
  margin: 0;
  flex: 1;
}
.result-periods-badge {
  font-size: 0.7rem;
  color: var(--color-muted);
  display: flex;
  align-items: center;
  gap: 0.2rem;
}
.ongoing-dot {
  color: var(--color-info, #0ea5e9);
  font-size: 0.6rem;
}

/* ─── Grille de comparaison ─────────────────────────────────────────────── */
.comparison-grid {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}
.comparison-col {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 0.25rem;
  align-items: center;
}
.comparison-col--header {
  margin-bottom: 0.1rem;
}
.comparison-col--count {
  margin-top: 0.1rem;
  opacity: 0.7;
}
.comparison-header {
  font-size: 0.7rem;
  font-weight: 600;
  color: var(--color-muted);
  text-align: center;
}
.comparison-label {
  font-size: 0.78rem;
  color: var(--color-muted);
}
.comparison-value {
  font-size: 0.88rem;
  font-weight: 500;
  text-align: center;
}
.comparison-value--in {
  color: var(--color-info, #0ea5e9);
}
.comparison-value--out {
  color: var(--color-text);
  opacity: 0.75;
}

/* ─── Synthèse ───────────────────────────────────────────────────────────── */
.result-summary {
  font-size: 0.82rem;
  color: var(--color-text);
  margin: 0;
  padding: 0.4rem 0.6rem;
  background: color-mix(in srgb, var(--color-accent) 6%, transparent);
  border-radius: 0.4rem;
}
.result-positive {
  font-weight: 700;
  color: #10b981;
}
.result-negative {
  font-weight: 700;
  color: var(--color-danger);
}
.result-insufficient {
  font-size: 0.78rem;
  color: var(--color-muted);
  font-style: italic;
  margin: 0;
}
</style>
