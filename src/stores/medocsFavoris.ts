import { defineStore } from 'pinia'
import { ref } from 'vue'
import {
  listMedocsFavoris,
  registerMedocUsage,
  updateMedocFavoriDescription,
  addMedocFavori,
  deleteMedocFavori,
  renameMedocFavori,
} from '../storage/migraineRepository'
import { pb } from '../lib/pocketbase'
import { pushMedocFavori, deleteMedocFavoriRemote } from '../lib/pbSync'

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

  return { favoris, registerUsage, updateDescription, addMedoc, deleteMedoc, renameMedoc, refresh }
})
