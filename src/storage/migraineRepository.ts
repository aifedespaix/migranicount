import { getJSON, setJSON } from './storage'
import { newId } from '../utils/uuid'
import type { Migraine, MedocFavori } from '../types/migraine'

const MIGRAINES_KEY = 'migraines'
const MEDOCS_KEY = 'medocsFavoris'
const DECLENCHEURS_KEY = 'declencheursFavoris'
const SCHEMA_VERSION_KEY = 'schemaVersion'
const SCHEMA_VERSION = 1

export function listMigraines(): Migraine[] {
  return getJSON<Migraine[]>(MIGRAINES_KEY, [])
}

export function getMigraine(id: string): Migraine | undefined {
  return listMigraines().find((m) => m.id === id)
}

type MigraineInput = Omit<Migraine, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }

export function saveMigraine(input: MigraineInput): Migraine {
  const all = listMigraines()
  const now = new Date().toISOString()
  const existingIndex = input.id ? all.findIndex((m) => m.id === input.id) : -1

  if (existingIndex >= 0) {
    const updated: Migraine = { ...all[existingIndex], ...input, id: input.id!, updatedAt: now }
    all[existingIndex] = updated
    setJSON(MIGRAINES_KEY, all)
    return updated
  }

  const created: Migraine = { ...input, id: newId(), createdAt: now, updatedAt: now }
  setJSON(MIGRAINES_KEY, [...all, created])
  return created
}

export function deleteMigraine(id: string): void {
  setJSON(MIGRAINES_KEY, listMigraines().filter((m) => m.id !== id))
}

export function listMedocsFavoris(): MedocFavori[] {
  return getJSON<MedocFavori[]>(MEDOCS_KEY, [])
}

export function registerMedocUsage(nom: string, description?: string): void {
  const favoris = listMedocsFavoris()
  const existing = favoris.find((f) => f.nom === nom)
  if (existing) {
    existing.usageCount += 1
    if (description) existing.description = description
  } else {
    favoris.push({ nom, description, usageCount: 1 })
  }
  setJSON(MEDOCS_KEY, favoris)
}

export function listDeclencheursFavoris(): string[] {
  return getJSON<string[]>(DECLENCHEURS_KEY, [])
}

export function registerDeclencheur(tag: string): void {
  const tags = listDeclencheursFavoris()
  if (!tags.includes(tag)) setJSON(DECLENCHEURS_KEY, [...tags, tag])
}

export function exportAll(): string {
  return JSON.stringify({
    schemaVersion: SCHEMA_VERSION,
    migraines: listMigraines(),
    medocsFavoris: listMedocsFavoris(),
    declencheursFavoris: listDeclencheursFavoris(),
  })
}

export function importAll(json: string): void {
  const data = JSON.parse(json)
  setJSON(MIGRAINES_KEY, data.migraines ?? [])
  setJSON(MEDOCS_KEY, data.medocsFavoris ?? [])
  setJSON(DECLENCHEURS_KEY, data.declencheursFavoris ?? [])
  setJSON(SCHEMA_VERSION_KEY, data.schemaVersion ?? SCHEMA_VERSION)
}
