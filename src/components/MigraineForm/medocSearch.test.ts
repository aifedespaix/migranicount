import { describe, it, expect } from 'vitest'
import { quickPickMedocs, searchMedocs } from './medocSearch'
import type { MedocFavori } from '../../types/migraine'
import type { DefaultMedication } from '../../data/defaultMedications'

const favoris: MedocFavori[] = [
  { id: '1', nom: 'Paracétamol', usageCount: 2 },
  { id: '2', nom: 'Ibuprofène', usageCount: 5 },
  { id: '3', nom: 'Propranolol', usageCount: 9, isLongTermTreatment: true },
  { id: '4', nom: 'Aspirine', usageCount: 2 },
]
const med = (nom: string): DefaultMedication => ({
  nom, description: '', sideEffects: '', expectedEffects: '', isLongTermTreatment: false,
})
const catalogue = [med('Ibuprofène'), med('Sumatriptan (Imigrane)'), med('Kétoprofène')]

describe('quickPickMedocs', () => {
  it('exclut les traitements de fond et trie par usage puis par nom', () => {
    expect(quickPickMedocs(favoris).map((f) => f.nom)).toEqual(['Ibuprofène', 'Aspirine', 'Paracétamol'])
  })
})

describe('searchMedocs', () => {
  it('ne renvoie rien pour une recherche vide', () => {
    expect(searchMedocs('  ', favoris, catalogue)).toEqual({ favoris: [], catalogue: [], canCreate: false })
  })
  it('ignore la casse et les accents, sans doublon entre répertoire et catalogue', () => {
    const r = searchMedocs('profene', favoris, catalogue)
    expect(r.favoris.map((f) => f.nom)).toEqual(['Ibuprofène'])
    expect(r.catalogue.map((m) => m.nom)).toEqual(['Kétoprofène'])
    expect(r.canCreate).toBe(true)
  })
  it('trouve aussi les traitements de fond', () => {
    expect(searchMedocs('propra', favoris, catalogue).favoris.map((f) => f.nom)).toEqual(['Propranolol'])
  })
  it('ne propose pas de créer un médicament qui existe déjà', () => {
    expect(searchMedocs('paracetamol', favoris, catalogue).canCreate).toBe(false)
    expect(searchMedocs('kétoprofène', favoris, catalogue).canCreate).toBe(false)
  })
})
