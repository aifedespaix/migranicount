<template>
  <div class="list-view">
    <h1>Mes migraines</h1>
    <ul v-if="sorted.length">
      <MigraineListItem v-for="m in sorted" :key="m.id" :migraine="m" @click="editId = m.id" />
    </ul>
    <p v-else class="empty">Aucune migraine enregistrée pour le moment.</p>
    <MigraineFormModal v-if="editId" :edit-id="editId" @close="editId = null" @saved="editId = null" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useMigrainesStore } from '../stores/migraines'
import MigraineListItem from '../components/MigraineListItem.vue'
import MigraineFormModal from '../components/MigraineForm/MigraineFormModal.vue'

const migraines = useMigrainesStore()
const editId = ref<string | null>(null)

const sorted = computed(() =>
  [...migraines.migraines].sort((a, b) => (a.date + a.heureDebut < b.date + b.heureDebut ? 1 : -1))
)
</script>
