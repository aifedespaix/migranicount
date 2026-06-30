import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useToastStore } from './toast'

beforeEach(() => {
  setActivePinia(createPinia())
})

describe('useToastStore', () => {
  it('starts empty', () => {
    const store = useToastStore()
    expect(store.toasts).toEqual([])
  })

  it('add returns an id and the toast is visible', () => {
    const store = useToastStore()
    const id = store.add({ message: 'OK', type: 'success' })
    expect(typeof id).toBe('string')
    expect(store.toasts).toHaveLength(1)
    expect(store.toasts[0].message).toBe('OK')
  })

  it('success toast gets default duration 3500ms', () => {
    const store = useToastStore()
    store.add({ message: 'OK', type: 'success' })
    expect(store.toasts[0].duration).toBe(3500)
  })

  it('info toast gets default duration 4000ms', () => {
    const store = useToastStore()
    store.add({ message: 'Info', type: 'info' })
    expect(store.toasts[0].duration).toBe(4000)
  })

  it('danger toast gets default duration 8000ms', () => {
    const store = useToastStore()
    store.add({ message: 'Error', type: 'danger' })
    expect(store.toasts[0].duration).toBe(8000)
  })

  it('pending toast gets duration 0 (persistent)', () => {
    const store = useToastStore()
    store.add({ message: 'Brouillon', type: 'pending' })
    expect(store.toasts[0].duration).toBe(0)
  })

  it('persistent:true overrides duration to 0', () => {
    const store = useToastStore()
    store.add({ message: 'OK', type: 'success', persistent: true })
    expect(store.toasts[0].duration).toBe(0)
  })

  it('custom duration is respected', () => {
    const store = useToastStore()
    store.add({ message: 'OK', type: 'success', duration: 5000 })
    expect(store.toasts[0].duration).toBe(5000)
  })

  it('remove deletes the toast by id', () => {
    const store = useToastStore()
    const id = store.add({ message: 'OK', type: 'success' })
    store.remove(id)
    expect(store.toasts).toHaveLength(0)
  })

  it('remove a non-existent id is a no-op', () => {
    const store = useToastStore()
    expect(() => store.remove('unknown-id')).not.toThrow()
  })
})
