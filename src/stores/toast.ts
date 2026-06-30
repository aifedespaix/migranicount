import { defineStore } from 'pinia'
import { ref } from 'vue'
import { newId } from '../utils/uuid'

export type ToastType = 'success' | 'danger' | 'info' | 'pending'

export interface Toast {
  id: string
  message: string
  type: ToastType
  duration: number   // 0 = persistent
  action?: { label: string; handler: () => void }
}

const DEFAULT_DURATION: Record<ToastType, number> = {
  success: 3500,
  info: 4000,
  danger: 8000,
  pending: 0,
}

export const useToastStore = defineStore('toast', () => {
  const toasts = ref<Toast[]>([])

  function add(opts: {
    message: string
    type: ToastType
    duration?: number
    persistent?: boolean
    action?: { label: string; handler: () => void }
  }): string {
    const id = newId()
    const duration = opts.persistent ? 0 : (opts.duration ?? DEFAULT_DURATION[opts.type])
    toasts.value.push({ id, message: opts.message, type: opts.type, duration, action: opts.action })
    return id
  }

  function remove(id: string): void {
    toasts.value = toasts.value.filter((t) => t.id !== id)
  }

  return { toasts, add, remove }
})
