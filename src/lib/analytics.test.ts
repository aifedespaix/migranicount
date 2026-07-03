import { describe, it, expect, beforeEach } from 'vitest'
import { enableAnalytics, disableAnalytics } from './analytics'

const SCRIPT_ID = 'umami-analytics'

beforeEach(() => {
  document.getElementById(SCRIPT_ID)?.remove()
})

describe('analytics', () => {
  it('enableAnalytics injects the Umami script tag with the expected attributes', () => {
    enableAnalytics()
    const el = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null
    expect(el).not.toBeNull()
    expect(el!.src).toBe('https://analytics.aifedespaix.com/script.js')
    expect(el!.defer).toBe(true)
    expect(el!.dataset.websiteId).toBe('f547cada-5c09-478b-9f5a-4df4befe7e48')
    expect(el!.dataset.domains).toBe('migracount.aifedespaix.com')
    expect(el!.dataset.doNotTrack).toBe('true')
    expect(el!.dataset.excludeSearch).toBe('true')
  })

  it('enableAnalytics is idempotent (does not add a second tag)', () => {
    enableAnalytics()
    enableAnalytics()
    expect(document.querySelectorAll(`#${SCRIPT_ID}`).length).toBe(1)
  })

  it('disableAnalytics removes the tag if present', () => {
    enableAnalytics()
    disableAnalytics()
    expect(document.getElementById(SCRIPT_ID)).toBeNull()
  })

  it('disableAnalytics is a no-op if the tag is absent', () => {
    expect(() => disableAnalytics()).not.toThrow()
    expect(document.getElementById(SCRIPT_ID)).toBeNull()
  })
})
