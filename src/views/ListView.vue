<template>
  <div class="list-view">
    <h1>Mes migraines</h1>

    <div v-if="migraines.migraines.length === 0" class="empty-state">
      <p>
        Aucune migraine enregistrée pour le moment. Note ta première crise pour commencer à
        suivre tes statistiques.
      </p>
      <button class="cta-btn" @click="addFormOpen = true">Ajouter une migraine</button>
    </div>

    <template v-else>
      <div class="filters">
        <input
          v-model="keyword"
          type="search"
          class="filter-input"
          placeholder="Rechercher (médoc, note, déclencheur, localisation)"
        />
        <input v-model="month" type="month" class="filter-input" />
      </div>

      <div v-if="filtered.length === 0" class="empty-state">
        <p>Aucun résultat pour ces filtres.</p>
        <button class="cta-btn" @click="resetFilters">Réinitialiser les filtres</button>
      </div>

      <ul v-else class="migraine-grid">
        <MigraineListItem v-for="m in filtered" :key="m.id" :migraine="m" @click="editId = m.id" />
      </ul>
    </template>

    <MigraineFormModal v-if="editId" :edit-id="editId" @close="editId = null" @saved="editId = null" />
    <MigraineFormModal v-if="addFormOpen" @close="addFormOpen = false" @saved="addFormOpen = false" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useMigrainesStore } from '../stores/migraines'
import { filterMigraines } from '../utils/migraineFilters'
import MigraineListItem from '../components/MigraineListItem.vue'
import MigraineFormModal from '../components/MigraineForm/MigraineFormModal.vue'

const migraines = useMigrainesStore()
const editId = ref<string | null>(null)
const addFormOpen = ref(false)
const keyword = ref('')
const month = ref('')

const sorted = computed(() =>
  [...migraines.migraines].sort((a, b) => (a.date + a.heureDebut < b.date + b.heureDebut ? 1 : -1))
)

const filtered = computed(() => filterMigraines(sorted.value, { keyword: keyword.value, month: month.value }))

function resetFilters() {
  keyword.value = ''
  month.value = ''
}
</script>

<style scoped>
.list-view {
  padding: 1rem 1.5rem;
}
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  gap: 1rem;
  max-width: 480px;
  margin: 3rem auto;
}
.cta-btn {
  background: var(--color-accent);
  color: var(--color-accent-contrast);
  border: none;
  border-radius: 0.5rem;
  padding: 0.75rem 1.5rem;
  font-size: 1rem;
  cursor: pointer;
}
.filters {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-bottom: 1rem;
}
.filter-input {
  flex: 1;
  min-width: 200px;
  padding: 0.5rem 0.75rem;
  border-radius: 0.5rem;
  border: 1px solid var(--color-muted);
  background: var(--color-surface);
  color: var(--color-text);
  font-size: 0.95rem;
}
.migraine-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;
}
@media (min-width: 768px) {
  .migraine-grid { grid-template-columns: repeat(2, 1fr); }
}
@media (min-width: 1280px) {
  .migraine-grid { grid-template-columns: repeat(3, 1fr); }
}
</style>
