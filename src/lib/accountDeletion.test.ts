import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { deleteAccount } from './accountDeletion'

const {
  mockStopRealtimeSync,
  mockLogout,
  mockGetFullList,
  mockDeleteData,
  mockDeleteUser,
  mockCollection,
} = vi.hoisted(() => {
  const mockStopRealtimeSync = vi.fn()
  const mockLogout = vi.fn()
  const mockGetFullList = vi.fn()
  const mockDeleteData = vi.fn()
  const mockDeleteUser = vi.fn()
  const mockCollection = vi.fn((name: string) => ({
    getFullList: mockGetFullList,
    delete: name === 'users' ? mockDeleteUser : mockDeleteData,
  }))
  return { mockStopRealtimeSync, mockLogout, mockGetFullList, mockDeleteData, mockDeleteUser, mockCollection }
})

vi.mock('./pocketbase', () => ({
  pb: {
    authStore: { record: { id: 'user-123' } },
    collection: mockCollection,
  },
}))

vi.mock('../composables/useSync', () => ({
  useSync: () => ({ stopRealtimeSync: mockStopRealtimeSync }),
}))

vi.mock('../stores/auth', () => ({
  useAuthStore: () => ({ logout: mockLogout }),
}))

beforeEach(() => {
  vi.clearAllMocks()
  setActivePinia(createPinia())
  mockGetFullList.mockResolvedValue([{ id: 'rec-1' }, { id: 'rec-2' }])
  mockDeleteData.mockResolvedValue(undefined)
  mockDeleteUser.mockResolvedValue(undefined)
})

describe('deleteAccount', () => {
  it('deletes all collection records then the user record then cleans up', async () => {
    localStorage.setItem('migracount:prefs', 'some-value')
    localStorage.setItem('other:key', 'keep-me')

    await deleteAccount()

    expect(mockCollection).toHaveBeenCalledWith('migraines')
    expect(mockCollection).toHaveBeenCalledWith('medocs_favoris')
    expect(mockCollection).toHaveBeenCalledWith('user_preferences')
    expect(mockDeleteData).toHaveBeenCalledTimes(6) // 2 records × 3 collections
    expect(mockGetFullList).toHaveBeenCalledWith({ filter: 'userId="user-123"' })
    expect(mockDeleteUser).toHaveBeenCalledWith('user-123')
    expect(mockStopRealtimeSync).toHaveBeenCalledOnce()
    expect(mockLogout).toHaveBeenCalledOnce()
    expect(localStorage.getItem('migracount:prefs')).toBeNull()
    expect(localStorage.getItem('other:key')).toBe('keep-me')
  })

  it('propagates error and skips user delete and cleanup when step 1 fails', async () => {
    mockGetFullList.mockRejectedValueOnce(new Error('network error'))

    await expect(deleteAccount()).rejects.toThrow('network error')

    expect(mockDeleteUser).not.toHaveBeenCalled()
    expect(mockStopRealtimeSync).not.toHaveBeenCalled()
    expect(mockLogout).not.toHaveBeenCalled()
  })

  it('throws DATA_CLEARED_BUT_ACCOUNT_REMAINS when user record deletion fails after data is cleared', async () => {
    mockDeleteUser.mockRejectedValueOnce(new Error('forbidden'))

    await expect(deleteAccount()).rejects.toThrow('DATA_CLEARED_BUT_ACCOUNT_REMAINS')

    expect(mockStopRealtimeSync).not.toHaveBeenCalled()
    expect(mockLogout).not.toHaveBeenCalled()
  })

  it('removes only migracount: prefixed keys from localStorage', async () => {
    localStorage.setItem('migracount:prefs', 'value-a')
    localStorage.setItem('other:key', 'value-b')
    localStorage.setItem('migracount:settings', 'value-c')

    await deleteAccount()

    expect(localStorage.getItem('migracount:prefs')).toBeNull()
    expect(localStorage.getItem('migracount:settings')).toBeNull()
    expect(localStorage.getItem('other:key')).toBe('value-b')
  })
})
