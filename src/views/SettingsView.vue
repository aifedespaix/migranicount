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
        <button
          type="button"
          class="font-option"
          :class="{ active: settings.dyslexicFont === 'opendyslexic' }"
          @click="settings.setDyslexicFont('opendyslexic')"
        >
          <span class="font-preview" style="font-family: 'OpenDyslexic', sans-serif">Aa Bb Cc</span>
          <span class="font-option-label">OpenDyslexic</span>
        </button>
      </div>
    </section>

    <section>
      <h2>Export</h2>
      <button @click="doExport">Télécharger mes données (JSON)</button>
    </section>
    <section>
      <h2>Import</h2>
      <input type="file" accept="application/json" @change="onFileSelected" />
      <p v-if="confirming" class="confirm-box">
        Importer ce fichier remplacera toutes les données actuelles. Confirmer ?
        <button @click="confirmImport">Oui, remplacer</button>
        <button @click="confirming = false">Annuler</button>
      </p>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { exportAll, importAll } from '../storage/migraineRepository'
import { useSettingsStore } from '../stores/settings'

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
</style>
