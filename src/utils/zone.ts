import type { Migraine } from '../types/migraine'

export const ZONE_LABELS: Record<NonNullable<Migraine['zone']>, string> = {
  gauche: 'Gauche',
  droite: 'Droite',
  bilaterale: 'Bilatérale',
  nuque: 'Nuque',
}

export function zoneLabel(zone: Migraine['zone']): string | null {
  return zone ? ZONE_LABELS[zone] : null
}
