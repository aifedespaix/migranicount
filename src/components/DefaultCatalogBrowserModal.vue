<template>
  <div class="browser-backdrop" @click.self="$emit('close')">
    <div class="browser-panel">
      <header class="browser-header">
        <div class="browser-header-top">
          <span class="browser-title">
            <BookOpen :size="14" />
            Catalogue par défaut
            <span class="browser-total">{{ defaultMedications.length }}</span>
          </span>
          <button type="button" class="browser-close" @click="$emit('close')">×</button>
        </div>
        <div class="browser-search-wrap">
          <Search :size="13" class="browser-search-icon" />
          <input
            ref="searchRef"
            v-model="query"
            placeholder="Rechercher un médicament…"
            class="browser-search-input"
            autocomplete="off"
          />
          <button v-if="query" type="button" class="browser-search-clear" @click="query = ''">
            <X :size="12" />
          </button>
        </div>
      </header>

      <div class="browser-body">
        <!-- Résultats filtrés (recherche active) -->
        <template v-if="query.trim()">
          <div v-if="filteredMeds.length" class="browser-cards">
            <div
              v-for="med in filteredMeds"
              :key="med.nom"
              class="med-card"
              :class="{ 'med-card--fond': med.isLongTermTreatment }"
            >
              <div class="med-card-header">
                <div class="med-card-nom-wrap">
                  <div class="med-card-nom-row">
                    <span class="med-card-nom">{{ med.nom }}</span>
                    <span class="med-badge" :class="{ 'med-badge--fond': med.isLongTermTreatment }">
                      {{ med.isLongTermTreatment ? 'fond' : 'crise' }}
                    </span>
                  </div>
                  <p class="med-card-desc">{{ med.description }}</p>
                </div>
                <button
                  type="button"
                  class="btn-add-med"
                  :class="{ 'btn-add-med--added': alreadyInFavoris.has(med.nom) }"
                  :disabled="alreadyInFavoris.has(med.nom)"
                  @click="addMed(med)"
                >
                  <Check v-if="alreadyInFavoris.has(med.nom)" :size="13" />
                  <Plus v-else :size="13" />
                  {{ alreadyInFavoris.has(med.nom) ? 'Ajouté' : 'Ajouter' }}
                </button>
              </div>
              <div class="med-card-details">
                <div v-if="med.posologieParJour" class="med-detail med-detail--posologie">
                  <Clock :size="10" class="med-detail-icon" />
                  {{ posologieText(med) }}
                </div>
                <div class="med-detail med-detail--expected">
                  <CheckCircle :size="10" class="med-detail-icon" />
                  {{ med.expectedEffects }}
                </div>
                <div class="med-detail med-detail--side">
                  <AlertTriangle :size="10" class="med-detail-icon" />
                  {{ med.sideEffects }}
                </div>
              </div>
            </div>
          </div>
          <p v-else class="browser-empty">Aucun résultat pour "{{ query }}"</p>
        </template>

        <!-- Vue groupée (sans recherche) -->
        <template v-else>
          <div class="browser-group-label">
            <Zap :size="11" />
            Médicaments de crise
            <span class="browser-count">{{ crisisMeds.length }}</span>
          </div>
          <div class="browser-cards">
            <div v-for="med in crisisMeds" :key="med.nom" class="med-card">
              <div class="med-card-header">
                <div class="med-card-nom-wrap">
                  <div class="med-card-nom-row">
                    <span class="med-card-nom">{{ med.nom }}</span>
                    <span class="med-badge">crise</span>
                  </div>
                  <p class="med-card-desc">{{ med.description }}</p>
                </div>
                <button
                  type="button"
                  class="btn-add-med"
                  :class="{ 'btn-add-med--added': alreadyInFavoris.has(med.nom) }"
                  :disabled="alreadyInFavoris.has(med.nom)"
                  @click="addMed(med)"
                >
                  <Check v-if="alreadyInFavoris.has(med.nom)" :size="13" />
                  <Plus v-else :size="13" />
                  {{ alreadyInFavoris.has(med.nom) ? 'Ajouté' : 'Ajouter' }}
                </button>
              </div>
              <div class="med-card-details">
                <div v-if="med.posologieParJour" class="med-detail med-detail--posologie">
                  <Clock :size="10" class="med-detail-icon" />
                  {{ posologieText(med) }}
                </div>
                <div class="med-detail med-detail--expected">
                  <CheckCircle :size="10" class="med-detail-icon" />
                  {{ med.expectedEffects }}
                </div>
                <div class="med-detail med-detail--side">
                  <AlertTriangle :size="10" class="med-detail-icon" />
                  {{ med.sideEffects }}
                </div>
              </div>
            </div>
          </div>

          <div class="browser-group-label browser-group-label--fond">
            <Shield :size="11" />
            Traitements de fond
            <span class="browser-count">{{ fondMeds.length }}</span>
          </div>
          <div class="browser-cards">
            <div v-for="med in fondMeds" :key="med.nom" class="med-card med-card--fond">
              <div class="med-card-header">
                <div class="med-card-nom-wrap">
                  <div class="med-card-nom-row">
                    <span class="med-card-nom">{{ med.nom }}</span>
                    <span class="med-badge med-badge--fond">fond</span>
                  </div>
                  <p class="med-card-desc">{{ med.description }}</p>
                </div>
                <button
                  type="button"
                  class="btn-add-med"
                  :class="{ 'btn-add-med--added': alreadyInFavoris.has(med.nom) }"
                  :disabled="alreadyInFavoris.has(med.nom)"
                  @click="addMed(med)"
                >
                  <Check v-if="alreadyInFavoris.has(med.nom)" :size="13" />
                  <Plus v-else :size="13" />
                  {{ alreadyInFavoris.has(med.nom) ? 'Ajouté' : 'Ajouter' }}
                </button>
              </div>
              <div class="med-card-details">
                <div v-if="med.posologieParJour" class="med-detail med-detail--posologie">
                  <Clock :size="10" class="med-detail-icon" />
                  {{ posologieText(med) }}
                </div>
                <div class="med-detail med-detail--expected">
                  <CheckCircle :size="10" class="med-detail-icon" />
                  {{ med.expectedEffects }}
                </div>
                <div class="med-detail med-detail--side">
                  <AlertTriangle :size="10" class="med-detail-icon" />
                  {{ med.sideEffects }}
                </div>
              </div>
            </div>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import {
  BookOpen, Search, X, Zap, Shield, Plus, Check,
  Clock, CheckCircle, AlertTriangle,
} from 'lucide-vue-next'
import { defaultMedications } from '../data/defaultMedications'
import { useMedocsFavorisStore } from '../stores/medocsFavoris'
import type { DefaultMedication } from '../data/defaultMedications'

defineEmits<{ close: [] }>()

const medocs = useMedocsFavorisStore()
const searchRef = ref<HTMLInputElement | null>(null)
const query = ref('')

const alreadyInFavoris = computed(() => new Set(medocs.favoris.map((f) => f.nom)))

function normalize(s: string) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

const crisisMeds = computed(() => defaultMedications.filter((m) => !m.isLongTermTreatment))
const fondMeds = computed(() => defaultMedications.filter((m) => m.isLongTermTreatment))
const filteredMeds = computed(() => {
  const q = normalize(query.value.trim())
  return defaultMedications.filter(
    (m) => normalize(m.nom).includes(q) || normalize(m.description).includes(q),
  )
})

function addMed(med: DefaultMedication) {
  if (alreadyInFavoris.value.has(med.nom)) return
  medocs.addFromDefault(med)
}

function posologieText(med: DefaultMedication): string {
  const parts: string[] = []
  if (med.posologieParJour) parts.push(`${med.posologieParJour}×/jour`)
  if (med.intervalleHeures) parts.push(`≥${med.intervalleHeures}h entre prises`)
  return parts.join(' · ')
}

onMounted(() => searchRef.value?.focus())
</script>

<style scoped>
/* ─── Backdrop & Panel ──────────────────────────────────────────────────── */
.browser-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  z-index: 60;
  display: flex;
  align-items: flex-end;
}
.browser-panel {
  background: var(--color-surface);
  width: 100%;
  height: 92dvh;
  border-radius: 1rem 1rem 0 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* ─── Header ────────────────────────────────────────────────────────────── */
.browser-header {
  padding: 1rem 1rem 0.75rem;
  border-bottom: 1px solid var(--color-bg);
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}
.browser-header-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.browser-title {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--color-text);
}
.browser-total {
  font-size: 0.7rem;
  font-weight: 400;
  color: var(--color-muted);
  background: var(--color-bg);
  padding: 0.1rem 0.4rem;
  border-radius: 0.75rem;
}
.browser-close {
  background: none;
  border: none;
  font-size: 1.5rem;
  line-height: 1;
  color: var(--color-muted);
  cursor: pointer;
  padding: 0.2rem 0.4rem;
}
.browser-search-wrap {
  position: relative;
  display: flex;
  align-items: center;
}
.browser-search-icon {
  position: absolute;
  left: 0.65rem;
  color: var(--color-muted);
  pointer-events: none;
}
.browser-search-input {
  width: 100%;
  padding: 0.55rem 2rem 0.55rem 2rem;
  border-radius: 0.6rem;
  border: 1px solid var(--color-muted);
  background: var(--color-bg);
  color: var(--color-text);
  font-size: 0.9rem;
  font-family: inherit;
  box-sizing: border-box;
}
.browser-search-input:focus {
  outline: none;
  border-color: var(--color-accent);
}
.browser-search-clear {
  position: absolute;
  right: 0.5rem;
  background: none;
  border: none;
  color: var(--color-muted);
  cursor: pointer;
  display: flex;
  align-items: center;
  padding: 0.2rem;
}

/* ─── Body ──────────────────────────────────────────────────────────────── */
.browser-body {
  flex: 1;
  overflow-y: auto;
  padding: 0.75rem 1rem 2rem;
}
.browser-empty {
  text-align: center;
  color: var(--color-muted);
  font-size: 0.85rem;
  margin-top: 2rem;
  font-style: italic;
}

/* ─── Group labels ──────────────────────────────────────────────────────── */
.browser-group-label {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.68rem;
  font-weight: 600;
  color: var(--color-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 0.75rem 0 0.4rem;
}
.browser-group-label--fond {
  color: var(--color-info, #0ea5e9);
  margin-top: 0.75rem;
}
.browser-count {
  margin-left: auto;
  font-size: 0.62rem;
  background: var(--color-bg);
  border-radius: 0.75rem;
  padding: 0.1rem 0.45rem;
}

/* ─── Cards ─────────────────────────────────────────────────────────────── */
.browser-cards {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.med-card {
  background: var(--color-bg);
  border-radius: 0.65rem;
  padding: 0.75rem;
  border-left: 2px solid color-mix(in srgb, var(--color-accent) 35%, transparent);
}
.med-card--fond {
  border-left-color: var(--color-info, #0ea5e9);
}
.med-card-header {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  justify-content: space-between;
  margin-bottom: 0.5rem;
}
.med-card-nom-wrap { flex: 1; min-width: 0; }
.med-card-nom-row {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  flex-wrap: wrap;
  margin-bottom: 0.15rem;
}
.med-card-nom {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--color-text);
}
.med-badge {
  font-size: 0.58rem;
  color: var(--color-accent);
  border: 1px solid var(--color-accent);
  border-radius: 0.25rem;
  padding: 0 0.3rem;
  flex-shrink: 0;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}
.med-badge--fond {
  color: var(--color-info, #0ea5e9);
  border-color: var(--color-info, #0ea5e9);
}
.med-card-desc {
  font-size: 0.75rem;
  color: var(--color-muted);
  margin: 0;
  line-height: 1.4;
}

/* Bouton Ajouter */
.btn-add-med {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.8rem;
  font-family: inherit;
  background: var(--color-accent);
  color: white;
  border: none;
  border-radius: 0.45rem;
  padding: 0.4rem 0.65rem;
  cursor: pointer;
  white-space: nowrap;
  flex-shrink: 0;
}
.btn-add-med--added {
  background: color-mix(in srgb, var(--color-accent) 15%, var(--color-bg));
  color: var(--color-accent);
  cursor: default;
}

/* ─── Détails ───────────────────────────────────────────────────────────── */
.med-card-details {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  border-top: 1px solid color-mix(in srgb, var(--color-muted) 12%, transparent);
  padding-top: 0.45rem;
}
.med-detail {
  display: flex;
  align-items: flex-start;
  gap: 0.4rem;
  font-size: 0.75rem;
  line-height: 1.4;
  color: var(--color-muted);
}
.med-detail-icon { flex-shrink: 0; margin-top: 0.1rem; }
.med-detail--posologie { color: var(--color-text); font-weight: 500; font-size: 0.78rem; }
.med-detail--expected { color: color-mix(in srgb, #22c55e 70%, var(--color-text)); }
.med-detail--side { color: color-mix(in srgb, #f59e0b 80%, var(--color-text)); }

/* ─── Desktop ───────────────────────────────────────────────────────────── */
@media (min-width: 1024px) {
  .browser-backdrop { align-items: center; justify-content: center; padding: 2rem; }
  .browser-panel {
    width: 520px;
    height: calc(100dvh - 4rem);
    border-radius: 1rem;
  }
}
</style>
