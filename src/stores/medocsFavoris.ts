import { defineStore } from 'pinia'
import { ref } from 'vue'
import { listMedocsFavoris, registerMedocUsage, updateMedocFavoriDescription, addMedocFavori, deleteMedocFavori, renameMedocFavori } from '../storage/migraineRepository'

export const useMedocsFavorisStore = defineStore('medocsFavoris', () => {
  const favoris = ref(listMedocsFavoris())

  function registerUsage(nom: string, description?: string): void {
    registerMedocUsage(nom, description)
    favoris.value = listMedocsFavoris()
  }

  function updateDescription(nom: string, description: string): void {
    updateMedocFavoriDescription(nom, description)
    favoris.value = listMedocsFavoris()
  }

  function addMedoc(nom: string, description?: string): void {
    addMedocFavori(nom, description)
    favoris.value = listMedocsFavoris()
  }

  function deleteMedoc(nom: string): void {
    deleteMedocFavori(nom)
    favoris.value = listMedocsFavoris()
  }

  function renameMedoc(oldNom: string, newNom: string): void {
    renameMedocFavori(oldNom, newNom)
    favoris.value = listMedocsFavoris()
  }

  return { favoris, registerUsage, updateDescription, addMedoc, deleteMedoc, renameMedoc }
})
