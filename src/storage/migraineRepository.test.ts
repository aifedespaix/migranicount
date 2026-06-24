import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  listMigraines, saveMigraine, deleteMigraine, getMigraine,
  listMedocsFavoris, registerMedocUsage,
  listDeclencheursFavoris, registerDeclencheur,
  exportAll, importAll,
} from './migraineRepository'

beforeEach(() => {
  // Clear localStorage by removing all items
  const keys = Object.keys(localStorage)
  keys.forEach(key => localStorage.removeItem(key))
})

describe('saveMigraine', () => {
  it('creates a new migraine with generated id and timestamps', () => {
    const m = saveMigraine({
      date: '2026-06-24', heureDebut: '08:00', heureFin: null,
      medocs: [], intensite: 5, avortee: false, nausee: false,
      vomissement: false, aura: false, localisation: null, declencheurs: [],
    })
    expect(m.id).toBeTruthy()
    expect(m.createdAt).toBeTruthy()
    expect(listMigraines()).toHaveLength(1)
  })

  it('updates an existing migraine by id', () => {
    const m = saveMigraine({
      date: '2026-06-24', heureDebut: '08:00', heureFin: null,
      medocs: [], intensite: 5, avortee: false, nausee: false,
      vomissement: false, aura: false, localisation: null, declencheurs: [],
    })
    saveMigraine({ ...m, intensite: 9 })
    expect(listMigraines()).toHaveLength(1)
    expect(getMigraine(m.id)?.intensite).toBe(9)
  })
})

describe('deleteMigraine', () => {
  it('removes the entry', () => {
    const m = saveMigraine({
      date: '2026-06-24', heureDebut: '08:00', heureFin: null,
      medocs: [], intensite: 5, avortee: false, nausee: false,
      vomissement: false, aura: false, localisation: null, declencheurs: [],
    })
    deleteMigraine(m.id)
    expect(listMigraines()).toHaveLength(0)
  })
})

describe('registerMedocUsage', () => {
  it('adds a new favori with usageCount 1', () => {
    registerMedocUsage('Doliprane', 'antidouleur')
    expect(listMedocsFavoris()).toEqual([{ nom: 'Doliprane', description: 'antidouleur', usageCount: 1 }])
  })

  it('increments usageCount on repeat use', () => {
    registerMedocUsage('Doliprane')
    registerMedocUsage('Doliprane')
    expect(listMedocsFavoris()[0].usageCount).toBe(2)
  })
})

describe('registerDeclencheur', () => {
  it('adds a tag once, no duplicates', () => {
    registerDeclencheur('stress')
    registerDeclencheur('stress')
    expect(listDeclencheursFavoris()).toEqual(['stress'])
  })
})

describe('exportAll / importAll', () => {
  it('round-trips data', () => {
    saveMigraine({
      date: '2026-06-24', heureDebut: '08:00', heureFin: null,
      medocs: [], intensite: 5, avortee: false, nausee: false,
      vomissement: false, aura: false, localisation: null, declencheurs: [],
    })
    registerMedocUsage('Doliprane')
    registerDeclencheur('stress')
    const json = exportAll()
    localStorage.clear()
    importAll(json)
    expect(listMigraines()).toHaveLength(1)
    expect(listMedocsFavoris()).toHaveLength(1)
    expect(listDeclencheursFavoris()).toEqual(['stress'])
  })
})
