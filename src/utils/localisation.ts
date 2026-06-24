import type { Migraine } from '../types/migraine'

export const LOCALISATION_LABELS: Record<NonNullable<Migraine['localisation']>, string> = {
  gauche: 'Gauche',
  droite: 'Droite',
  bilaterale: 'Bilatérale',
  nuque: 'Nuque',
}

export function localisationLabel(loc: Migraine['localisation']): string | null {
  return loc ? LOCALISATION_LABELS[loc] : null
}
