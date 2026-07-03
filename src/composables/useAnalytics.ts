import { watchEffect } from 'vue'
import { useSettingsStore } from '../stores/settings'
import { enableAnalytics, disableAnalytics } from '../lib/analytics'

export function useAnalytics(): void {
  const settings = useSettingsStore()

  watchEffect(
    () => {
      if (settings.analyticsEnabled) {
        enableAnalytics()
      } else {
        disableAnalytics()
      }
    },
    { flush: 'sync' }
  )
}
