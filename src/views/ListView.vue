<template>
  <div class="list-view">
    <h1>Mes migraines</h1>

    <div v-if="migraines.migraines.length === 0" class="empty-state">
      <p>
        Aucune migraine enregistrée pour le moment. Note ta première crise pour
        commencer à suivre tes statistiques.
      </p>
      <button class="cta-btn" @click="addFormOpen = true">
        Ajouter une migraine
      </button>
    </div>

    <template v-else>
      <div class="filters">
        <div class="filter-field">
          <label class="filter-label" for="filter-keyword">Rechercher</label>
          <input
            id="filter-keyword"
            v-model="keyword"
            type="search"
            class="filter-input"
            placeholder="Médoc, note, symptôme, déclencheur, zone"
          />
        </div>
        <div class="date-range">
          <div class="date-range-field">
            <label class="date-range-label" @click="focusDu">Du</label>
            <div class="date-range-input-wrap">
              <DateField ref="duRef" v-model="dateFrom" />
              <button
                v-if="dateFrom"
                type="button"
                class="date-clear-btn"
                @click="dateFrom = ''"
              >
                ×
              </button>
            </div>
          </div>
          <div class="date-range-field">
            <label class="date-range-label" @click="focusAu">Au</label>
            <div class="date-range-input-wrap">
              <DateField ref="auRef" v-model="dateTo" />
              <button
                v-if="dateTo"
                type="button"
                class="date-clear-btn"
                @click="dateTo = ''"
              >
                ×
              </button>
            </div>
          </div>
        </div>
      </div>

      <div v-if="filtered.length === 0" class="empty-state">
        <p>Aucun résultat pour ces filtres.</p>
        <button class="cta-btn" @click="resetFilters">
          Réinitialiser les filtres
        </button>
      </div>

      <ul v-else class="migraine-grid">
        <MigraineListItem
          v-for="m in filtered"
          :key="m.id"
          :migraine="m"
          @click="editId = m.id"
        />
      </ul>
    </template>

    <MigraineFormModal
      v-if="editId"
      :edit-id="editId"
      @close="editId = null"
      @saved="onEditSaved"
      @deleted="onMigraineDeleted"
    />
    <MigraineFormModal
      v-if="addFormOpen"
      @close="addFormOpen = false"
      @saved="onAddSaved"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import DateField from "../components/DateField.vue";
import MigraineFormModal from "../components/MigraineForm/MigraineFormModal.vue";
import MigraineListItem from "../components/MigraineListItem.vue";
import { useMigrainesStore } from "../stores/migraines";
import { useToastStore } from "../stores/toast";
import { filterMigraines } from "../utils/migraineFilters";

const migraines = useMigrainesStore();
const toastStore = useToastStore();
const editId = ref<string | null>(null);
const addFormOpen = ref(false);
const keyword = ref("");
const dateFrom = ref("");
const dateTo = ref("");
const duRef = ref<InstanceType<typeof DateField> | null>(null);
const auRef = ref<InstanceType<typeof DateField> | null>(null);

function focusDu() {
  duRef.value?.$el?.querySelector("input")?.click();
}

function focusAu() {
  auRef.value?.$el?.querySelector("input")?.click();
}

const sorted = computed(() =>
  [...migraines.migraines].sort((a, b) =>
    a.date + a.heureDebut < b.date + b.heureDebut ? 1 : -1,
  ),
);

const filtered = computed(() =>
  filterMigraines(sorted.value, {
    keyword: keyword.value,
    dateFrom: dateFrom.value,
    dateTo: dateTo.value,
  }),
);

function resetFilters() {
  keyword.value = "";
  dateFrom.value = "";
  dateTo.value = "";
}

function onEditSaved() {
  editId.value = null;
  toastStore.add({ message: "Migraine mise à jour !", type: "info" });
}

function onMigraineDeleted() {
  editId.value = null;
  // undo toast was already shown by MigraineFormModal
}

function onAddSaved() {
  addFormOpen.value = false;
  toastStore.add({
    message: "Migraine enregistrée !",
    type: "success",
  });
}
</script>

<style scoped>
.list-view {
  padding: 1rem 1.5rem;
  height: 100%;
  overflow-y: auto;
  box-sizing: border-box;
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
.filter-field {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  flex: 1;
  min-width: 200px;
}

.filter-label {
  font-size: 0.7rem;
  color: var(--color-muted);
  font-weight: 500;
  cursor: default;
}

.filter-input {
  padding: 0.5rem 0.75rem;
  border-radius: 0.5rem;
  border: 1px solid var(--color-muted);
  background: var(--color-surface);
  color: var(--color-text);
  font-size: 0.95rem;
  width: 100%;
  box-sizing: border-box;
}
.date-range {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}
.date-range-field {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}
.date-range-label {
  font-size: 0.7rem;
  color: var(--color-muted);
  font-weight: 500;
}
.date-range-input-wrap {
  position: relative;
  display: flex;
  align-items: center;
}
.date-clear-btn {
  position: absolute;
  right: 0.4rem;
  background: none;
  border: none;
  cursor: pointer;
  color: var(--color-muted);
  font-size: 1rem;
  line-height: 1;
  padding: 0;
}
.migraine-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;
}
@media (min-width: 768px) {
  .migraine-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
@media (min-width: 1280px) {
  .migraine-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}
</style>
