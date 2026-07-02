import { defineStore } from 'pinia'
import { ref } from 'vue'
import { listDeclencheursFavoris, registerDeclencheur, deleteDeclencheur, restoreDeclencheur, recordTombstone } from '../storage/migraineRepository'
import { pb } from '../lib/pocketbase'
import { enqueue } from '../lib/syncOutbox'
import { DEFAULT_DECLENCHEURS } from '../data/defaultTags'
import type { CatalogTag } from '../types/migraine'

export const useDeclencheursStore = defineStore('declencheurs', () => {
  const customTags = ref(listDeclencheursFavoris())

  function register(nom: string): CatalogTag {
    const created = registerDeclencheur(nom)
    customTags.value = listDeclencheursFavoris()
    if (pb.authStore.isValid) {
      enqueue({ type: 'preferences-patch', patch: { declencheursFavoris: customTags.value } })
    }
    return created
  }

  function deleteCustom(id: string): void {
    deleteDeclencheur(id)
    const tombstone = recordTombstone('declencheur', id)
    customTags.value = listDeclencheursFavoris()
    if (pb.authStore.isValid) {
      enqueue({ type: 'preferences-patch', patch: { declencheursFavoris: customTags.value } })
      enqueue({ type: 'tombstone-push', tombstone })
    }
  }

  const tags = (): CatalogTag[] => [...DEFAULT_DECLENCHEURS, ...customTags.value]
  const isDefault = (id: string) => DEFAULT_DECLENCHEURS.some((d) => d.id === id)

  function restore(tag: CatalogTag): void {
    restoreDeclencheur(tag)
    customTags.value = listDeclencheursFavoris()
    if (pb.authStore.isValid) {
      enqueue({ type: 'preferences-patch', patch: { declencheursFavoris: customTags.value } })
      enqueue({ type: 'tombstone-clear', entityType: 'declencheur', entityId: tag.id })
    }
  }

  function refresh(): void {
    customTags.value = listDeclencheursFavoris()
  }

  return { customTags, tags, register, deleteCustom, isDefault, restore, refresh }
})
