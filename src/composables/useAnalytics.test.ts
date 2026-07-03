import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { effectScope } from 'vue'
import { useSettingsStore } from '../stores/settings'
import { useAnalytics } from './useAnalytics'

const SCRIPT_ID = 'umami-analytics'

beforeEach(() => {
  localStorage.clear()
  document.getElementById(SCRIPT_ID)?.remove()
  setActivePinia(createPinia())
})

describe('useAnalytics', () => {
  it('injects the script immediately when analyticsEnabled is true', () => {
    const scope = effectScope()
    scope.run(() => useAnalytics())
    expect(document.getElementById(SCRIPT_ID)).not.toBeNull()
    scope.stop()
  })

  it('does not inject the script when analyticsEnabled is false', () => {
    localStorage.setItem('migracount:settings', JSON.stringify({ theme: 'auto', dyslexicFont: 'none', analyticsEnabled: false }))
    setActivePinia(createPinia())
    const scope = effectScope()
    scope.run(() => useAnalytics())
    expect(document.getElementById(SCRIPT_ID)).toBeNull()
    scope.stop()
  })

  it('removes the script reactively when the setting is toggled off', () => {
    const scope = effectScope()
    const settings = scope.run(() => {
      useAnalytics()
      return useSettingsStore()
    })!
    expect(document.getElementById(SCRIPT_ID)).not.toBeNull()
    settings.setAnalyticsEnabled(false)
    expect(document.getElementById(SCRIPT_ID)).toBeNull()
    scope.stop()
  })
})
