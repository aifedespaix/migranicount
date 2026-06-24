import { defineStore } from 'pinia'
import { ref } from 'vue'
import { listDeclencheursFavoris, registerDeclencheur } from '../storage/migraineRepository'

const DEFAULTS = ['stress', 'manque de sommeil', 'règles', 'alcool', 'écrans', 'météo', 'alimentation', 'déshydratation', 'effort physique', 'odeurs fortes']

export const useDeclencheursStore = defineStore('declencheurs', () => {
  const customTags = ref(listDeclencheursFavoris())

  function register(tag: string): void {
    registerDeclencheur(tag)
    customTags.value = listDeclencheursFavoris()
  }

  const tags = () => Array.from(new Set([...DEFAULTS, ...customTags.value]))

  return { customTags, tags, register }
})
