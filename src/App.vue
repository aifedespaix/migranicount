<template>
  <HeaderNav @add="openForm" />
  <main class="app-main" ref="mainRef">
    <RouterView v-slot="{ Component }">
      <Transition :name="pageTransition">
        <component :is="Component" :key="$route.name" />
      </Transition>
    </RouterView>
  </main>
  <BottomNav @add="openForm" />
  <MigraineFormModal v-if="formOpen" @close="onFormClose" @saved="onFormSaved" />
  <ToastContainer />
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useSwipe } from '@vueuse/core'
import HeaderNav from './components/HeaderNav.vue'
import BottomNav from './components/BottomNav.vue'
import MigraineFormModal from './components/MigraineForm/MigraineFormModal.vue'
import ToastContainer from './components/ToastContainer.vue'
import { useSettingsStore } from './stores/settings'
import { useToastStore } from './stores/toast'

useSettingsStore()

const router = useRouter()
const toastStore = useToastStore()
const formOpen = ref(false)
const pendingDraftToastId = ref<string | null>(null)
const mainRef = ref<HTMLElement | null>(null)
const pageTransition = ref<'slide-next' | 'slide-prev'>('slide-next')

const routeOrder: Record<string, number> = { stats: 0, liste: 1 }

function openForm() {
  if (pendingDraftToastId.value) {
    toastStore.remove(pendingDraftToastId.value)
    pendingDraftToastId.value = null
  }
  formOpen.value = true
}

function onFormSaved() {
  if (pendingDraftToastId.value) {
    toastStore.remove(pendingDraftToastId.value)
    pendingDraftToastId.value = null
  }
  toastStore.add({ message: 'Migraine enregistrée !', type: 'success', persistent: false })
  formOpen.value = false
}

function onFormClose() {
  formOpen.value = false
  if (pendingDraftToastId.value) {
    toastStore.remove(pendingDraftToastId.value)
  }
  pendingDraftToastId.value = toastStore.add({
    message: 'Brouillon en attente',
    type: 'pending',
    persistent: true,
    action: { label: 'Reprendre', handler: openForm },
  })
}

useSwipe(mainRef, {
  onSwipeEnd(_event, direction) {
    const currentOrder = routeOrder[router.currentRoute.value.name as string]
    if (currentOrder === undefined) return
    if (direction === 'left' && currentOrder < 1) {
      pageTransition.value = 'slide-next'
      router.push({ name: 'liste' })
    } else if (direction === 'right' && currentOrder > 0) {
      pageTransition.value = 'slide-prev'
      router.push({ name: 'stats' })
    }
  },
})
</script>

<style scoped>
.app-main {
  margin-top: 3.5rem;
  height: calc(100dvh - 3.5rem);
  overflow: hidden;
  position: relative;
}
@media (max-width: 1023px) {
  .app-main {
    height: calc(100dvh - 3.5rem - 3.5rem);
  }
}
</style>

<style>
.slide-next-enter-active,
.slide-next-leave-active,
.slide-prev-enter-active,
.slide-prev-leave-active {
  transition: transform 0.28s ease, opacity 0.28s ease;
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}
.slide-next-enter-from {
  transform: translateX(100%);
  opacity: 0;
}
.slide-next-leave-to {
  transform: translateX(-100%);
  opacity: 0;
}
.slide-prev-enter-from {
  transform: translateX(-100%);
  opacity: 0;
}
.slide-prev-leave-to {
  transform: translateX(100%);
  opacity: 0;
}
</style>
