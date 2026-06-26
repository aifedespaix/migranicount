import { defineStore } from 'pinia'
import { ref } from 'vue'
import { listMigraines, saveMigraine, deleteMigraine, getMigraine } from '../storage/migraineRepository'
import { pb } from '../lib/pocketbase'
import { pushMigraine, deleteMigraineRemote } from '../lib/pbSync'
import type { Migraine } from '../types/migraine'

type MigraineInput = Omit<Migraine, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }

export const useMigrainesStore = defineStore('migraines', () => {
  const migraines = ref<Migraine[]>(listMigraines())

  function save(input: MigraineInput): Migraine {
    const result = saveMigraine(input)
    migraines.value = listMigraines()
    if (pb.authStore.isValid) pushMigraine(result).catch(console.error)
    return result
  }

  function remove(id: string): void {
    deleteMigraine(id)
    migraines.value = listMigraines()
    if (pb.authStore.isValid) deleteMigraineRemote(id).catch(console.error)
  }

  function getById(id: string): Migraine | undefined {
    return getMigraine(id)
  }

  function refresh(): void {
    migraines.value = listMigraines()
  }

  return { migraines, save, remove, getById, refresh }
})
