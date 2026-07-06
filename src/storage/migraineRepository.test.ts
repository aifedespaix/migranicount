import { describe, it, expect, beforeEach } from 'vitest'
import {
  listMigraines, saveMigraine, deleteMigraine, getMigraine, restoreMigraine,
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

  it('restoreMigraine re-inserts with the same id and clears a matching tombstone', () => {
    const m = saveMigraine({
      date: '2026-06-24', heureDebut: '08:00', heureFin: null,
      medocs: [], intensite: 5, avortee: false, symptomes: [],
      zone: null, declencheurs: [],
    })
    deleteMigraine(m.id)
    expect(listTombstones()).toHaveLength(1)

    const restored = restoreMigraine(m)
    expect(restored.id).toBe(m.id)
    expect(listMigraines()).toHaveLength(1)
    expect(getMigraine(m.id)).toBeTruthy()
    expect(listTombstones()).toHaveLength(0)
  })
})

describe('migration réparation doublons + entrées invalides (schema v5)', () => {
  function seedV4(data: {
    symptomes?: unknown[]
    declencheurs?: unknown[]
    medocs?: unknown[]
    migraines?: unknown[]
  }) {
    setJSON('schemaVersion', 4)
    setJSON('symptomesCustom', data.symptomes ?? [])
    setJSON('declencheursFavoris', data.declencheurs ?? [])
    setJSON('medocsFavoris', data.medocs ?? [])
    setJSON('migraines', data.migraines ?? [])
  }

  it('supprime les entrées invalides (strings, objets sans nom) laissées par un merge sync', () => {
    seedV4({
      symptomes: ['Photophobie', { id: 's1', nom: 'Osmophobie' }, {}, { id: 's2', nom: '' }],
    })
    const sympt = listSymptomesCustom()
    expect(sympt.every((s) => typeof s.id === 'string' && s.id && typeof s.nom === 'string' && s.nom)).toBe(true)
    expect(sympt.map((s) => s.nom).sort()).toEqual(['Osmophobie', 'Photophobie'])
  })

  it('dédoublonne les symptômes par nom, garde le premier id, tombstone les ids abandonnés', () => {
    seedV4({
      symptomes: [
        { id: 's1', nom: 'Photophobie' },
        { id: 's2', nom: 'photophobie' },
      ],
    })
    const sympt = listSymptomesCustom()
    expect(sympt).toEqual([{ id: 's1', nom: 'Photophobie' }])
    expect(listTombstones()).toContainEqual(
      expect.objectContaining({ entityType: 'symptome', entityId: 's2' }),
    )
  })

  it('supprime un custom qui duplique un symptôme par défaut, sans tombstoner l\'id par défaut', () => {
    seedV4({ symptomes: [{ id: 's1', nom: 'Nausée' }] })
    expect(listSymptomesCustom()).toEqual([])
    expect(listTombstones()).toContainEqual(
      expect.objectContaining({ entityType: 'symptome', entityId: 's1' }),
    )
    expect(listTombstones().some((t) => t.entityId.startsWith('default-'))).toBe(false)
  })

  it('dédoublonne les déclencheurs par nom et tombstone les ids abandonnés', () => {
    seedV4({
      declencheurs: [
        { id: 'd1', nom: 'Chocolat' },
        { id: 'd2', nom: 'chocolat' },
      ],
    })
    expect(listDeclencheursFavoris()).toEqual([{ id: 'd1', nom: 'Chocolat' }])
    expect(listTombstones()).toContainEqual(
      expect.objectContaining({ entityType: 'declencheur', entityId: 'd2' }),
    )
  })

  it('fusionne les médocs dupliqués en gardant le maximum de données', () => {
    seedV4({
      medocs: [
        { id: 'm1', nom: 'Doliprane', usageCount: 2, description: '' },
        {
          id: 'm2', nom: 'doliprane', usageCount: 5, description: 'antidouleur',
          posologieParJour: 3, intervalleHeures: 6, isLongTermTreatment: true,
          sideEffects: 'somnolence',
          treatmentPeriods: [{ id: 'p1', startDate: '2026-01-01', endDate: null, updatedAt: '2026-01-01T00:00:00Z' }],
        },
      ],
    })
    const medocs = listMedocsFavoris()
    expect(medocs).toHaveLength(1)
    expect(medocs[0]).toMatchObject({
      id: 'm1',
      nom: 'Doliprane',
      usageCount: 5,
      description: 'antidouleur',
      posologieParJour: 3,
      intervalleHeures: 6,
      isLongTermTreatment: true,
      sideEffects: 'somnolence',
    })
    expect(medocs[0].treatmentPeriods).toEqual([
      { id: 'p1', startDate: '2026-01-01', endDate: null, updatedAt: '2026-01-01T00:00:00Z' },
    ])
    expect(listTombstones()).toContainEqual(
      expect.objectContaining({ entityType: 'medoc', entityId: 'm2' }),
    )
  })

  it('remap les références historiques des migraines vers les ids conservés', () => {
    seedV4({
      symptomes: [
        { id: 's1', nom: 'Photophobie' },
        { id: 's2', nom: 'Photophobie' },
      ],
      declencheurs: [
        { id: 'd1', nom: 'Chocolat' },
        { id: 'd2', nom: 'Chocolat' },
      ],
      medocs: [
        { id: 'm1', nom: 'Doliprane', usageCount: 1 },
        { id: 'm2', nom: 'Doliprane', usageCount: 1 },
      ],
      migraines: [
        {
          id: 'mig1', date: '2026-01-01', heureDebut: '08:00', heureFin: null,
          medocs: [{ id: 'p1', medocId: 'm2', nom: 'Doliprane', heure: '08:00' }],
          intensite: 5, avortee: false,
          symptomes: [{ id: 's2', nom: 'Photophobie' }, { id: 'default-nausee', nom: 'Nausée' }],
          zone: null,
          declencheurs: [{ id: 'd2', nom: 'Chocolat' }],
          createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z',
        },
      ],
    })
    const migraine = listMigraines()[0]
    expect(migraine.symptomes).toEqual([
      { id: 's1', nom: 'Photophobie' },
      { id: 'default-nausee', nom: 'Nausée' },
    ])
    expect(migraine.declencheurs).toEqual([{ id: 'd1', nom: 'Chocolat' }])
    expect(migraine.medocs[0].medocId).toBe('m1')
  })

  it('dédoublonne les références au sein d\'une même migraine après remap', () => {
    seedV4({
      symptomes: [
        { id: 's1', nom: 'Photophobie' },
        { id: 's2', nom: 'Photophobie' },
      ],
      migraines: [
        {
          id: 'mig1', date: '2026-01-01', heureDebut: '08:00', heureFin: null,
          medocs: [], intensite: 5, avortee: false,
          symptomes: [{ id: 's1', nom: 'Photophobie' }, { id: 's2', nom: 'Photophobie' }],
          zone: null, declencheurs: [],
          createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z',
        },
      ],
    })
    expect(listMigraines()[0].symptomes).toEqual([{ id: 's1', nom: 'Photophobie' }])
  })

  it('est idempotente (une seconde exécution ne change rien et ne tombstone rien de plus)', () => {
    seedV4({
      symptomes: [
        { id: 's1', nom: 'Photophobie' },
        { id: 's2', nom: 'Photophobie' },
      ],
    })
    listSymptomesCustom()
    const symptAfterFirst = JSON.stringify(listSymptomesCustom())
    const tombstonesAfterFirst = listTombstones().length
    setJSON('schemaVersion', 4)
    listSymptomesCustom()
    expect(JSON.stringify(listSymptomesCustom())).toBe(symptAfterFirst)
    expect(listTombstones().length).toBe(tombstonesAfterFirst)
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
