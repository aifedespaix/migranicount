<template>
  <div class="settings-view">
    <h1>Réglages</h1>
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
