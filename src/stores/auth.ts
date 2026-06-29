import { defineStore } from 'pinia'
import type { RecordModel } from 'pocketbase'
import { computed, ref } from 'vue'
import { clearPrefsCache } from '../lib/pbSync'
import { pb } from '../lib/pocketbase'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<RecordModel | null>(pb.authStore.record)
  const isLoggedIn = computed(() => user.value !== null)

  pb.authStore.onChange((_token, record) => {
    user.value = record as RecordModel | null
  })

  async function login(): Promise<void> {
    try {
      await pb.collection('users').authWithOAuth2({ provider: 'google' });
    } catch (err) {
      console.error("Détails complets de l'erreur :", err);
      if (err.data && err.data.data) {
          console.error("Erreurs de validation de champs :", err.data.data);
      }
    }
  }

  function logout(): void {
    clearPrefsCache()
    pb.authStore.clear()
  }

  return { user, isLoggedIn, login, logout }
})
