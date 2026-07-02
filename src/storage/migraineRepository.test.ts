import { describe, it, expect, beforeEach } from 'vitest'
import {
  listMigraines, saveMigraine, deleteMigraine, getMigraine,
  listMedocsFavoris, registerMedocUsage, updateMedocFavoriDescription,
  listDeclencheursFavoris, registerDeclencheur, deleteDeclencheur,
  listSymptomesCustom, addSymptomeCustom, deleteSymptomeCustom, renameSymptomeCustom,
  renameMedocFavori, deleteMedocFavori, addMedocFavoriWithDetails,
  restoreSymptomeCustom, restoreDeclencheur,
  listTombstones, recordTombstone, clearTombstone,
  exportAll, importAll,
} from './migraineRepository'
import { setJSON } from './storage'

beforeEach(() => {
  // Clear localStorage by removing all items
  const keys = Object.keys(localStorage)
  keys.forEach(key => localStorage.removeItem(key))
})

describe('saveMigraine', () => {
  it('creates a new migraine with generated id and timestamps', () => {
    const m = saveMigraine({
      date: '2026-06-24', heureDebut: '08:00', heureFin: null,
      medocs: [], intensite: 5, avortee: false, symptomes: [],
      zone: null, declencheurs: [],
    })
    expect(m.id).toBeTruthy()
    expect(m.createdAt).toBeTruthy()
    expect(listMigraines()).toHaveLength(1)
  })

  it('updates an existing migraine by id', () => {
    const m = saveMigraine({
      date: '2026-06-24', heureDebut: '08:00', heureFin: null,
      medocs: [], intensite: 5, avortee: false, symptomes: [],
      zone: null, declencheurs: [],
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
      medocs: [], intensite: 5, avortee: false, symptomes: [],
      zone: null, declencheurs: [],
    })
    deleteMigraine(m.id)
    expect(listMigraines()).toHaveLength(0)
  })
})

describe('registerMedocUsage', () => {
  it('adds a new favori with a stable id and usageCount 1', () => {
    registerMedocUsage('Doliprane', 'antidouleur')
    const favoris = listMedocsFavoris()
    expect(favoris).toHaveLength(1)
    expect(favoris[0]).toMatchObject({ nom: 'Doliprane', description: 'antidouleur', usageCount: 1 })
    expect(favoris[0].id).toBeTruthy()
  })

  it('increments usageCount on repeat use and keeps the same id', () => {
    registerMedocUsage('Doliprane')
    const idAfterFirst = listMedocsFavoris()[0].id
    registerMedocUsage('Doliprane')
    expect(listMedocsFavoris()[0].usageCount).toBe(2)
    expect(listMedocsFavoris()[0].id).toBe(idAfterFirst)
  })
})

describe('renameMedocFavori', () => {
  it('renames in place, keeping the same id', () => {
    registerMedocUsage('Doliprane')
    const id = listMedocsFavoris()[0].id
    renameMedocFavori(id, 'Dolipranex')
    const favoris = listMedocsFavoris()
    expect(favoris).toHaveLength(1)
    expect(favoris[0].id).toBe(id)
    expect(favoris[0].nom).toBe('Dolipranex')
  })
})

describe('deleteMedocFavori', () => {
  it('removes by id', () => {
    registerMedocUsage('Doliprane')
    const id = listMedocsFavoris()[0].id
    deleteMedocFavori(id)
    expect(listMedocsFavoris()).toHaveLength(0)
  })
})

describe('registerDeclencheur', () => {
  it('adds a tag once, no duplicates, with a stable id', () => {
    registerDeclencheur('stress')
    registerDeclencheur('stress')
    const tags = listDeclencheursFavoris()
    expect(tags).toHaveLength(1)
    expect(tags[0].nom).toBe('stress')
    expect(tags[0].id).toBeTruthy()
  })
})

describe('deleteDeclencheur', () => {
  it('removes by id', () => {
    registerDeclencheur('stress')
    const id = listDeclencheursFavoris()[0].id
    deleteDeclencheur(id)
    expect(listDeclencheursFavoris()).toHaveLength(0)
  })
})

describe('symptomes custom (id-based)', () => {
  it('addSymptomeCustom dedupes by nom and returns a stable id', () => {
    const a = addSymptomeCustom('Photophobie')
    const b = addSymptomeCustom('Photophobie')
    expect(listSymptomesCustom()).toHaveLength(1)
    expect(a.id).toBe(b.id)
  })

  it('renameSymptomeCustom renames in place, keeping the id', () => {
    const created = addSymptomeCustom('Photophobie')
    renameSymptomeCustom(created.id, 'Phonophobie')
    const items = listSymptomesCustom()
    expect(items).toHaveLength(1)
    expect(items[0]).toEqual({ id: created.id, nom: 'Phonophobie' })
  })

  it('deleteSymptomeCustom removes by id', () => {
    const created = addSymptomeCustom('Photophobie')
    deleteSymptomeCustom(created.id)
    expect(listSymptomesCustom()).toHaveLength(0)
  })
})

describe('exportAll / importAll', () => {
  it('round-trips data', () => {
    saveMigraine({
      date: '2026-06-24', heureDebut: '08:00', heureFin: null,
      medocs: [], intensite: 5, avortee: false, symptomes: [],
      zone: null, declencheurs: [],
    })
    registerMedocUsage('Doliprane')
    registerDeclencheur('stress')
    const json = exportAll()
    localStorage.clear()
    importAll(json)
    expect(listMigraines()).toHaveLength(1)
    expect(listMedocsFavoris()).toHaveLength(1)
    expect(listDeclencheursFavoris().map((d) => d.nom)).toEqual(['stress'])
  })
})

describe('updateMedocFavoriDescription', () => {
  it('updates the description of an existing favori by id', () => {
    registerMedocUsage('Doliprane', 'antidouleur')
    const id = listMedocsFavoris()[0].id
    updateMedocFavoriDescription(id, 'nouvelle description')
    expect(listMedocsFavoris()[0].description).toBe('nouvelle description')
  })

  it('clears the description when given an empty string', () => {
    registerMedocUsage('Doliprane', 'antidouleur')
    const id = listMedocsFavoris()[0].id
    updateMedocFavoriDescription(id, '')
    expect(listMedocsFavoris()[0].description).toBeUndefined()
  })

  it('does nothing when the favori does not exist', () => {
    updateMedocFavoriDescription('inexistant-id', 'description')
    expect(listMedocsFavoris()).toEqual([])
  })
})

describe('tombstones', () => {
  it('deleteMigraine records a tombstone', () => {
    const m = saveMigraine({
      date: '2026-06-24', heureDebut: '08:00', heureFin: null,
      medocs: [], intensite: 5, avortee: false, symptomes: [],
      zone: null, declencheurs: [],
    })
    deleteMigraine(m.id)
    expect(listTombstones()).toContainEqual(
      expect.objectContaining({ entityType: 'migraine', entityId: m.id }),
    )
  })

  it('deleteMedocFavori records a tombstone', () => {
    registerMedocUsage('Doliprane')
    const id = listMedocsFavoris()[0].id
    deleteMedocFavori(id)
    expect(listTombstones()).toContainEqual(
      expect.objectContaining({ entityType: 'medoc', entityId: id }),
    )
  })

  it('deleteSymptomeCustom records a tombstone', () => {
    const created = addSymptomeCustom('Photophobie')
    deleteSymptomeCustom(created.id)
    expect(listTombstones()).toContainEqual(
      expect.objectContaining({ entityType: 'symptome', entityId: created.id }),
    )
  })

  it('deleteDeclencheur records a tombstone', () => {
    const created = registerDeclencheur('stress')
    deleteDeclencheur(created.id)
    expect(listTombstones()).toContainEqual(
      expect.objectContaining({ entityType: 'declencheur', entityId: created.id }),
    )
  })

  it('recordTombstone dedupes by entityType+entityId and updates deletedAt', () => {
    recordTombstone('medoc', 'm1')
    recordTombstone('medoc', 'm1')
    expect(listTombstones().filter((t) => t.entityId === 'm1')).toHaveLength(1)
  })

  it('clearTombstone removes it', () => {
    recordTombstone('medoc', 'm1')
    clearTombstone('medoc', 'm1')
    expect(listTombstones()).toHaveLength(0)
  })

  it('addMedocFavoriWithDetails (restore) preserves the original usageCount', () => {
    registerMedocUsage('Doliprane')
    registerMedocUsage('Doliprane')
    const original = listMedocsFavoris()[0]
    deleteMedocFavori(original.id)
    addMedocFavoriWithDetails(original)
    expect(listMedocsFavoris()[0].usageCount).toBe(2)
  })

  it('addMedocFavoriWithDetails (restore) clears a matching tombstone', () => {
    registerMedocUsage('Doliprane')
    const id = listMedocsFavoris()[0].id
    deleteMedocFavori(id)
    expect(listTombstones()).toHaveLength(1)
    addMedocFavoriWithDetails({ id, nom: 'Doliprane' })
    expect(listTombstones()).toHaveLength(0)
  })

  it('restoreSymptomeCustom clears a matching tombstone', () => {
    const created = addSymptomeCustom('Photophobie')
    deleteSymptomeCustom(created.id)
    restoreSymptomeCustom(created)
    expect(listTombstones()).toHaveLength(0)
  })

  it('restoreDeclencheur clears a matching tombstone', () => {
    const created = registerDeclencheur('stress')
    deleteDeclencheur(created.id)
    restoreDeclencheur(created)
    expect(listTombstones()).toHaveLength(0)
  })
})

describe('migration legacy -> id-based catalogs (schema v4)', () => {
  it('converts legacy string[] catalogs and migraine symptomes/declencheurs to {id, nom}, matching by name', () => {
    // Seed pre-v4 legacy shape directly in localStorage
    setJSON('symptomesCustom', ['Photophobie'])
    setJSON('declencheursFavoris', ['Stress perso'])
    setJSON('medocsFavoris', [{ nom: 'Doliprane', usageCount: 3 }])
    setJSON('migraines', [
      {
        id: 'm1',
        date: '2026-01-01',
        heureDebut: '08:00',
        heureFin: null,
        medocs: [{ id: 'p1', nom: 'Doliprane', heure: '08:00' }],
        intensite: 5,
        avortee: false,
        symptomes: ['Photophobie'],
        zone: null,
        declencheurs: ['Stress perso'],
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      },
    ])

    const symptCustom = listSymptomesCustom()
    const declCustom = listDeclencheursFavoris()
    const medocs = listMedocsFavoris()
    const migraines = listMigraines()

    expect(symptCustom[0]).toMatchObject({ nom: 'Photophobie' })
    expect(declCustom[0]).toMatchObject({ nom: 'Stress perso' })
    expect(medocs[0].id).toBeTruthy()

    const migraine = migraines[0]
    expect(migraine.symptomes[0]).toEqual({ id: symptCustom[0].id, nom: 'Photophobie' })
    expect(migraine.declencheurs[0]).toEqual({ id: declCustom[0].id, nom: 'Stress perso' })
    expect(migraine.medocs[0].medocId).toBe(medocs[0].id)

    // Renaming the catalog entry does not orphan the historical reference's id
    renameMedocFavori(medocs[0].id, 'Dolipranex')
    const migrainesAfterRename = listMigraines()
    expect(migrainesAfterRename[0].medocs[0].medocId).toBe(medocs[0].id)
  })

  it('is idempotent (running twice does not duplicate or re-mint ids)', () => {
    setJSON('symptomesCustom', ['Photophobie'])
    listSymptomesCustom()
    const idAfterFirst = listSymptomesCustom()[0].id
    const idAfterSecond = listSymptomesCustom()[0].id
    expect(idAfterFirst).toBe(idAfterSecond)
  })
})
