import { defineStore } from 'pinia'
import { ref } from 'vue'
import { listSymptomesCustom, addSymptomeCustom, deleteSymptomeCustom, renameSymptomeCustom } from '../storage/migraineRepository'

const DEFAULTS = ['Nausée', 'Vomissement', 'Aura visuelle']

export const useSymptomesStore = defineStore('symptomes', () => {
  const customSymptomes = ref(listSymptomesCustom())

  function symptomes() {
    return Array.from(new Set([...DEFAULTS, ...customSymptomes.value]))
  }

  function isDefault(nom: string) {
    return DEFAULTS.includes(nom)
  }

  function add(nom: string): void {
    addSymptomeCustom(nom)
    customSymptomes.value = listSymptomesCustom()
  }

  function remove(nom: string): void {
    deleteSymptomeCustom(nom)
    customSymptomes.value = listSymptomesCustom()
  }

  function rename(oldNom: string, newNom: string): void {
    renameSymptomeCustom(oldNom, newNom)
    customSymptomes.value = listSymptomesCustom()
  }

  return { customSymptomes, symptomes, isDefault, add, remove, rename }
})
