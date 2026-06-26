import { defineStore } from 'pinia'
import { ref } from 'vue'
import {
  listSymptomesCustom,
  addSymptomeCustom,
  deleteSymptomeCustom,
  renameSymptomeCustom,
} from '../storage/migraineRepository'
import { pb } from '../lib/pocketbase'
import { patchPreferences } from '../lib/pbSync'

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
    if (pb.authStore.isValid) {
      patchPreferences({ symptomesCustom: customSymptomes.value }).catch(console.error)
    }
  }

  function remove(nom: string): void {
    deleteSymptomeCustom(nom)
    customSymptomes.value = listSymptomesCustom()
    if (pb.authStore.isValid) {
      patchPreferences({ symptomesCustom: customSymptomes.value }).catch(console.error)
    }
  }

  function rename(oldNom: string, newNom: string): void {
    renameSymptomeCustom(oldNom, newNom)
    customSymptomes.value = listSymptomesCustom()
    if (pb.authStore.isValid) {
      patchPreferences({ symptomesCustom: customSymptomes.value }).catch(console.error)
    }
  }

  function refresh(): void {
    customSymptomes.value = listSymptomesCustom()
  }

  return { customSymptomes, symptomes, isDefault, add, remove, rename, refresh }
})
