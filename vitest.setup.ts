import { beforeEach } from 'vitest'

// Mock localStorage for testing with Object.keys() support
// The Proxy exposes stored keys as enumerable own properties so that
// Object.keys(localStorage) returns the actual stored keys (not method names).
const store: Record<string, string> = {}

const localStorageMock = new Proxy(store, {
  get(target, prop: string | symbol) {
    if (typeof prop === 'symbol') return undefined
    if (prop === 'getItem') return (key: string) => (key in target ? target[key] : null)
    if (prop === 'setItem') return (key: string, value: string) => { target[key] = String(value) }
    if (prop === 'removeItem') return (key: string) => { delete target[key] }
    if (prop === 'clear') return () => { for (const k of Object.keys(target)) delete target[k] }
    if (prop === 'length') return Object.keys(target).length
    if (prop === 'key') return (i: number) => Object.keys(target)[i] ?? null
    return prop in target ? target[prop] : null
  },
  set(target, prop: string | symbol, value: unknown) {
    if (typeof prop === 'string') target[prop] = String(value)
    return true
  },
  has(target, prop: string | symbol) {
    if (typeof prop === 'symbol') return false
    return prop in target
  },
  ownKeys(target) {
    return Object.keys(target)
  },
  getOwnPropertyDescriptor(target, prop: string | symbol) {
    if (typeof prop === 'string' && prop in target) {
      return { configurable: true, enumerable: true, writable: true, value: target[prop] }
    }
    return undefined
  },
})

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
})

beforeEach(() => {
  localStorage.clear()
})
