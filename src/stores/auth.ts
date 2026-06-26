import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { pb } from '../lib/pocketbase'
import { clearPrefsCache } from '../lib/pbSync'
import type { RecordModel } from 'pocketbase'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<RecordModel | null>(pb.authStore.record)
  const isLoggedIn = computed(() => pb.authStore.isValid)

  pb.authStore.onChange((_token, record) => {
    user.value = record as RecordModel | null
  })

  async function login(): Promise<void> {
    await pb.collection('users').authWithOAuth2({ provider: 'google' })
  }

  function logout(): void {
    clearPrefsCache()
    pb.authStore.clear()
  }

  return { user, isLoggedIn, login, logout }
})
