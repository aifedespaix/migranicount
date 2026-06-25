import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useToastStore } from './toast'

beforeEach(() => {
  vi.useFakeTimers()
  setActivePinia(createPinia())
})

afterEach(() => {
  vi.useRealTimers()
})

describe('useToastStore', () => {
  it('starts empty', () => {
    const store = useToastStore()
    expect(store.toasts).toEqual([])
  })

  it('add returns an id and the toast is visible', () => {
    const store = useToastStore()
    const id = store.add({ message: 'OK', type: 'success', persistent: false })
    expect(typeof id).toBe('string')
    expect(store.toasts).toHaveLength(1)
    expect(store.toasts[0].message).toBe('OK')
  })

  it('non-persistent toast is removed after 3000ms', () => {
    const store = useToastStore()
    store.add({ message: 'OK', type: 'success', persistent: false })
    expect(store.toasts).toHaveLength(1)
    vi.advanceTimersByTime(3000)
    expect(store.toasts).toHaveLength(0)
  })

  it('persistent toast is not removed automatically', () => {
    const store = useToastStore()
    store.add({ message: 'Brouillon', type: 'pending', persistent: true })
    vi.advanceTimersByTime(10000)
    expect(store.toasts).toHaveLength(1)
  })

  it('remove deletes the toast by id', () => {
    const store = useToastStore()
    const id = store.add({ message: 'OK', type: 'success', persistent: true })
    store.remove(id)
    expect(store.toasts).toHaveLength(0)
  })

  it('remove a non-existent id is a no-op', () => {
    const store = useToastStore()
    expect(() => store.remove('unknown-id')).not.toThrow()
  })
})
