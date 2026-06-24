import { defineStore } from 'pinia'
import { ref } from 'vue'
import { listMigraines, saveMigraine, deleteMigraine, getMigraine } from '../storage/migraineRepository'
import type { Migraine } from '../types/migraine'

type MigraineInput = Omit<Migraine, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }

export const useMigrainesStore = defineStore('migraines', () => {
  const migraines = ref<Migraine[]>(listMigraines())

  function save(input: MigraineInput): Migraine {
    const result = saveMigraine(input)
    migraines.value = listMigraines()
    return result
  }

  function remove(id: string): void {
    deleteMigraine(id)
    migraines.value = listMigraines()
  }

  function getById(id: string): Migraine | undefined {
    return getMigraine(id)
  }

  return { migraines, save, remove, getById }
})
