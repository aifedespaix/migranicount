import { computed, onScopeDispose, ref, watch } from 'vue'
import { useSettingsStore } from '../stores/settings'

/**
 * Adds an alpha channel to a CSS color string.
 * Supports hex (#rrggbb) colors; falls back to wrapping with rgba via color-mix
 * for any other valid CSS color value.
 */
export function withAlpha(color: string, alpha: number): string {
  const trimmed = color.trim()
  const hexMatch = /^#([0-9a-fA-F]{6})$/.exec(trimmed)
  if (hexMatch) {
    const r = parseInt(hexMatch[1].slice(0, 2), 16)
    const g = parseInt(hexMatch[1].slice(2, 4), 16)
    const b = parseInt(hexMatch[1].slice(4, 6), 16)
    return `rgba(${r}, ${g}, ${b}, ${alpha})`
  }
  return `color-mix(in srgb, ${trimmed} ${Math.round(alpha * 100)}%, transparent)`
}

function readCssVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim()
}

/**
 * Reactive theme colors sourced from the active theme's CSS custom properties.
 * Re-evaluates whenever the settings store's resolved theme changes (manual
 * switch between light/dark/migraine, or a live OS-level scheme change while
 * the store is set to "auto").
 */
export function useChartThemeColors() {
  const settings = useSettingsStore()
  const themeVersion = ref(0)

  const stopWatch = watch(
    () => settings.resolvedTheme,
    () => {
      themeVersion.value++
    },
    { flush: 'post' }
  )

  onScopeDispose(() => {
    stopWatch()
  })

  const accent = computed(() => {
    void themeVersion.value
    return readCssVar('--color-accent') || '#8b5cf6'
  })

  const text = computed(() => {
    void themeVersion.value
    return readCssVar('--color-text') || '#2a2333'
  })

  const muted = computed(() => {
    void themeVersion.value
    return readCssVar('--color-muted') || '#6b6275'
  })

  return { accent, text, muted }
}
