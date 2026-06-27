import { pb } from './pocketbase'
import { useSync } from '../composables/useSync'
import { useAuthStore } from '../stores/auth'

export async function deleteAccount(): Promise<void> {
  const userId = pb.authStore.record!.id

  const collections = ['migraines', 'medocs_favoris', 'user_preferences'] as const
  for (const col of collections) {
    const records = await pb.collection(col).getFullList({ filter: `userId="${userId}"` })
    for (const record of records) {
      await pb.collection(col).delete(record.id)
    }
  }

  try {
    await pb.collection('users').delete(userId)
  } catch {
    throw new Error('DATA_CLEARED_BUT_ACCOUNT_REMAINS')
  }

  useSync().stopRealtimeSync()
  useAuthStore().logout()
  for (const key of Object.keys(localStorage)) {
    if (key.startsWith('migracount:')) localStorage.removeItem(key)
  }
}
