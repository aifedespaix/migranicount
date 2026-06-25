import { defineStore } from 'pinia'
import { ref, computed, watchEffect } from 'vue'
import { getJSON, setJSON } from '../storage/storage'

export type ThemeChoice = 'light' | 'dark' | 'auto' | 'migraine'
export type FontChoice = 'none' | 'lexend'

interface SettingsState {
  theme: ThemeChoice
  dyslexicFont: FontChoice
}

const STORAGE_KEY = 'settings'
const DEFAULTS: SettingsState = { theme: 'auto', dyslexicFont: 'none' }

export const useSettingsStore = defineStore('settings', () => {
  const initial = getJSON<SettingsState>(STORAGE_KEY, DEFAULTS)
  if ((initial.dyslexicFont as string) === 'opendyslexic') initial.dyslexicFont = 'none'
  const theme = ref<ThemeChoice>(initial.theme)
  const dyslexicFont = ref<FontChoice>(initial.dyslexicFont)

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
    setJSON(STORAGE_KEY, { theme: theme.value, dyslexicFont: dyslexicFont.value })
  }

  function setTheme(t: ThemeChoice): void {
    theme.value = t
    persist()
  }

  function setDyslexicFont(f: FontChoice): void {
    dyslexicFont.value = f
    persist()
  }

  return { theme, dyslexicFont, resolvedTheme, setTheme, setDyslexicFont }
})
