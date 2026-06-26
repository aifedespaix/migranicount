import { defineStore } from 'pinia'
import { ref } from 'vue'
import { listDeclencheursFavoris, registerDeclencheur, deleteDeclencheur } from '../storage/migraineRepository'
import { pb } from '../lib/pocketbase'
import { patchPreferences } from '../lib/pbSync'

const DEFAULTS = ['Stress', 'Manque de sommeil', 'Règles', 'Alcool', 'Écrans', 'Météo', 'Alimentation', 'Déshydratation', 'Effort physique', 'Odeurs fortes']

export const useDeclencheursStore = defineStore('declencheurs', () => {
  const customTags = ref(listDeclencheursFavoris())

  function register(tag: string): void {
    registerDeclencheur(tag)
    customTags.value = listDeclencheursFavoris()
    if (pb.authStore.isValid) {
      patchPreferences({ declencheursFavoris: customTags.value }).catch(console.error)
    }
  }

  function deleteCustom(tag: string): void {
    deleteDeclencheur(tag)
    customTags.value = listDeclencheursFavoris()
    if (pb.authStore.isValid) {
      patchPreferences({ declencheursFavoris: customTags.value }).catch(console.error)
    }
  }

  const tags = () => Array.from(new Set([...DEFAULTS, ...customTags.value]))
  const isDefault = (tag: string) => DEFAULTS.includes(tag)

  function refresh(): void {
    customTags.value = listDeclencheursFavoris()
  }

  return { customTags, tags, register, deleteCustom, isDefault, refresh }
})
