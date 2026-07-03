<template>
  <HeaderNav @add="openForm" :has-draft="hasDraft" :is-catalog-open="catalogOpen" @catalog="toggleCatalog" />
  <main class="app-main" ref="mainRef">
    <RouterView v-slot="{ Component }">
      <Transition :name="pageTransition">
        <component :is="Component" :key="$route.name" />
      </Transition>
    </RouterView>
  </main>
  <BottomNav @add="openForm" :has-draft="hasDraft" />
  <MigraineFormModal v-if="formOpen" @close="onFormClose" @saved="onFormSaved" />
  <CatalogModal v-if="catalogOpen" @close="catalogOpen = false" />
  <ConfirmDialog
    v-if="showDraftDialog"
    title="Saisie en cours"
    message="Vous avez une migraine non enregistrée. Souhaitez-vous reprendre là où vous en étiez, ou commencer une nouvelle saisie ?"
    confirm-label="Reprendre"
    cancel-label="Nouvelle saisie"
    @confirm="resumeDraft"
    @cancel="startFresh"
    @dismiss="showDraftDialog = false"
  />
  <ToastContainer />
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useSwipe } from '@vueuse/core'
import HeaderNav from './components/HeaderNav.vue'
import BottomNav from './components/BottomNav.vue'
import MigraineFormModal from './components/MigraineForm/MigraineFormModal.vue'
import CatalogModal from './components/CatalogModal.vue'
import ConfirmDialog from './components/ConfirmDialog.vue'
import ToastContainer from './components/ToastContainer.vue'
import { useSettingsStore } from './stores/settings'
import { useToastStore } from './stores/toast'
import { hasSavedDraft, clearDraft } from './components/MigraineForm/draft'
import { pb } from './lib/pocketbase'
import { useSync } from './composables/useSync'

useSettingsStore()

const sync = useSync()

function onVisibilityChange() {
  if (document.visibilityState === 'visible' && pb.authStore.isValid) {
    sync.refreshFromRemote().catch((err) => {
      console.error(err)
      toastStore.add({ message: 'Échec de la synchronisation avec le cloud.', type: 'danger' })
    })
  }
}

onMounted(() => {
  document.addEventListener('visibilitychange', onVisibilityChange)
})

onUnmounted(() => {
  document.removeEventListener('visibilitychange', onVisibilityChange)
})

const router = useRouter()
const toastStore = useToastStore()
const formOpen = ref(false)
const catalogOpen = ref(false)
const showDraftDialog = ref(false)
const hasDraft = ref(hasSavedDraft())
const mainRef = ref<HTMLElement | null>(null)
const pageTransition = ref<'slide-next' | 'slide-prev'>('slide-next')

const routeOrder: Record<string, number> = { stats: 0, liste: 1 }

function openForm() {
  if (hasDraft.value) {
    showDraftDialog.value = true
  } else {
    formOpen.value = true
  }
}

function resumeDraft() {
  showDraftDialog.value = false
  formOpen.value = true
}

function startFresh() {
  showDraftDialog.value = false
  clearDraft()
  hasDraft.value = false
  formOpen.value = true
}

function onFormSaved() {
  toastStore.add({ message: 'Migraine enregistrée !', type: 'success' })
  formOpen.value = false
  hasDraft.value = false
}

function toggleCatalog() {
  catalogOpen.value = !catalogOpen.value
}

function onFormClose() {
  formOpen.value = false
  hasDraft.value = hasSavedDraft()
}

useSwipe(mainRef, {
  onSwipeEnd(_event, direction) {
    if (formOpen.value || catalogOpen.value) return
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
