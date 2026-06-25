import { describe, it, expect } from 'vitest'
import { capitalizeFirstLetter } from './text'

describe('capitalizeFirstLetter', () => {
  it('capitalizes a lowercase first letter', () => {
    expect(capitalizeFirstLetter('doliprane')).toBe('Doliprane')
  })

  it('capitalizes an accented first letter', () => {
    expect(capitalizeFirstLetter('élézol')).toBe('Élézol')
  })

  it('leaves the rest of the string unchanged', () => {
    expect(capitalizeFirstLetter('ibuprofène 400')).toBe('Ibuprofène 400')
  })

  it('leaves an already-capitalized string unchanged', () => {
    expect(capitalizeFirstLetter('Doliprane')).toBe('Doliprane')
  })

  it('returns an empty string unchanged', () => {
    expect(capitalizeFirstLetter('')).toBe('')
  })
})
