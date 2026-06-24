import { describe, it, expect, beforeEach } from 'vitest'
import { emptyDraft, loadDraft, saveDraft, clearDraft } from './draft'

beforeEach(() => localStorage.clear())

describe('draft persistence', () => {
  it('loadDraft returns emptyDraft shape when nothing saved', () => {
    const loaded = loadDraft()
    expect(loaded.intensite).toBe(emptyDraft().intensite)
    expect(loaded.medocs).toEqual([])
  })

  it('saveDraft then loadDraft round-trips', () => {
    const d = emptyDraft()
    d.intensite = 7
    saveDraft(d)
    expect(loadDraft().intensite).toBe(7)
  })

  it('clearDraft resets to emptyDraft', () => {
    const d = emptyDraft()
    d.intensite = 7
    saveDraft(d)
    clearDraft()
    expect(loadDraft().intensite).toBe(emptyDraft().intensite)
  })
})
