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
} from '../storage/migraineRepository'
import { pb } from '../lib/pocketbase'
import { pushMedocFavori, deleteMedocFavoriRemote } from '../lib/pbSync'
import type { TreatmentPeriod, MedocFavori } from '../types/migraine'
import type { DefaultMedication } from '../data/defaultMedications'

export const useMedocsFavorisStore = defineStore('medocsFavoris', () => {
  const favoris = ref(listMedocsFavoris())

  function registerUsage(nom: string, description?: string): void {
    registerMedocUsage(nom, description)
    favoris.value = listMedocsFavoris()
    const updated = favoris.value.find((f) => f.nom === nom)
    if (updated && pb.authStore.isValid) pushMedocFavori(updated).catch(console.error)
  }

  function updateDescription(nom: string, description: string): void {
    updateMedocFavoriDescription(nom, description)
    favoris.value = listMedocsFavoris()
    const updated = favoris.value.find((f) => f.nom === nom)
    if (updated && pb.authStore.isValid) pushMedocFavori(updated).catch(console.error)
  }

  function addMedoc(nom: string, description?: string): void {
    addMedocFavori(nom, description)
    favoris.value = listMedocsFavoris()
    const added = favoris.value.find((f) => f.nom === nom)
    if (added && pb.authStore.isValid) pushMedocFavori(added).catch(console.error)
  }

  function deleteMedoc(nom: string): void {
    deleteMedocFavori(nom)
    favoris.value = listMedocsFavoris()
    if (pb.authStore.isValid) deleteMedocFavoriRemote(nom).catch(console.error)
  }

  function restore(medoc: MedocFavori): void {
    addMedocFavoriWithDetails(medoc)
    favoris.value = listMedocsFavoris()
    const added = favoris.value.find((f) => f.nom === medoc.nom)
    if (added && pb.authStore.isValid) pushMedocFavori(added).catch(console.error)
  }

  function updatePosologie(nom: string, posologieParJour?: number, intervalleHeures?: number): void {
    updateMedocFavoriPosologie(nom, posologieParJour, intervalleHeures)
    favoris.value = listMedocsFavoris()
    const updated = favoris.value.find((f) => f.nom === nom)
    if (updated && pb.authStore.isValid) pushMedocFavori(updated).catch(console.error)
  }

  function renameMedoc(oldNom: string, newNom: string): void {
    renameMedocFavori(oldNom, newNom)
    favoris.value = listMedocsFavoris()
    if (pb.authStore.isValid) {
      deleteMedocFavoriRemote(oldNom).catch(console.error)
      const renamed = favoris.value.find((f) => f.nom === newNom)
      if (renamed) pushMedocFavori(renamed).catch(console.error)
    }
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
    const added = favoris.value.find((f) => f.nom === med.nom)
    if (added && pb.authStore.isValid) pushMedocFavori(added).catch(console.error)
  }

  function updateDetails(
    nom: string,
    updates: Partial<Pick<MedocFavori, 'isLongTermTreatment' | 'sideEffects' | 'expectedEffects'>>,
  ): void {
    updateMedocFavoriDetails(nom, updates)
    favoris.value = listMedocsFavoris()
    const updated = favoris.value.find((f) => f.nom === nom)
    if (updated && pb.authStore.isValid) pushMedocFavori(updated).catch(console.error)
  }

  function addPeriod(nom: string, period: TreatmentPeriod): void {
    repoAddTreatmentPeriod(nom, period)
    favoris.value = listMedocsFavoris()
    const updated = favoris.value.find((f) => f.nom === nom)
    if (updated && pb.authStore.isValid) pushMedocFavori(updated).catch(console.error)
  }

  function updatePeriod(nom: string, index: number, period: TreatmentPeriod): void {
    repoUpdateTreatmentPeriod(nom, index, period)
    favoris.value = listMedocsFavoris()
    const updated = favoris.value.find((f) => f.nom === nom)
    if (updated && pb.authStore.isValid) pushMedocFavori(updated).catch(console.error)
  }

  function removePeriod(nom: string, index: number): void {
    repoRemoveTreatmentPeriod(nom, index)
    favoris.value = listMedocsFavoris()
    const updated = favoris.value.find((f) => f.nom === nom)
    if (updated && pb.authStore.isValid) pushMedocFavori(updated).catch(console.error)
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
