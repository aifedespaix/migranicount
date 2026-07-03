<template>
  <div class="settings-view">
    <h1>Réglages</h1>

    <section>
      <h2>Apparence</h2>

      <p class="field-label">Thème</p>
      <div class="pill-group">
        <button
          type="button"
          class="pill-btn"
          :class="{ active: settings.theme === 'light' }"
          @click="settings.setTheme('light')"
        >
          Clair
        </button>
        <button
          type="button"
          class="pill-btn"
          :class="{ active: settings.theme === 'dark' }"
          @click="settings.setTheme('dark')"
        >
          Sombre
        </button>
        <button
          type="button"
          class="pill-btn"
          :class="{ active: settings.theme === 'auto' }"
          @click="settings.setTheme('auto')"
        >
          Auto
        </button>
        <button
          type="button"
          class="pill-btn"
          :class="{ active: settings.theme === 'migraine' }"
          @click="settings.setTheme('migraine')"
        >
          Migraine
        </button>
      </div>

      <p class="field-label">Police</p>
      <div class="font-options">
        <button
          type="button"
          class="font-option"
          :class="{ active: settings.dyslexicFont === 'none' }"
          @click="settings.setDyslexicFont('none')"
        >
          <span class="font-preview">Aa Bb Cc</span>
          <span class="font-option-label">Normale</span>
        </button>
        <button
          type="button"
          class="font-option"
          :class="{ active: settings.dyslexicFont === 'lexend' }"
          @click="settings.setDyslexicFont('lexend')"
        >
          <span class="font-preview" style="font-family: 'Lexend', sans-serif">Aa Bb Cc</span>
          <span class="font-option-label">Lexend</span>
        </button>
      </div>
    </section>

    <section>
      <h2>Confidentialité</h2>
      <p class="field-label">Statistiques anonymes</p>
      <p class="field-hint">
        Migracount utilise Umami, un outil de mesure d'audience auto-hébergé, sans cookie ni
        donnée personnelle. <RouterLink to="/confidentialite/">En savoir plus</RouterLink>.
      </p>
      <div class="pill-group">
        <button
          type="button"
          class="pill-btn"
          :class="{ active: settings.analyticsEnabled }"
          @click="settings.setAnalyticsEnabled(true)"
        >
          Activées
        </button>
        <button
          type="button"
          class="pill-btn"
          :class="{ active: !settings.analyticsEnabled }"
          @click="settings.setAnalyticsEnabled(false)"
        >
          Désactivées
        </button>
      </div>
    </section>

    <section>
      <h2>Données</h2>
      <div class="data-actions">
        <button class="action-btn" @click="doExport">
          <span>⬇</span> Exporter mes données (JSON)
        </button>
        <label class="action-btn import-label">
          <span>⬆</span> Importer un fichier
          <input type="file" accept="application/json" class="sr-only" @change="onFileSelected" />
        </label>
      </div>
    </section>

    <ConfirmDialog
      v-if="confirming"
      title="Remplacer les données ?"
      message="Importer ce fichier remplacera toutes vos données actuelles. Cette action est irréversible."
      confirm-label="Oui, remplacer"
      cancel-label="Annuler"
      @confirm="confirmImport"
      @cancel="confirming = false"
      @dismiss="confirming = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { exportAll, importAll } from '../storage/migraineRepository'
import { useSettingsStore } from '../stores/settings'
import ConfirmDialog from '../components/ConfirmDialog.vue'

const settings = useSettingsStore()
const confirming = ref(false)
const pendingJson = ref<string | null>(null)

function doExport() {
  const json = exportAll()
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `migracount-export-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
}

function onFileSelected(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = () => {
    pendingJson.value = reader.result as string
    confirming.value = true
  }
  reader.readAsText(file)
}

function confirmImport() {
  if (!pendingJson.value) return
  importAll(pendingJson.value)
  location.reload()
}
</script>

<style scoped>
.settings-view {
  padding: 1.25rem 1.5rem;
  max-width: 32rem;
  margin: 0 auto;
}
.font-options {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
  margin-bottom: 1rem;
}
.font-option {
  flex: 1;
  min-width: 7rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.4rem;
  padding: 0.75rem 0.5rem;
  border-radius: 0.75rem;
  border: 1px solid var(--color-muted);
  background: var(--color-surface);
  color: var(--color-text);
  cursor: pointer;
}
.font-option.active {
  border-color: var(--color-accent);
  border-width: 2px;
}
.font-preview {
  font-size: 1.1rem;
}
.font-option-label {
  font-size: 0.8rem;
  color: var(--color-muted);
}
.data-actions {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  max-width: 24rem;
}
.action-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.65rem 1.25rem;
  border-radius: 0.5rem;
  border: 1px solid var(--color-muted);
  background: var(--color-surface);
  color: var(--color-text);
  font: inherit;
  font-size: 0.9rem;
  cursor: pointer;
  text-align: left;
  transition: border-color 0.15s ease, background 0.15s ease;
}
.action-btn:hover {
  border-color: var(--color-accent);
  background: color-mix(in srgb, var(--color-accent) 5%, var(--color-surface));
}
.import-label {
  cursor: pointer;
}
.field-hint {
  font-size: 0.82rem;
  color: var(--color-muted);
  margin: -0.25rem 0 0.75rem;
  line-height: 1.4;
}
.field-hint a {
  color: var(--color-accent);
}
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
</style>
