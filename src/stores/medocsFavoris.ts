import { defineStore } from 'pinia'
import { ref } from 'vue'
import { listMedocsFavoris, registerMedocUsage, updateMedocFavoriDescription } from '../storage/migraineRepository'

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

  return { favoris, registerUsage, updateDescription }
})
