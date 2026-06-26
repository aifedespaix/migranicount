import { defineStore } from 'pinia'
import { ref } from 'vue'
import { listDeclencheursFavoris, registerDeclencheur, deleteDeclencheur } from '../storage/migraineRepository'

const DEFAULTS = ['Stress', 'Manque de sommeil', 'Règles', 'Alcool', 'Écrans', 'Météo', 'Alimentation', 'Déshydratation', 'Effort physique', 'Odeurs fortes']

export const useDeclencheursStore = defineStore('declencheurs', () => {
  const customTags = ref(listDeclencheursFavoris())

  function register(tag: string): void {
    registerDeclencheur(tag)
    customTags.value = listDeclencheursFavoris()
  }

  function deleteCustom(tag: string): void {
    deleteDeclencheur(tag)
    customTags.value = listDeclencheursFavoris()
  }

  const tags = () => Array.from(new Set([...DEFAULTS, ...customTags.value]))
  const isDefault = (tag: string) => DEFAULTS.includes(tag)

  return { customTags, tags, register, deleteCustom, isDefault }
})
