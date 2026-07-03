import { defineStore } from 'pinia'
import { ref, computed, watchEffect } from 'vue'
import { getJSON, setJSON } from '../storage/storage'
import { pb } from '../lib/pocketbase'
import { enqueue } from '../lib/syncOutbox'

export type ThemeChoice = 'light' | 'dark' | 'auto' | 'migraine'
export type FontChoice = 'none' | 'lexend'

interface SettingsState {
  theme: ThemeChoice
  dyslexicFont: FontChoice
  analyticsEnabled: boolean
}

const STORAGE_KEY = 'settings'
const DEFAULTS: SettingsState = { theme: 'auto', dyslexicFont: 'none', analyticsEnabled: true }

export const useSettingsStore = defineStore('settings', () => {
  const initial = getJSON<SettingsState>(STORAGE_KEY, DEFAULTS)
  if ((initial.dyslexicFont as string) === 'opendyslexic') initial.dyslexicFont = 'none'
  const theme = ref<ThemeChoice>(initial.theme)
  const dyslexicFont = ref<FontChoice>(initial.dyslexicFont)
  const analyticsEnabled = ref<boolean>(initial.analyticsEnabled ?? true)

  const systemPrefersDark = ref(
    typeof window !== 'undefined' && window.matchMedia
      ? window.matchMedia('(prefers-color-scheme: dark)').matches
      : false
  )

  if (typeof window !== 'undefined' && window.matchMedia) {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    mediaQuery.addEventListener('change', (e) => {
      systemPrefersDark.value = e.matches
    })
  }

  const resolvedTheme = computed<'light' | 'dark' | 'migraine'>(() =>
    theme.value === 'auto' ? (systemPrefersDark.value ? 'dark' : 'light') : theme.value
  )

  watchEffect(
    () => {
      if (typeof document === 'undefined') return
      document.documentElement.setAttribute('data-theme', resolvedTheme.value)
      if (dyslexicFont.value === 'none') {
        document.documentElement.removeAttribute('data-font')
      } else {
        document.documentElement.setAttribute('data-font', dyslexicFont.value)
      }
    },
    { flush: 'sync' }
  )

  function persist(): void {
    setJSON(STORAGE_KEY, { theme: theme.value, dyslexicFont: dyslexicFont.value, analyticsEnabled: analyticsEnabled.value })
  }

  function setTheme(t: ThemeChoice): void {
    theme.value = t
    persist()
    if (pb.authStore.isValid) {
      enqueue({ type: 'preferences-patch', patch: { theme: t } })
    }
  }

  function setDyslexicFont(f: FontChoice): void {
    dyslexicFont.value = f
    persist()
    if (pb.authStore.isValid) {
      enqueue({ type: 'preferences-patch', patch: { dyslexicFont: f } })
    }
  }

  function setAnalyticsEnabled(v: boolean): void {
    analyticsEnabled.value = v
    persist()
  }

  function applyFromSync(t: ThemeChoice, f: FontChoice): void {
    theme.value = t
    dyslexicFont.value = f
    persist()
  }

  return { theme, dyslexicFont, analyticsEnabled, resolvedTheme, setTheme, setDyslexicFont, setAnalyticsEnabled, applyFromSync }
})
