import { describe, it, expect } from 'vitest'
import { intensityColor, intensityLabel } from './intensity'

describe('intensityColor', () => {
  it('returns a warm hue at low intensity', () => {
    expect(intensityColor(0)).toBe('hsl(50, 80%, 50%)')
  })

  it('returns a red hue at max intensity', () => {
    expect(intensityColor(10)).toBe('hsl(0, 80%, 50%)')
  })
})

describe('intensityLabel', () => {
  it('labels 1-3 as Légère', () => {
    expect(intensityLabel(1)).toBe('Légère')
    expect(intensityLabel(3)).toBe('Légère')
  })

  it('labels 4-6 as Modérée', () => {
    expect(intensityLabel(4)).toBe('Modérée')
    expect(intensityLabel(6)).toBe('Modérée')
  })

  it('labels 7-8 as Forte', () => {
    expect(intensityLabel(7)).toBe('Forte')
    expect(intensityLabel(8)).toBe('Forte')
  })

  it('labels 9-10 as Sévère', () => {
    expect(intensityLabel(9)).toBe('Sévère')
    expect(intensityLabel(10)).toBe('Sévère')
  })
})
