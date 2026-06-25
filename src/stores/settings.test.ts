import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useSettingsStore } from './settings'

function mockMatchMedia(matchesDark: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: matchesDark,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })) as unknown as typeof window.matchMedia
}

beforeEach(() => {
  localStorage.clear()
  mockMatchMedia(false)
  document.documentElement.removeAttribute('data-theme')
  document.documentElement.removeAttribute('data-font')
  setActivePinia(createPinia())
})

describe('useSettingsStore', () => {
  it('defaults to theme "auto" and dyslexicFont "none" when storage is empty', () => {
    const store = useSettingsStore()
    expect(store.theme).toBe('auto')
    expect(store.dyslexicFont).toBe('none')
  })

  it('resolves "auto" to "light" when the OS prefers light', () => {
    mockMatchMedia(false)
    const store = useSettingsStore()
    expect(store.resolvedTheme).toBe('light')
  })

  it('resolves "auto" to "dark" when the OS prefers dark', () => {
    mockMatchMedia(true)
    const store = useSettingsStore()
    expect(store.resolvedTheme).toBe('dark')
  })

  it('resolves "migraine" directly regardless of OS preference', () => {
    mockMatchMedia(true)
    const store = useSettingsStore()
    store.setTheme('migraine')
    expect(store.resolvedTheme).toBe('migraine')
  })

  it('setTheme applies data-theme to the document element', () => {
    const store = useSettingsStore()
    store.setTheme('dark')
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
  })

  it('setDyslexicFont applies data-font to the document element', () => {
    const store = useSettingsStore()
    store.setDyslexicFont('lexend')
    expect(document.documentElement.getAttribute('data-font')).toBe('lexend')
  })

  it('setDyslexicFont("none") removes the data-font attribute', () => {
    const store = useSettingsStore()
    store.setDyslexicFont('lexend')
    store.setDyslexicFont('none')
    expect(document.documentElement.hasAttribute('data-font')).toBe(false)
  })

  it('persists theme and dyslexicFont across store instances', () => {
    const store = useSettingsStore()
    store.setTheme('migraine')
    store.setDyslexicFont('lexend')

    setActivePinia(createPinia())
    const reloaded = useSettingsStore()
    expect(reloaded.theme).toBe('migraine')
    expect(reloaded.dyslexicFont).toBe('lexend')
  })

  it('migrates stored "opendyslexic" to "none" on load', () => {
    localStorage.setItem('settings', JSON.stringify({ theme: 'auto', dyslexicFont: 'opendyslexic' }))
    setActivePinia(createPinia())
    const store = useSettingsStore()
    expect(store.dyslexicFont).toBe('none')
  })
})
