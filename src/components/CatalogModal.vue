<template>
  <div class="modal-backdrop" @click.self="$emit('close')" @pointerdown.stop>
    <div class="modal-sheet">
      <header class="modal-header">
        <div class="modal-title-row">
          <span class="modal-form-title">Modifier le répertoire</span>
        </div>
        <div class="stepper-nav">
          <button
            v-for="(icon, i) in stepIcons"
            :key="i"
            type="button"
            class="stepper-btn"
            :class="{ active: i === stepIndex, past: i < stepIndex }"
            @click="goToStep(i)"
          >
            <component :is="icon" :size="14" />
            <span class="stepper-label">{{ stepShortTitles[i] }}</span>
          </button>
        </div>
        <button type="button" class="modal-close-btn" aria-label="Fermer" @click="$emit('close')">×</button>
      </header>
      <div class="progress-bar">
        <div class="progress-bar-fill" :style="{ width: progressPercent + '%' }"></div>
      </div>

      <div class="modal-body" :class="{ transitioning: isTransitioning }">
        <div class="modal-body-inner">
        <Transition
          :name="transitionName"
          @before-enter="isTransitioning = true"
          @after-leave="isTransitioning = false"
        >
          <div :key="stepIndex" class="step-content">
            <!-- Step 0: Médicaments -->
            <div v-if="stepIndex === 0">
              <ul class="catalog-list">
                <li v-for="item in medocs.favoris" :key="item.nom" class="catalog-item">
                  <div v-if="editingMedoc?.nom === item.nom" class="catalog-edit-form">
                    <input v-model="editingMedoc.newNom" placeholder="Nom" class="catalog-input" @keyup.enter="saveMedocEdit" @keyup.escape="editingMedoc = null" />
                    <input v-model="editingMedoc.description" placeholder="Description (optionnel)" class="catalog-input" @keyup.enter="saveMedocEdit" @keyup.escape="editingMedoc = null" />
                    <div class="catalog-edit-actions">
                      <button type="button" class="btn-secondary btn-sm" @click="editingMedoc = null">Annuler</button>
                      <button type="button" class="btn-primary btn-sm" @click="saveMedocEdit">Enregistrer</button>
                    </div>
                  </div>
                  <template v-else>
                    <div class="catalog-item-info">
                      <span class="catalog-item-nom">{{ item.nom }}</span>
                      <span v-if="item.description" class="catalog-item-desc">{{ item.description }}</span>
                    </div>
                    <div class="catalog-item-actions">
                      <button type="button" class="icon-action-btn" title="Modifier" @click="startMedocEdit(item)">
                        <Pencil :size="15" />
                      </button>
                      <button type="button" class="icon-action-btn icon-action-btn--danger" title="Supprimer" @click="confirmDelete('medoc', item.nom)">
                        <Trash2 :size="15" />
                      </button>
                    </div>
                  </template>
                </li>
              </ul>
              <form class="catalog-add-form" @submit.prevent="addMedoc">
                <input v-model="newMedocNom" placeholder="Ajouter un médicament" class="catalog-input" />
                <button type="submit" class="btn-primary btn-sm">
                  <Plus :size="14" />
                  Ajouter
                </button>
              </form>
            </div>

            <!-- Step 1: Symptômes -->
            <div v-else-if="stepIndex === 1">
              <ul class="catalog-list">
                <li v-for="nom in symptomes.symptomes()" :key="nom" class="catalog-item">
                  <div v-if="editingSymptome?.nom === nom" class="catalog-edit-form">
                    <input v-model="editingSymptome.newNom" placeholder="Nouveau nom" class="catalog-input" @keyup.enter="saveSymptomeEdit" @keyup.escape="editingSymptome = null" />
                    <div class="catalog-edit-actions">
                      <button type="button" class="btn-secondary btn-sm" @click="editingSymptome = null">Annuler</button>
                      <button type="button" class="btn-primary btn-sm" @click="saveSymptomeEdit">Enregistrer</button>
                    </div>
                  </div>
                  <template v-else>
                    <div class="catalog-item-info">
                      <span class="catalog-item-nom">{{ nom }}</span>
                      <span v-if="symptomes.isDefault(nom)" class="catalog-item-badge">défaut</span>
                    </div>
                    <div class="catalog-item-actions">
                      <button v-if="!symptomes.isDefault(nom)" type="button" class="icon-action-btn" title="Renommer" @click="startSymptomeEdit(nom)">
                        <Pencil :size="15" />
                      </button>
                      <button v-if="!symptomes.isDefault(nom)" type="button" class="icon-action-btn icon-action-btn--danger" title="Supprimer" @click="confirmDelete('symptome', nom)">
                        <Trash2 :size="15" />
                      </button>
                    </div>
                  </template>
                </li>
              </ul>
              <form class="catalog-add-form" @submit.prevent="addSymptome">
                <input v-model="newSymptomeNom" placeholder="Ajouter un symptôme" class="catalog-input" />
                <button type="submit" class="btn-primary btn-sm">
                  <Plus :size="14" />
                  Ajouter
                </button>
              </form>
            </div>

            <!-- Step 2: Déclencheurs -->
            <div v-else-if="stepIndex === 2">
              <ul class="catalog-list">
                <li v-for="tag in declencheurs.tags()" :key="tag" class="catalog-item">
                  <div class="catalog-item-info">
                    <span class="catalog-item-nom">{{ tag }}</span>
                    <span v-if="declencheurs.isDefault(tag)" class="catalog-item-badge">défaut</span>
                  </div>
                  <div class="catalog-item-actions">
                    <button v-if="!declencheurs.isDefault(tag)" type="button" class="icon-action-btn icon-action-btn--danger" title="Supprimer" @click="confirmDelete('declencheur', tag)">
                      <Trash2 :size="15" />
                    </button>
                  </div>
                </li>
              </ul>
              <form class="catalog-add-form" @submit.prevent="addDeclencheur">
                <input v-model="newDeclencheurTag" placeholder="Ajouter un déclencheur" class="catalog-input" />
                <button type="submit" class="btn-primary btn-sm">
                  <Plus :size="14" />
                  Ajouter
                </button>
              </form>
            </div>
          </div>
        </Transition>
        </div>
      </div>

      <div class="modal-actions">
        <button
          type="button"
          class="action-btn action-btn-prev"
          :style="prevVisible ? {} : { visibility: 'hidden' }"
          @click="goPrev"
        >
          <ArrowLeft :size="16" />
          Préc.
        </button>
        <button type="button" class="action-btn action-btn-close" @click="$emit('close')">
          Fermer
        </button>
        <button
          type="button"
          class="action-btn action-btn-next"
          :style="nextVisible ? {} : { visibility: 'hidden' }"
          @click="goNext"
        >
          Suiv.
          <ArrowRight :size="16" />
        </button>
      </div>
    </div>

    <ConfirmDialog
      v-if="pendingDelete"
      title="Supprimer ?"
      :message="deleteMessage"
      confirm-label="Supprimer"
      cancel-label="Annuler"
      @confirm="executeDelete"
      @cancel="pendingDelete = null"
      @dismiss="pendingDelete = null"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { ArrowLeft, ArrowRight, Pencil, Trash2, Plus, Pill, Heart, Zap } from 'lucide-vue-next'
import ConfirmDialog from './ConfirmDialog.vue'
import { useMedocsFavorisStore } from '../stores/medocsFavoris'
import { useSymptomesStore } from '../stores/symptomes'
import { useDeclencheursStore } from '../stores/declencheurs'
import { capitalizeFirstLetter } from '../utils/text'
import type { MedocFavori } from '../types/migraine'

defineEmits<{ close: [] }>()

const medocs = useMedocsFavorisStore()
const symptomes = useSymptomesStore()
const declencheurs = useDeclencheursStore()

const stepTitles = ['Médicaments', 'Symptômes', 'Déclencheurs']
const stepShortTitles = ['Médocs', 'Symptômes', 'Déclencheurs']
const stepIcons = [Pill, Heart, Zap]
const stepIndex = ref(0)

const progressPercent = computed(() => ((stepIndex.value + 1) / stepTitles.length) * 100)
const transitionName = ref<'slide-next' | 'slide-prev'>('slide-next')
const isTransitioning = ref(false)

const prevVisible = computed(() => stepIndex.value > 0)
const nextVisible = computed(() => stepIndex.value < stepTitles.length - 1)

function goNext() {
  if (stepIndex.value >= stepTitles.length - 1) return
  transitionName.value = 'slide-next'
  stepIndex.value++
}
function goPrev() {
  if (stepIndex.value <= 0) return
  transitionName.value = 'slide-prev'
  stepIndex.value--
}
function goToStep(i: number) {
  if (i === stepIndex.value) return
  transitionName.value = i > stepIndex.value ? 'slide-next' : 'slide-prev'
  stepIndex.value = i
}

// Médicaments
const newMedocNom = ref('')
const editingMedoc = ref<{ nom: string; newNom: string; description: string } | null>(null)

function addMedoc() {
  if (!newMedocNom.value.trim()) return
  medocs.addMedoc(capitalizeFirstLetter(newMedocNom.value.trim()))
  newMedocNom.value = ''
}
function startMedocEdit(item: MedocFavori) {
  editingMedoc.value = { nom: item.nom, newNom: item.nom, description: item.description ?? '' }
}
function saveMedocEdit() {
  if (!editingMedoc.value) return
  const { nom, newNom, description } = editingMedoc.value
  const capitalized = capitalizeFirstLetter(newNom.trim())
  if (capitalized && capitalized !== nom) medocs.renameMedoc(nom, capitalized)
  medocs.updateDescription(capitalized || nom, description)
  editingMedoc.value = null
}

// Symptômes
const newSymptomeNom = ref('')
const editingSymptome = ref<{ nom: string; newNom: string } | null>(null)

function addSymptome() {
  if (!newSymptomeNom.value.trim()) return
  symptomes.add(capitalizeFirstLetter(newSymptomeNom.value.trim()))
  newSymptomeNom.value = ''
}
function startSymptomeEdit(nom: string) {
  editingSymptome.value = { nom, newNom: nom }
}
function saveSymptomeEdit() {
  if (!editingSymptome.value) return
  const { nom, newNom } = editingSymptome.value
  const capitalized = capitalizeFirstLetter(newNom.trim())
  if (capitalized && capitalized !== nom) symptomes.rename(nom, capitalized)
  editingSymptome.value = null
}

// Déclencheurs
const newDeclencheurTag = ref('')
function addDeclencheur() {
  if (!newDeclencheurTag.value.trim()) return
  declencheurs.register(capitalizeFirstLetter(newDeclencheurTag.value.trim()))
  newDeclencheurTag.value = ''
}

// Delete confirmation
type DeleteTarget = { type: 'medoc' | 'symptome' | 'declencheur'; nom: string }
const pendingDelete = ref<DeleteTarget | null>(null)
const deleteMessage = computed(() => {
  if (!pendingDelete.value) return ''
  return `Supprimer "${pendingDelete.value.nom}" du répertoire ?`
})

function confirmDelete(type: DeleteTarget['type'], nom: string) {
  pendingDelete.value = { type, nom }
}
function executeDelete() {
  if (!pendingDelete.value) return
  const { type, nom } = pendingDelete.value
  if (type === 'medoc') medocs.deleteMedoc(nom)
  else if (type === 'symptome') symptomes.remove(nom)
  else if (type === 'declencheur') declencheurs.deleteCustom(nom)
  pendingDelete.value = null
}
</script>

<style scoped>
.modal-backdrop {
  position: fixed;
  top: 3.5rem;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.4);
  z-index: 30;
}
.modal-sheet {
  background: var(--color-surface);
  width: 100%;
  box-sizing: border-box;
  height: calc(100dvh - 3.5rem);
  display: flex;
  flex-direction: column;
  border-radius: 0;
  overflow: hidden;
}
.modal-header {
  display: flex;
  flex-direction: column;
  padding: 0.6rem 1rem 0.4rem;
  gap: 0.3rem;
  position: relative;
}
.modal-title-row {
  display: flex;
  align-items: center;
}
.modal-form-title {
  font-size: 0.7rem;
  font-weight: 600;
  color: var(--color-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.modal-close-btn {
  position: absolute;
  top: 0.5rem;
  right: 0.75rem;
  background: none;
  border: none;
  font-size: 1.5rem;
  line-height: 1;
  cursor: pointer;
  color: var(--color-muted);
  padding: 0.25rem;
}
.stepper-nav {
  display: flex;
  gap: 0.25rem;
  padding-right: 2rem;
}
.stepper-btn {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.2rem;
  padding: 0.3rem 0.5rem;
  border-radius: 0.4rem;
  border: 1px solid transparent;
  background: none;
  cursor: pointer;
  color: var(--color-muted);
  min-width: 3rem;
}
.stepper-btn.past {
  color: var(--color-accent);
  opacity: 0.6;
}
.stepper-btn.active {
  color: var(--color-accent);
  border-color: var(--color-accent);
  background: color-mix(in srgb, var(--color-accent) 10%, transparent);
}
.stepper-label {
  font-size: 0.55rem;
  white-space: nowrap;
}
.progress-bar {
  height: 0.25rem;
  background: var(--color-bg);
  margin: 0 1.5rem;
  border-radius: 0.25rem;
  overflow: hidden;
}
.progress-bar-fill {
  height: 100%;
  background: var(--color-accent);
  transition: width 0.2s ease;
}
.modal-body {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  display: flex;
  flex-direction: column;
  position: relative;
}
.modal-body.transitioning {
  overflow: hidden;
}
.modal-body-inner {
  margin: auto;
  width: 100%;
  padding: 1.25rem 1.5rem;
  box-sizing: border-box;
  flex-shrink: 0;
  position: relative;
}
.step-content {
  min-height: 100%;
}
.slide-next-enter-active,
.slide-next-leave-active,
.slide-prev-enter-active,
.slide-prev-leave-active {
  transition: transform 0.22s ease, opacity 0.22s ease;
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  padding: 1.25rem 1.5rem;
}
.slide-next-enter-from { transform: translateX(100%); opacity: 0; }
.slide-next-leave-to { transform: translateX(-100%); opacity: 0; }
.slide-prev-enter-from { transform: translateX(-100%); opacity: 0; }
.slide-prev-leave-to { transform: translateX(100%); opacity: 0; }
.catalog-list {
  list-style: none;
  padding: 0;
  margin: 0 0 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}
.catalog-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  border-radius: 0.5rem;
  background: var(--color-bg);
  min-height: 2.5rem;
}
.catalog-item-info {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
  flex: 1;
  min-width: 0;
}
.catalog-item-nom {
  font-size: 0.9rem;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.catalog-item-desc {
  font-size: 0.75rem;
  color: var(--color-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.catalog-item-badge {
  font-size: 0.65rem;
  color: var(--color-muted);
  border: 1px solid var(--color-muted);
  border-radius: 0.25rem;
  padding: 0 0.3rem;
  align-self: flex-start;
}
.catalog-item-actions {
  display: flex;
  gap: 0.25rem;
  flex-shrink: 0;
}
.icon-action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border-radius: 0.4rem;
  border: none;
  background: none;
  color: var(--color-muted);
  cursor: pointer;
}
.icon-action-btn:hover {
  background: color-mix(in srgb, var(--color-muted) 15%, transparent);
}
.icon-action-btn--danger { color: var(--color-danger); }
.icon-action-btn--danger:hover {
  background: color-mix(in srgb, var(--color-danger) 12%, transparent);
}
.catalog-edit-form {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  flex: 1;
}
.catalog-edit-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}
.catalog-add-form {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}
.catalog-input {
  padding: 0.5rem 0.75rem;
  border-radius: 0.5rem;
  border: 1px solid var(--color-muted);
  background: var(--color-surface);
  color: var(--color-text);
  flex: 1;
  font-size: 0.9rem;
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
.modal-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  border-top: 1px solid var(--color-bg);
  flex-shrink: 0;
}
.action-btn {
  flex: 1;
  min-width: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  padding: 0.6rem 0.5rem;
  border-radius: 0.5rem;
  border: 1px solid var(--color-muted);
  background: var(--color-surface);
  color: var(--color-text);
  font-size: 0.85rem;
  cursor: pointer;
  white-space: nowrap;
  overflow: hidden;
}
.action-btn-close {
  background: var(--color-muted);
  color: var(--color-surface);
  border-color: var(--color-muted);
}
.action-btn-next {
  background: var(--color-info);
  color: var(--color-info-contrast);
  border-color: var(--color-info);
}
.action-btn-prev {
  background: transparent;
  color: var(--color-info);
  border-color: var(--color-info);
}
@media (min-width: 1024px) {
  .modal-backdrop {
    top: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 2rem;
  }
  .modal-sheet {
    width: 480px;
    height: calc(100dvh - 4rem);
    border-radius: 1rem;
  }
}
</style>
