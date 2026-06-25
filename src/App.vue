<template>
  <HeaderNav @add="openForm" />
  <main class="app-main">
    <RouterView />
  </main>
  <BottomNav />
  <FabButton @click="openForm" />
  <MigraineFormModal v-if="formOpen" @close="onFormClose" @saved="onFormSaved" />
  <ToastContainer />
</template>

<script setup lang="ts">
import { ref } from 'vue'
import HeaderNav from './components/HeaderNav.vue'
import BottomNav from './components/BottomNav.vue'
import FabButton from './components/FabButton.vue'
import MigraineFormModal from './components/MigraineForm/MigraineFormModal.vue'
import ToastContainer from './components/ToastContainer.vue'
import { useSettingsStore } from './stores/settings'
import { useToastStore } from './stores/toast'

useSettingsStore()

const toastStore = useToastStore()
const formOpen = ref(false)
const pendingDraftToastId = ref<string | null>(null)

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
</script>

<style scoped>
.app-main {
  margin-top: 3.5rem;
  height: calc(100dvh - 3.5rem);
  overflow: hidden;
}
@media (max-width: 1023px) {
  .app-main {
    height: calc(100dvh - 3.5rem - 3.5rem);
  }
}
</style>
