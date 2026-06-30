<template>
  <div class="add-medoc-backdrop" @pointerdown.stop>
    <div class="add-medoc-sheet">
      <header class="add-medoc-header">
        <span class="add-medoc-title">
          <Plus :size="15" />
          Ajouter un médicament
        </span>
        <div class="add-medoc-header-actions">
          <button type="button" class="btn-browse-catalog" @click="showCatalogBrowser = true">
            <BookOpen :size="12" />
            Catalogue
          </button>
          <button type="button" class="add-medoc-close" aria-label="Fermer" @click="$emit('close')">×</button>
        </div>
      </header>

      <div class="add-medoc-body">
        <!-- Combobox (visible quand formulaire fermé) -->
        <template v-if="!addPendingForm">
          <div class="combobox-wrapper">
            <input
              ref="addComboInputRef"
              v-model="addComboInput"
              placeholder="Rechercher dans le catalogue…"
              class="catalog-input combobox-input"
              autocomplete="off"
              :inputmode="isMobile && !addComboSearchMode ? 'none' : undefined"
              @focus="onAddComboFocus"
              @blur="scheduleCloseAddDropdown"
              @keyup.enter="openAddFormFreeText"
            />
            <button
              v-if="isMobile"
              type="button"
              class="combobox-search-toggle"
              :class="{ active: addComboSearchMode }"
              tabindex="-1"
              @mousedown.prevent="toggleAddComboSearchMode"
            >
              <Search :size="14" />
            </button>
            <ul v-if="addComboDropdown" class="combobox-dropdown">
              <li
                v-for="med in filteredAddDropdown"
                :key="med.nom"
                class="combobox-item"
                @mousedown.prevent="selectDefaultMed(med)"
                @touchend.prevent="selectDefaultMed(med)"
              >
                <div class="combobox-item-row">
                  <span class="combobox-item-nom">{{ med.nom }}</span>
                  <span class="catalog-item-badge" :class="{ 'badge--fond': med.isLongTermTreatment }">
                    {{ med.isLongTermTreatment ? 'fond' : 'crise' }}
                  </span>
                </div>
                <span class="combobox-item-desc">{{ med.description }}</span>
              </li>
              <li
                v-if="addComboInput.trim()"
                class="combobox-item combobox-item--free"
                @mousedown.prevent="openAddFormFreeText"
                @touchend.prevent="openAddFormFreeText"
              >
                <span class="combobox-item-nom">Ajouter "{{ addComboInput }}" manuellement</span>
              </li>
              <li v-if="!filteredAddDropdown.length && !addComboInput.trim()" class="combobox-empty">
                Tous les médicaments du catalogue sont déjà dans votre répertoire
              </li>
            </ul>
          </div>
        </template>

        <!-- Formulaire (visible après sélection ou saisie libre) -->
        <div v-if="addPendingForm" class="add-pending-form">
          <input v-model="addPendingForm.nom" placeholder="Nom" class="catalog-input" />
          <input v-model="addPendingForm.description" placeholder="Description (optionnel)" class="catalog-input" />
          <div class="add-form-row">
            <input
              v-model.number="addPendingForm.posologieParJour"
              type="number"
              min="1"
              max="24"
              placeholder="Prises/jour"
              class="catalog-input"
            />
            <input
              v-model.number="addPendingForm.intervalleHeures"
              type="number"
              min="0.5"
              max="48"
              step="0.5"
              placeholder="Intervalle (h)"
              class="catalog-input"
            />
          </div>
          <label class="catalog-toggle-label">
            <input v-model="addPendingForm.isLongTermTreatment" type="checkbox" class="catalog-toggle" />
            Traitement de fond (préventif)
          </label>
          <textarea
            v-model="addPendingForm.expectedEffects"
            placeholder="Effets attendus (optionnel)"
            class="catalog-input catalog-textarea"
            rows="2"
          />
          <textarea
            v-model="addPendingForm.sideEffects"
            placeholder="Effets indésirables (optionnel)"
            class="catalog-input catalog-textarea"
            rows="2"
          />
          <div class="catalog-edit-actions">
            <button type="button" class="btn-secondary btn-sm" @click="cancelAddForm">Annuler</button>
            <button
              type="button"
              class="btn-primary btn-sm"
              :disabled="!addPendingForm.nom.trim()"
              @click="saveAndClose"
            >
              <Plus :size="13" />
              Ajouter au répertoire
            </button>
          </div>
        </div>
      </div>
    </div>

    <DefaultCatalogBrowserModal v-if="showCatalogBrowser" @close="showCatalogBrowser = false" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick } from 'vue'
import { Plus, Search, BookOpen } from 'lucide-vue-next'
import { useMediaQuery } from '@vueuse/core'
import DefaultCatalogBrowserModal from './DefaultCatalogBrowserModal.vue'
import { useMedocsFavorisStore } from '../stores/medocsFavoris'
import { capitalizeFirstLetter } from '../utils/text'
import { defaultMedications } from '../data/defaultMedications'
import type { DefaultMedication } from '../data/defaultMedications'

const emit = defineEmits<{ close: [] }>()

const medocs = useMedocsFavorisStore()
const isMobile = useMediaQuery('(pointer: coarse)')
const showCatalogBrowser = ref(false)

const addComboInputRef = ref<HTMLInputElement | null>(null)
const addComboInput = ref('')
const addComboDropdown = ref(false)
const addComboSearchMode = ref(false)

const addPendingForm = ref<{
  nom: string
  description: string
  posologieParJour: number | undefined
  intervalleHeures: number | undefined
  isLongTermTreatment: boolean
  sideEffects: string
  expectedEffects: string
} | null>(null)

function normalizeStr(s: string) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

const alreadyInFavoris = computed(() => new Set(medocs.favoris.map((f) => f.nom)))

const availableDefaults = computed(() =>
  defaultMedications.filter((m) => !alreadyInFavoris.value.has(m.nom)),
)

const filteredAddDropdown = computed(() => {
  if (isMobile.value && !addComboSearchMode.value) return availableDefaults.value
  const q = normalizeStr(addComboInput.value.trim())
  if (!q) return availableDefaults.value
  return availableDefaults.value.filter(
    (m) => normalizeStr(m.nom).includes(q) || normalizeStr(m.description).includes(q),
  )
})

function onAddComboFocus() {
  if (!addPendingForm.value) addComboDropdown.value = true
}

function scheduleCloseAddDropdown() {
  setTimeout(() => { addComboDropdown.value = false }, 150)
}

function selectDefaultMed(med: DefaultMedication) {
  addComboInput.value = med.nom
  addComboDropdown.value = false
  addComboSearchMode.value = false
  addPendingForm.value = {
    nom: med.nom,
    description: med.description,
    posologieParJour: med.posologieParJour,
    intervalleHeures: med.intervalleHeures,
    isLongTermTreatment: med.isLongTermTreatment,
    sideEffects: med.sideEffects,
    expectedEffects: med.expectedEffects,
  }
}

function openAddFormFreeText() {
  const nom = capitalizeFirstLetter(addComboInput.value.trim())
  if (!nom) return
  addComboDropdown.value = false
  addPendingForm.value = {
    nom,
    description: '',
    posologieParJour: undefined,
    intervalleHeures: undefined,
    isLongTermTreatment: false,
    sideEffects: '',
    expectedEffects: '',
  }
}

function cancelAddForm() {
  addPendingForm.value = null
  addComboInput.value = ''
  addComboSearchMode.value = false
}

function saveAndClose() {
  if (!addPendingForm.value?.nom.trim()) return
  const f = addPendingForm.value
  medocs.addFromDefault({
    nom: capitalizeFirstLetter(f.nom.trim()),
    description: f.description,
    posologieParJour: f.posologieParJour && !isNaN(f.posologieParJour) ? f.posologieParJour : undefined,
    intervalleHeures: f.intervalleHeures && !isNaN(f.intervalleHeures) ? f.intervalleHeures : undefined,
    isLongTermTreatment: f.isLongTermTreatment,
    sideEffects: f.sideEffects,
    expectedEffects: f.expectedEffects,
  })
  emit('close')
}

function toggleAddComboSearchMode() {
  addComboSearchMode.value = !addComboSearchMode.value
  if (addComboSearchMode.value) nextTick(() => addComboInputRef.value?.focus())
}
</script>

<style scoped>
.add-medoc-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 40;
  display: flex;
  align-items: flex-end;
}
.add-medoc-sheet {
  background: var(--color-surface);
  width: 100%;
  border-radius: 1rem 1rem 0 0;
  max-height: 80dvh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.add-medoc-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.85rem 1rem 0.75rem;
  border-bottom: 1px solid var(--color-bg);
  flex-shrink: 0;
}
.add-medoc-title {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--color-accent);
}
.add-medoc-header-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.add-medoc-close {
  background: none;
  border: none;
  font-size: 1.5rem;
  line-height: 1;
  cursor: pointer;
  color: var(--color-muted);
  padding: 0.25rem;
}
.add-medoc-body {
  flex: 1;
  overflow-y: auto;
  padding: 0.75rem 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

/* ─── Combobox ─────────────────────────────────────────────────────────────── */
.combobox-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  gap: 0.35rem;
}
.combobox-input { flex: 1; }
.combobox-search-toggle {
  background: none;
  border: 1px solid var(--color-muted);
  border-radius: 0.4rem;
  color: var(--color-muted);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.45rem;
  flex-shrink: 0;
}
.combobox-search-toggle.active {
  color: var(--color-accent);
  border-color: var(--color-accent);
  background: color-mix(in srgb, var(--color-accent) 10%, transparent);
}
.combobox-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: var(--color-surface);
  border: 1px solid var(--color-muted);
  border-radius: 0.5rem;
  z-index: 20;
  max-height: 220px;
  overflow-y: auto;
  margin-top: 0.2rem;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  list-style: none;
  padding: 0;
}
.combobox-item {
  padding: 0.45rem 0.75rem;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
  border-bottom: 1px solid color-mix(in srgb, var(--color-muted) 10%, transparent);
}
.combobox-item:last-child { border-bottom: none; }
.combobox-item:hover { background: var(--color-bg); }
.combobox-item-row {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}
.combobox-item-nom { font-size: 0.9rem; font-weight: 500; }
.combobox-item-desc { font-size: 0.72rem; color: var(--color-muted); }
.combobox-item--free { opacity: 0.7; }
.combobox-item--free .combobox-item-nom { font-weight: 400; font-size: 0.82rem; font-style: italic; }
.combobox-empty {
  padding: 0.5rem 0.75rem;
  font-size: 0.78rem;
  color: var(--color-muted);
  font-style: italic;
  list-style: none;
}

/* ─── Formulaire pending ───────────────────────────────────────────────────── */
.add-pending-form {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}
.add-form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.4rem;
}

/* ─── Shared ───────────────────────────────────────────────────────────────── */
.catalog-input {
  padding: 0.5rem 0.75rem;
  border-radius: 0.5rem;
  border: 1px solid var(--color-muted);
  background: var(--color-surface);
  color: var(--color-text);
  flex: 1;
  font-size: 0.9rem;
  font-family: inherit;
  width: 100%;
  box-sizing: border-box;
}
.catalog-textarea {
  resize: vertical;
  min-height: 3.5rem;
}
.catalog-toggle-label {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.8rem;
  color: var(--color-text);
  cursor: pointer;
}
.catalog-toggle {
  width: 1rem;
  height: 1rem;
  cursor: pointer;
  accent-color: var(--color-accent);
}
.catalog-edit-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  margin-top: 0.25rem;
}
.catalog-item-badge {
  font-size: 0.6rem;
  color: var(--color-muted);
  border: 1px solid var(--color-muted);
  border-radius: 0.25rem;
  padding: 0 0.3rem;
  flex-shrink: 0;
}
.badge--fond {
  color: var(--color-info, #0ea5e9);
  border-color: var(--color-info, #0ea5e9);
}
.btn-browse-catalog {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.75rem;
  font-family: inherit;
  color: var(--color-muted);
  background: none;
  border: 1px solid color-mix(in srgb, var(--color-muted) 50%, transparent);
  border-radius: 0.4rem;
  padding: 0.22rem 0.55rem;
  cursor: pointer;
}
.btn-browse-catalog:hover {
  color: var(--color-text);
  border-color: var(--color-muted);
}
.btn-primary {
  background: var(--color-accent);
  color: white;
  border: none;
  border-radius: 0.5rem;
  padding: 0.5rem 0.85rem;
  cursor: pointer;
  white-space: nowrap;
  font-size: 0.85rem;
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
}
.btn-primary:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.btn-secondary {
  background: none;
  border: 1px solid var(--color-muted);
  color: var(--color-text);
  border-radius: 0.5rem;
  padding: 0.5rem 1rem;
  cursor: pointer;
  white-space: nowrap;
  font-size: 0.9rem;
}
.btn-sm {
  padding: 0.4rem 0.75rem;
  font-size: 0.85rem;
}

@media (min-width: 1024px) {
  .add-medoc-backdrop {
    align-items: center;
    justify-content: center;
  }
  .add-medoc-sheet {
    width: 420px;
    border-radius: 1rem;
    max-height: 70dvh;
  }
}
</style>
