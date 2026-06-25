import { describe, it, expect, beforeEach } from 'vitest'
import { emptyDraft, loadDraft, saveDraft, clearDraft, canSaveDraft, hasSavedDraft, saveDraftStep, loadDraftStep } from './draft'

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

describe('canSaveDraft', () => {
  it('returns true when date and heureDebut are both set', () => {
    expect(canSaveDraft(emptyDraft())).toBe(true)
  })

  it('returns false when date is empty', () => {
    expect(canSaveDraft({ ...emptyDraft(), date: '' })).toBe(false)
  })

  it('returns false when heureDebut is empty', () => {
    expect(canSaveDraft({ ...emptyDraft(), heureDebut: '' })).toBe(false)
  })

  it('returns false when both date and heureDebut are empty', () => {
    expect(canSaveDraft({ ...emptyDraft(), date: '', heureDebut: '' })).toBe(false)
  })
})

describe('hasSavedDraft', () => {
  it('returns false when no draft saved', () => {
    expect(hasSavedDraft()).toBe(false)
  })

  it('returns true after saveDraft', () => {
    saveDraft(emptyDraft())
    expect(hasSavedDraft()).toBe(true)
  })

  it('returns false after clearDraft', () => {
    saveDraft(emptyDraft())
    clearDraft()
    expect(hasSavedDraft()).toBe(false)
  })
})

describe('saveDraftStep / loadDraftStep', () => {
  it('loadDraftStep returns 0 when nothing saved', () => {
    expect(loadDraftStep()).toBe(0)
  })

  it('saveDraftStep then loadDraftStep round-trips when draft exists', () => {
    saveDraft(emptyDraft())
    saveDraftStep(4)
    expect(loadDraftStep()).toBe(4)
  })

  it('loadDraftStep returns 0 when step is stored but no draft exists', () => {
    saveDraftStep(4)
    expect(loadDraftStep()).toBe(0)
  })

  it('clearDraft also resets step to 0', () => {
    saveDraftStep(4)
    clearDraft()
    expect(loadDraftStep()).toBe(0)
  })
})
