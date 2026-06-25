import { defineStore } from 'pinia'
import { ref } from 'vue'
import { newId } from '../utils/uuid'

export interface Toast {
  id: string
  message: string
  type: 'success' | 'pending'
  persistent: boolean
  action?: { label: string; handler: () => void }
}

export const useToastStore = defineStore('toast', () => {
  const toasts = ref<Toast[]>([])

  function add(opts: Omit<Toast, 'id'>): string {
    const id = newId()
    toasts.value.push({ ...opts, id })
    if (!opts.persistent) {
      setTimeout(() => remove(id), 3000)
    }
    return id
  }

  function remove(id: string): void {
    toasts.value = toasts.value.filter((t) => t.id !== id)
  }

  return { toasts, add, remove }
})
