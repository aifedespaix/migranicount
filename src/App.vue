<template>
  <HeaderNav @add="formOpen = true" />
  <main class="app-main">
    <RouterView />
  </main>
  <BottomNav />
  <FabButton @click="formOpen = true" />
  <MigraineFormModal v-if="formOpen" @close="formOpen = false" @saved="formOpen = false" />
</template>

<script setup lang="ts">
import { ref } from 'vue'
import HeaderNav from './components/HeaderNav.vue'
import BottomNav from './components/BottomNav.vue'
import FabButton from './components/FabButton.vue'
import MigraineFormModal from './components/MigraineForm/MigraineFormModal.vue'

const formOpen = ref(false)
</script>

<style scoped>
.app-main {
  padding-bottom: 5rem;
}
</style>
