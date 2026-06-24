import { describe, it, expect } from 'vitest'
import { LOCALISATION_LABELS, localisationLabel } from './localisation'

describe('localisationLabel', () => {
  it('returns the French label for a known localisation', () => {
    expect(localisationLabel('bilaterale')).toBe('Bilatérale')
    expect(localisationLabel('gauche')).toBe('Gauche')
    expect(localisationLabel('droite')).toBe('Droite')
    expect(localisationLabel('nuque')).toBe('Nuque')
  })

  it('returns null for null', () => {
    expect(localisationLabel(null)).toBeNull()
  })

  it('LOCALISATION_LABELS covers all four values', () => {
    expect(Object.keys(LOCALISATION_LABELS).sort()).toEqual(['bilaterale', 'droite', 'gauche', 'nuque'])
  })
})
