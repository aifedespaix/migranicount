import { defineStore } from 'pinia'
import { ref } from 'vue'
import {
  listSymptomesCustom,
  addSymptomeCustom,
  deleteSymptomeCustom,
  renameSymptomeCustom,
  restoreSymptomeCustom,
  recordTombstone,
} from '../storage/migraineRepository'
import { pb } from '../lib/pocketbase'
import { enqueue } from '../lib/syncOutbox'
import { DEFAULT_SYMPTOMES } from '../data/defaultTags'
import type { CatalogTag } from '../types/migraine'

export const useSymptomesStore = defineStore('symptomes', () => {
  const customSymptomes = ref(listSymptomesCustom())

  function symptomes(): CatalogTag[] {
    return [...DEFAULT_SYMPTOMES, ...customSymptomes.value]
  }

  function isDefault(id: string) {
    return DEFAULT_SYMPTOMES.some((s) => s.id === id)
  }

  function add(nom: string): CatalogTag {
    const created = addSymptomeCustom(nom)
    customSymptomes.value = listSymptomesCustom()
    if (pb.authStore.isValid) {
      enqueue({ type: 'preferences-patch', patch: { symptomesCustom: customSymptomes.value } })
    }
    return created
  }

  function remove(id: string): void {
    deleteSymptomeCustom(id)
    const tombstone = recordTombstone('symptome', id)
    customSymptomes.value = listSymptomesCustom()
    if (pb.authStore.isValid) {
      enqueue({ type: 'preferences-patch', patch: { symptomesCustom: customSymptomes.value } })
      enqueue({ type: 'tombstone-push', tombstone })
    }
  }

  function rename(id: string, newNom: string): void {
    renameSymptomeCustom(id, newNom)
    customSymptomes.value = listSymptomesCustom()
    if (pb.authStore.isValid) {
      enqueue({ type: 'preferences-patch', patch: { symptomesCustom: customSymptomes.value } })
    }
  }

  function restore(tag: CatalogTag): void {
    restoreSymptomeCustom(tag)
    customSymptomes.value = listSymptomesCustom()
    if (pb.authStore.isValid) {
      enqueue({ type: 'preferences-patch', patch: { symptomesCustom: customSymptomes.value } })
      enqueue({ type: 'tombstone-clear', entityType: 'symptome', entityId: tag.id })
    }
  }

  function refresh(): void {
    customSymptomes.value = listSymptomesCustom()
  }

  return { customSymptomes, symptomes, isDefault, add, remove, rename, restore, refresh }
})
