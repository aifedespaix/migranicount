<template>
  <div class="step">
    <!-- Formulaire d'ajout -->
    <form class="medoc-add-form" @submit.prevent="addNew">
      <div class="field-group">
        <label class="field-label" for="medoc-nom">Médicament</label>
        <div class="combobox-wrapper">
          <input
            id="medoc-nom"
            ref="nomInputRef"
            v-model="nomInput"
            placeholder="Nom du médicament"
            class="form-input"
            autocomplete="off"
            :inputmode="isMobile && !searchMode ? 'none' : undefined"
            @focus="onComboFocus"
            @blur="scheduleCloseDropdown"
          />
          <button
            v-if="isMobile"
            type="button"
            class="combobox-search-toggle"
            :class="{ active: searchMode }"
            @mousedown.prevent="toggleSearchMode"
            tabindex="-1"
            :title="searchMode ? 'Mode liste' : 'Rechercher'"
          >
            <Search :size="14" />
          </button>
          <ul v-if="showDropdown && filteredFavoris.length" class="combobox-dropdown">
            <li
              v-for="f in filteredFavoris"
              :key="f.nom"
              class="combobox-item"
              @mousedown.prevent="selectFavori(f)"
              @touchend.prevent="selectFavori(f)"
            >
              <span class="combobox-item-nom">{{ f.nom }}</span>
              <span v-if="f.description" class="combobox-item-desc">{{ f.description }}</span>
            </li>
          </ul>
        </div>
      </div>
      <div class="field-group">
        <label class="field-label" for="medoc-desc">Description</label>
        <input
          id="medoc-desc"
          v-model="descriptionInput"
          placeholder="Dosage, forme... (optionnel)"
          class="form-input"
        />
      </div>
      <div class="field-group">
        <label class="field-label">Heure de prise</label>
        <TimeField v-model="heureInput" />
      </div>

      <!-- Section avortée (avant le bouton Ajouter) -->
      <div class="avortee-section">
        <p class="field-label">Migraine avortée par ce traitement ?</p>
        <div class="pill-group">
          <button
            type="button"
            class="pill-btn"
            :class="{ active: model.avortee === true }"
            @click="model.avortee = true"
          >Oui</button>
          <button
            type="button"
            class="pill-btn"
            :class="{ active: model.avortee === 'probable' }"
            @click="model.avortee = 'probable'"
          >Probable</button>
          <button
            type="button"
            class="pill-btn"
            :class="{ active: model.avortee === false }"
            @click="model.avortee = false"
          >Non</button>
        </div>
      </div>

      <button type="submit" class="pill-btn pill-btn--primary" :disabled="!nomInput.trim()">
        <Plus :size="15" />
        Ajouter cette prise
      </button>
    </form>

    <!-- Prises enregistrées -->
    <div v-if="model.medocs.length > 0" class="prises-section">
      <p class="field-label">Prises enregistrées</p>
      <div v-for="(p, i) in model.medocs" :key="p.id" class="form-card medoc-row">
        <span class="medoc-nom">{{ p.nom }}</span>
        <TimeField v-model="model.medocs[i].heure" class="medoc-heure-inline" />
        <button type="button" class="icon-btn" @click="remove(i)" aria-label="Supprimer">
          <X :size="14" />
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick } from 'vue'
import { Plus, X, Search } from 'lucide-vue-next'
import { useMediaQuery } from '@vueuse/core'
import { newId } from '../../utils/uuid'
import { addMinutesToHHmm } from '../../utils/date'
import { capitalizeFirstLetter } from '../../utils/text'
import { useMedocsFavorisStore } from '../../stores/medocsFavoris'
import TimeField from '../TimeField.vue'
import type { MigraineDraft } from './draft'
import type { MedocFavori } from '../../types/migraine'

const model = defineModel<MigraineDraft>({ required: true })
const favoris = useMedocsFavorisStore()

const isMobile = useMediaQuery('(pointer: coarse)')

const nomInputRef = ref<HTMLInputElement | null>(null)
const nomInput = ref('')
const descriptionInput = ref('')
const heureInput = ref(addMinutesToHHmm(model.value.heureDebut, 15))
const showDropdown = ref(false)
const searchMode = ref(false)
const selectedFavori = ref<MedocFavori | null>(null)

function normalize(s: string) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

const filteredFavoris = computed(() => {
  if (isMobile.value && !searchMode.value) return favoris.favoris
  const q = normalize(nomInput.value.trim())
  if (!q) return favoris.favoris
  return favoris.favoris.filter(f => normalize(f.nom).includes(q))
})

function onComboFocus() {
  showDropdown.value = true
}

function toggleSearchMode() {
  searchMode.value = !searchMode.value
  if (searchMode.value) {
    nextTick(() => nomInputRef.value?.focus())
  }
}

function selectFavori(f: MedocFavori) {
  nomInput.value = f.nom
  descriptionInput.value = f.description ?? ''
  selectedFavori.value = f
  showDropdown.value = false
  searchMode.value = false
}

function scheduleCloseDropdown() {
  setTimeout(() => { showDropdown.value = false }, 150)
}

function addNew() {
  if (!nomInput.value.trim()) return
  const nom = capitalizeFirstLetter(nomInput.value)
  model.value.medocs.push({
    id: newId(),
    nom,
    description: descriptionInput.value || undefined,
    heure: heureInput.value,
    posologieParJour: selectedFavori.value?.posologieParJour,
    intervalleHeures: selectedFavori.value?.intervalleHeures,
  })
  favoris.registerUsage(nom, descriptionInput.value || undefined)
  nomInput.value = ''
  descriptionInput.value = ''
  selectedFavori.value = null
}

function remove(index: number) {
  model.value.medocs.splice(index, 1)
}
</script>

<style scoped>
.field-label {
  font-size: 0.75rem;
  color: var(--color-muted);
  font-weight: 500;
  margin-bottom: 0.25rem;
  display: block;
}
.medoc-add-form {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  padding: 0.75rem;
  background: var(--color-bg);
  border-radius: 0.5rem;
  margin-bottom: 0.75rem;
}
.field-group {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}
.form-input {
  padding: 0.5rem 0.75rem;
  border-radius: 0.5rem;
  border: 1px solid var(--color-muted);
  background: var(--color-surface);
  color: var(--color-text);
  font-size: 0.9rem;
  width: 100%;
  box-sizing: border-box;
}
.combobox-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  gap: 0.35rem;
}
.combobox-wrapper .form-input {
  flex: 1;
}
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
  z-index: 10;
  max-height: 200px;
  overflow-y: auto;
  margin-top: 0.2rem;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  list-style: none;
  padding: 0;
}
.combobox-item {
  padding: 0.5rem 0.75rem;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
}
.combobox-item:hover {
  background: var(--color-bg);
}
.combobox-item-nom {
  font-size: 0.9rem;
}
.combobox-item-desc {
  font-size: 0.75rem;
  color: var(--color-muted);
}
.pill-btn--primary {
  background: var(--color-accent);
  color: var(--color-accent-contrast);
  border-color: var(--color-accent);
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  align-self: flex-start;
}
.pill-btn--primary:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.avortee-section {
  margin-top: 0.25rem;
}
.prises-section {
  margin-top: 0.5rem;
  border-top: 1px solid var(--color-bg);
  padding-top: 0.75rem;
}
.icon-btn {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--color-danger);
  display: flex;
  align-items: center;
}
.medoc-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.medoc-nom {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.9rem;
}
.medoc-heure-inline {
  flex-shrink: 0;
}
</style>
