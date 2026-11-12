<template>
  <div class="step medocs-step">
    <!-- Heure appliquée à la prochaine prise ajoutée -->
    <div class="heure-row">
      <span class="section-label">Heure de la prise</span>
      <TimeField v-model="heureInput" />
      <button type="button" class="pill-btn heure-now" @click="heureInput = nowHHmm()">Maintenant</button>
    </div>

    <!-- Ajout en un geste depuis le répertoire -->
    <div v-if="quickPicks.length" class="quick-section">
      <span class="section-label">Mes médicaments · appuie pour ajouter</span>
      <div class="quick-grid">
        <button
          v-for="f in visibleQuickPicks"
          :key="f.id"
          type="button"
          class="quick-chip"
          :class="{ taken: takenCount(f.nom) > 0 }"
          @click="addFavori(f)"
        >
          <Plus v-if="takenCount(f.nom) === 0" :size="15" class="quick-chip-icon" />
          <span v-else class="quick-chip-count">×{{ takenCount(f.nom) }}</span>
          <span class="quick-chip-nom">{{ f.nom }}</span>
        </button>
        <button
          v-if="quickPicks.length > QUICK_LIMIT"
          type="button"
          class="quick-chip quick-chip--more"
          @click="showAllQuick = !showAllQuick"
        >
          {{ showAllQuick ? 'Voir moins' : `+${quickPicks.length - QUICK_LIMIT} autres` }}
        </button>
      </div>
    </div>

    <!-- Recherche / ajout direct -->
    <div class="search-section">
      <div class="search-box" :class="{ focused: searchFocused }">
        <Search :size="16" class="search-icon" />
        <input
          ref="searchRef"
          v-model="query"
          type="search"
          class="search-input"
          :placeholder="quickPicks.length ? 'Rechercher ou ajouter un autre médicament' : 'Rechercher ou ajouter un médicament'"
          autocomplete="off"
          autocapitalize="sentences"
          enterkeyhint="done"
          aria-label="Rechercher ou ajouter un médicament"
          @focus="onSearchFocus"
          @blur="searchFocused = false"
          @keydown.enter.prevent="onSearchEnter"
        />
        <button v-if="query" type="button" class="search-clear" aria-label="Effacer la recherche" @click="clearSearch">
          <X :size="16" />
        </button>
      </div>

      <ul v-if="query.trim()" class="results">
        <li v-for="f in results.favoris" :key="f.id">
          <button type="button" class="result-row" @click="addFavori(f)">
            <span class="result-text">
              <span class="result-nom">{{ f.nom }}</span>
              <span v-if="f.description" class="result-desc">{{ f.description }}</span>
            </span>
            <span class="result-add"><Plus :size="15" /> Ajouter</span>
          </button>
        </li>
        <li v-for="med in results.catalogue" :key="med.nom">
          <button type="button" class="result-row" @click="addFromCatalogue(med)">
            <span class="result-text">
              <span class="result-nom">{{ med.nom }} <span class="result-badge">catalogue</span></span>
              <span class="result-desc">{{ med.description }}</span>
            </span>
            <span class="result-add"><Plus :size="15" /> Ajouter</span>
          </button>
        </li>
        <li v-if="results.canCreate">
          <button type="button" class="result-row result-row--create" @click="createAndAdd">
            <span class="result-text">
              <span class="result-nom">Ajouter « {{ createLabel }} »</span>
              <span class="result-desc">Nouveau médicament, enregistré dans ton répertoire</span>
            </span>
            <span class="result-add"><Plus :size="15" /></span>
          </button>
        </li>
      </ul>
    </div>

    <!-- Prises enregistrées -->
    <div class="prises-section">
      <span class="section-label">
        Prises enregistrées<template v-if="model.medocs.length"> · {{ model.medocs.length }}</template>
      </span>
      <p v-if="model.medocs.length === 0" class="prises-empty">
        Aucune prise pour cette crise. Tu peux passer cette étape si tu n'as rien pris.
      </p>
      <div
        v-for="(p, i) in model.medocs"
        :key="p.id"
        class="prise-card"
        :class="{ 'prise-card--new': p.id === lastAddedId }"
      >
        <div class="prise-head">
          <span class="prise-nom">{{ p.nom }}</span>
          <button type="button" class="prise-remove" @click="remove(i)" :aria-label="`Supprimer la prise de ${p.nom}`">
            <Trash2 :size="17" />
          </button>
        </div>
        <div class="prise-relief">
          <TimeField v-model="model.medocs[i].heure" :aria-label="`Heure de la prise de ${p.nom}`" />
          <div class="prise-relief-pills" role="group" aria-label="Soulagement">
            <span class="prise-relief-label">Soulagé ?</span>
            <button
              v-for="s in soulagementOptions"
              :key="s.value"
              type="button"
              class="pill-btn relief-pill"
              :class="{ active: p.soulagement === s.value }"
              @click="toggleSoulagement(i, s.value)"
            >{{ s.label }}</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Question au niveau de la crise : n'a de sens qu'avec au moins une prise -->
    <div v-if="model.medocs.length" class="avortee-section">
      <span class="section-label">Crise stoppée net par le traitement ?</span>
      <div class="segmented">
        <button
          v-for="o in avorteeOptions"
          :key="String(o.value)"
          type="button"
          class="segment"
          :class="{ active: model.avortee === o.value }"
          @click="model.avortee = o.value"
        >{{ o.label }}</button>
      </div>
    </div>

    <button type="button" class="manage-link" @click="$emit('manage')">
      <Settings2 :size="15" />
      Gérer mon répertoire de médicaments
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick } from 'vue'
import { Plus, X, Search, Trash2, Settings2 } from 'lucide-vue-next'
import { newId } from '../../utils/uuid'
import { addMinutesToHHmm, nowHHmm, todayISO } from '../../utils/date'
import { capitalizeFirstLetter } from '../../utils/text'
import { useMedocsFavorisStore } from '../../stores/medocsFavoris'
import { useToastStore } from '../../stores/toast'
import { defaultMedications, type DefaultMedication } from '../../data/defaultMedications'
import { quickPickMedocs, searchMedocs } from './medocSearch'
import TimeField from '../TimeField.vue'
import type { MigraineDraft } from './draft'
import type { MedocFavori, MedocPris, Soulagement } from '../../types/migraine'

const model = defineModel<MigraineDraft>({ required: true })
defineEmits<{ manage: [] }>()

const favoris = useMedocsFavorisStore()
const toastStore = useToastStore()

const QUICK_LIMIT = 6

// Crise du jour encore en cours : la prise a lieu maintenant. Sinon, saisie a posteriori.
const heureInput = ref(
  model.value.date === todayISO() && model.value.heureFin === null
    ? nowHHmm()
    : addMinutesToHHmm(model.value.heureDebut, 15),
)

const searchRef = ref<HTMLInputElement | null>(null)
const query = ref('')
const searchFocused = ref(false)
const showAllQuick = ref(false)
const lastAddedId = ref<string | null>(null)

const quickPicks = computed(() => quickPickMedocs(favoris.favoris))
const visibleQuickPicks = computed(() =>
  showAllQuick.value ? quickPicks.value : quickPicks.value.slice(0, QUICK_LIMIT),
)
const results = computed(() => searchMedocs(query.value, favoris.favoris, defaultMedications))
const createLabel = computed(() => capitalizeFirstLetter(query.value.trim()))

function takenCount(nom: string): number {
  return model.value.medocs.filter((p) => p.nom === nom).length
}

function pushPrise(f: MedocFavori) {
  const prise: MedocPris = {
    id: newId(),
    medocId: f.id,
    nom: f.nom,
    description: f.description || undefined,
    heure: heureInput.value,
    posologieParJour: f.posologieParJour,
    intervalleHeures: f.intervalleHeures,
  }
  model.value.medocs.push(prise)
  lastAddedId.value = prise.id
  query.value = ''
  searchRef.value?.blur()
}

function addFavori(f: MedocFavori) {
  pushPrise(favoris.registerUsage(f.nom, f.description))
}

function addFromCatalogue(med: DefaultMedication) {
  favoris.addFromDefault(med)
  pushPrise(favoris.registerUsage(med.nom))
}

function createAndAdd() {
  if (!createLabel.value) return
  pushPrise(favoris.registerUsage(createLabel.value))
}

/** Entrée au clavier : ajoute le seul résultat s'il est sans ambiguïté, sinon crée le médicament saisi. */
function onSearchEnter() {
  const { favoris: favs, catalogue, canCreate } = results.value
  if (favs.length + catalogue.length === 1) {
    if (favs.length) addFavori(favs[0])
    else addFromCatalogue(catalogue[0])
  } else if (canCreate && favs.length + catalogue.length === 0) {
    createAndAdd()
  }
}

function onSearchFocus() {
  searchFocused.value = true
  // Laisse le clavier s'ouvrir, puis remonte le champ pour que les résultats restent visibles.
  setTimeout(() => searchRef.value?.scrollIntoView({ block: 'start', behavior: 'smooth' }), 250)
}

function clearSearch() {
  query.value = ''
  nextTick(() => searchRef.value?.focus())
}

function remove(index: number) {
  const [removed] = model.value.medocs.splice(index, 1)
  toastStore.add({
    type: 'info',
    message: `Prise de ${removed.nom} retirée`,
    action: {
      label: 'Annuler',
      handler: () => model.value.medocs.splice(Math.min(index, model.value.medocs.length), 0, removed),
    },
  })
}

const soulagementOptions: { value: Soulagement; label: string }[] = [
  { value: 'oui', label: 'Oui' },
  { value: 'partiel', label: 'Partiel' },
  { value: 'non', label: 'Non' },
]

const avorteeOptions: { value: MigraineDraft['avortee']; label: string }[] = [
  { value: true, label: 'Oui' },
  { value: 'probable', label: 'Probable' },
  { value: false, label: 'Non' },
]

function toggleSoulagement(index: number, value: Soulagement) {
  const p = model.value.medocs[index]
  p.soulagement = p.soulagement === value ? undefined : value
}
</script>

<style scoped>
.medocs-step {
  display: flex;
  flex-direction: column;
  gap: 1.1rem;
}
.section-label {
  display: block;
  font-size: 0.8rem;
  font-weight: 500;
  color: var(--color-muted);
}
.heure-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem;
}
.heure-row .section-label {
  flex-basis: 100%;
}
.heure-now {
  min-height: 2.5rem;
}
.quick-section,
.prises-section,
.avortee-section {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}
.quick-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}
.quick-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  min-height: 2.75rem;
  max-width: 100%;
  padding: 0.4rem 0.9rem 0.4rem 0.7rem;
  border-radius: 1.5rem;
  border: 1.5px solid color-mix(in srgb, var(--color-accent) 55%, transparent);
  background: color-mix(in srgb, var(--color-accent) 8%, var(--color-surface));
  color: var(--color-text);
  font: inherit;
  font-size: 0.9rem;
  text-align: left;
  cursor: pointer;
}
.quick-chip:active {
  background: color-mix(in srgb, var(--color-accent) 22%, var(--color-surface));
}
.quick-chip.taken {
  border-color: var(--color-accent);
  background: color-mix(in srgb, var(--color-accent) 18%, var(--color-surface));
}
.quick-chip-icon {
  color: var(--color-accent);
  flex-shrink: 0;
}
.quick-chip-count {
  font-size: 0.78rem;
  font-weight: 700;
  color: var(--color-accent);
  flex-shrink: 0;
}
.quick-chip-nom {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.quick-chip--more {
  border-style: dashed;
  border-color: var(--color-muted);
  background: transparent;
  color: var(--color-muted);
  padding-left: 0.9rem;
}
.search-box {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  min-height: 2.9rem;
  padding: 0 0.4rem 0 0.75rem;
  border: 1.5px solid color-mix(in srgb, var(--color-muted) 60%, transparent);
  border-radius: 0.7rem;
  background: var(--color-bg);
  scroll-margin-top: 0.75rem;
}
.search-box.focused {
  border-color: var(--color-accent);
}
.search-icon {
  color: var(--color-muted);
  flex-shrink: 0;
}
.search-input {
  flex: 1;
  min-width: 0;
  border: none;
  background: transparent;
  color: var(--color-text);
  /* 16px minimum : évite le zoom automatique d'iOS à la prise de focus */
  font-size: 1rem;
  padding: 0.6rem 0;
  appearance: none;
  scroll-margin-top: 0.75rem;
}
.search-input:focus {
  outline: none;
}
.search-input::-webkit-search-cancel-button {
  display: none;
}
.search-clear {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.5rem;
  height: 2.5rem;
  border: none;
  background: none;
  color: var(--color-muted);
  cursor: pointer;
  flex-shrink: 0;
}
.results {
  margin-top: 0.4rem;
  border: 1px solid color-mix(in srgb, var(--color-muted) 35%, transparent);
  border-radius: 0.7rem;
  overflow: hidden;
}
.results li + li {
  border-top: 1px solid color-mix(in srgb, var(--color-muted) 20%, transparent);
}
.result-row {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  width: 100%;
  min-height: 3.25rem;
  padding: 0.5rem 0.75rem;
  border: none;
  background: var(--color-surface);
  color: var(--color-text);
  font: inherit;
  text-align: left;
  cursor: pointer;
}
.result-row:active {
  background: var(--color-bg);
}
.result-row--create {
  background: color-mix(in srgb, var(--color-accent) 7%, var(--color-surface));
}
.result-text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
}
.result-nom {
  font-size: 0.92rem;
  font-weight: 500;
}
.result-desc {
  font-size: 0.75rem;
  color: var(--color-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.result-badge {
  font-size: 0.62rem;
  font-weight: 500;
  padding: 0.05rem 0.35rem;
  border-radius: 0.75rem;
  border: 1px solid var(--color-muted);
  color: var(--color-muted);
  vertical-align: middle;
}
.result-add {
  display: inline-flex;
  align-items: center;
  gap: 0.2rem;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--color-accent);
  flex-shrink: 0;
}
.prises-empty {
  font-size: 0.85rem;
  color: var(--color-muted);
  margin: 0;
}
.prise-card {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  padding: 0.35rem 0.5rem 0.7rem 0.85rem;
  border: 1px solid color-mix(in srgb, var(--color-muted) 40%, transparent);
  border-radius: 0.7rem;
  background: var(--color-surface);
}
.prise-card--new {
  animation: prise-in 0.9s ease;
}
@keyframes prise-in {
  from { background: color-mix(in srgb, var(--color-accent) 25%, var(--color-surface)); }
  to { background: var(--color-surface); }
}
.prise-head {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.prise-nom {
  flex: 1;
  min-width: 0;
  font-size: 0.95rem;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.prise-remove {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.75rem;
  height: 2.75rem;
  border: none;
  border-radius: 0.5rem;
  background: none;
  color: var(--color-danger);
  cursor: pointer;
  flex-shrink: 0;
}
.prise-relief {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem;
  padding-right: 0.35rem;
}
.prise-relief-label {
  font-size: 0.78rem;
  color: var(--color-muted);
  flex-shrink: 0;
}
.prise-relief-pills {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  margin-left: auto;
}
.relief-pill {
  min-height: 2.4rem;
  padding: 0.3rem 0.8rem;
}
.segmented {
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: 1fr;
  gap: 0.25rem;
  padding: 0.25rem;
  border-radius: 0.75rem;
  background: var(--color-bg);
}
.segment {
  min-height: 2.6rem;
  border: none;
  border-radius: 0.55rem;
  background: transparent;
  color: var(--color-muted);
  font: inherit;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
}
.segment.active {
  background: var(--color-accent);
  color: var(--color-accent-contrast);
}
.manage-link {
  align-self: center;
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  min-height: 2.75rem;
  padding: 0 0.75rem;
  border: none;
  background: none;
  color: var(--color-muted);
  font: inherit;
  font-size: 0.85rem;
  text-decoration: underline;
  text-underline-offset: 3px;
  cursor: pointer;
}
</style>
