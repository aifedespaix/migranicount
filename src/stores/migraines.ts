import { defineStore } from 'pinia'
import { ref } from 'vue'
import { listMigraines, saveMigraine, deleteMigraine, getMigraine, recordTombstone, restoreMigraine } from '../storage/migraineRepository'
import { pb } from '../lib/pocketbase'
import { enqueue } from '../lib/syncOutbox'
import type { Migraine } from '../types/migraine'

type MigraineInput = Omit<Migraine, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }

export const useMigrainesStore = defineStore('migraines', () => {
  const migraines = ref<Migraine[]>(listMigraines())

  function save(input: MigraineInput): Migraine {
    const result = saveMigraine(input)
    migraines.value = listMigraines()
    if (pb.authStore.isValid) enqueue({ type: 'migraine-upsert', migraine: result })
    return result
  }

  function remove(id: string): void {
    deleteMigraine(id)
    const tombstone = recordTombstone('migraine', id)
    migraines.value = listMigraines()
    if (pb.authStore.isValid) enqueue({ type: 'migraine-delete', id, tombstone })
  }

  function restore(m: Migraine): void {
    const saved = restoreMigraine(m)
    migraines.value = listMigraines()
    if (pb.authStore.isValid) {
      enqueue({ type: 'migraine-upsert', migraine: saved })
      enqueue({ type: 'tombstone-clear', entityType: 'migraine', entityId: saved.id })
    }
  }

  function getById(id: string): Migraine | undefined {
    return getMigraine(id)
  }

  function refresh(): void {
    migraines.value = listMigraines()
  }

  return { migraines, save, remove, restore, getById, refresh }
})
