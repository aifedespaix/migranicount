import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import {
  listMedocsFavoris,
  registerMedocUsage,
  updateMedocFavoriDescription,
  updateMedocFavoriPosologie,
  addMedocFavori,
  deleteMedocFavori,
  renameMedocFavori,
  addMedocFavoriWithDetails,
  updateMedocFavoriDetails,
  addTreatmentPeriod as repoAddTreatmentPeriod,
  updateTreatmentPeriod as repoUpdateTreatmentPeriod,
  removeTreatmentPeriod as repoRemoveTreatmentPeriod,
  recordTombstone,
} from '../storage/migraineRepository'
import { pb } from '../lib/pocketbase'
import { enqueue } from '../lib/syncOutbox'
import type { TreatmentPeriod, MedocFavori } from '../types/migraine'
import type { DefaultMedication } from '../data/defaultMedications'

export const useMedocsFavorisStore = defineStore('medocsFavoris', () => {
  const favoris = ref(listMedocsFavoris())

  function pushIfOnline(medoc: MedocFavori | undefined): void {
    if (medoc && pb.authStore.isValid) enqueue({ type: 'medoc-upsert', medoc })
  }

  function registerUsage(nom: string, description?: string): MedocFavori {
    registerMedocUsage(nom, description)
    favoris.value = listMedocsFavoris()
    const updated = favoris.value.find((f) => f.nom === nom)!
    pushIfOnline(updated)
    return updated
  }

  function updateDescription(id: string, description: string): void {
    updateMedocFavoriDescription(id, description)
    favoris.value = listMedocsFavoris()
    pushIfOnline(favoris.value.find((f) => f.id === id))
  }

  function addMedoc(nom: string, description?: string): void {
    addMedocFavori(nom, description)
    favoris.value = listMedocsFavoris()
    pushIfOnline(favoris.value.find((f) => f.nom === nom))
  }

  function deleteMedoc(id: string): void {
    deleteMedocFavori(id)
    const tombstone = recordTombstone('medoc', id)
    favoris.value = listMedocsFavoris()
    if (pb.authStore.isValid) enqueue({ type: 'medoc-delete', id, tombstone })
  }

  function restore(medoc: MedocFavori): void {
    addMedocFavoriWithDetails(medoc)
    favoris.value = listMedocsFavoris()
    const added = favoris.value.find((f) => f.id === medoc.id)
    if (added && pb.authStore.isValid) {
      enqueue({ type: 'medoc-upsert', medoc: added })
      enqueue({ type: 'tombstone-clear', entityType: 'medoc', entityId: medoc.id })
    }
  }

  function updatePosologie(id: string, posologieParJour?: number, intervalleHeures?: number): void {
    updateMedocFavoriPosologie(id, posologieParJour, intervalleHeures)
    favoris.value = listMedocsFavoris()
    pushIfOnline(favoris.value.find((f) => f.id === id))
  }

  function renameMedoc(id: string, newNom: string): void {
    renameMedocFavori(id, newNom)
    favoris.value = listMedocsFavoris()
    pushIfOnline(favoris.value.find((f) => f.id === id))
  }

  function refresh(): void {
    favoris.value = listMedocsFavoris()
  }

  const longTermMeds = computed(() => favoris.value.filter((f) => f.isLongTermTreatment === true))
  const crisisMeds = computed(() => favoris.value.filter((f) => !f.isLongTermTreatment))

  function addFromDefault(med: DefaultMedication): void {
    addMedocFavoriWithDetails({
      nom: med.nom,
      description: med.description,
      posologieParJour: med.posologieParJour,
      intervalleHeures: med.intervalleHeures,
      isLongTermTreatment: med.isLongTermTreatment,
      sideEffects: med.sideEffects,
      expectedEffects: med.expectedEffects,
    })
    favoris.value = listMedocsFavoris()
    pushIfOnline(favoris.value.find((f) => f.nom === med.nom))
  }

  function updateDetails(
    id: string,
    updates: Partial<Pick<MedocFavori, 'isLongTermTreatment' | 'sideEffects' | 'expectedEffects'>>,
  ): void {
    updateMedocFavoriDetails(id, updates)
    favoris.value = listMedocsFavoris()
    pushIfOnline(favoris.value.find((f) => f.id === id))
  }

  function addPeriod(medocId: string, period: Omit<TreatmentPeriod, 'id' | 'updatedAt'>): void {
    repoAddTreatmentPeriod(medocId, period)
    favoris.value = listMedocsFavoris()
    pushIfOnline(favoris.value.find((f) => f.id === medocId))
  }

  function updatePeriod(medocId: string, periodId: string, period: Omit<TreatmentPeriod, 'id' | 'updatedAt'>): void {
    repoUpdateTreatmentPeriod(medocId, periodId, period)
    favoris.value = listMedocsFavoris()
    pushIfOnline(favoris.value.find((f) => f.id === medocId))
  }

  function removePeriod(medocId: string, periodId: string): void {
    repoRemoveTreatmentPeriod(medocId, periodId)
    favoris.value = listMedocsFavoris()
    pushIfOnline(favoris.value.find((f) => f.id === medocId))
  }

  return {
    favoris,
    longTermMeds,
    crisisMeds,
    registerUsage,
    updateDescription,
    updatePosologie,
    addMedoc,
    deleteMedoc,
    restore,
    renameMedoc,
    refresh,
    addFromDefault,
    updateDetails,
    addPeriod,
    updatePeriod,
    removePeriod,
  }
})
