import type { CatalogTag } from '../types/migraine'

export const DEFAULT_SYMPTOMES: CatalogTag[] = [
  { id: 'default-nausee', nom: 'Nausée' },
  { id: 'default-vomissement', nom: 'Vomissement' },
  { id: 'default-aura', nom: 'Aura visuelle' },
]

export const DEFAULT_DECLENCHEURS: CatalogTag[] = [
  { id: 'default-stress', nom: 'Stress' },
  { id: 'default-sommeil', nom: 'Manque de sommeil' },
  { id: 'default-regles', nom: 'Règles' },
  { id: 'default-alcool', nom: 'Alcool' },
  { id: 'default-ecrans', nom: 'Écrans' },
  { id: 'default-meteo', nom: 'Météo' },
  { id: 'default-alimentation', nom: 'Alimentation' },
  { id: 'default-deshydratation', nom: 'Déshydratation' },
  { id: 'default-effort', nom: 'Effort physique' },
  { id: 'default-odeurs', nom: 'Odeurs fortes' },
]
