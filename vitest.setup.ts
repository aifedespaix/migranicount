import { beforeEach } from 'vitest'

// Mock localStorage for testing
const localStorageMock = (() => {
  let store: Record<string, string> = {}

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString()
    },
    removeItem: (key: string) => {
      delete store[key]
    },
    clear: () => {
      store = {}
    },
    get length(): number {
      return Object.keys(store).length
    },
    key: (index: number) => {
      const keys = Object.keys(store)
      return keys[index] || null
    }
  }
})()

// Assign to global scope
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
})

// Clear localStorage before each test
beforeEach(() => {
  localStorage.clear()
})
