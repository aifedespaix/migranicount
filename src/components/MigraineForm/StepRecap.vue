<template>
  <div class="step">
    <h2>Récapitulatif</h2>
    <ul class="recap-list">
      <li>Date : {{ model.date }}</li>
      <li>Début : {{ model.heureDebut }} — Fin : {{ model.heureFin ?? 'en cours' }}</li>
      <li>Intensité : {{ model.intensite }} / 10</li>
      <li>Médicaments : {{ model.medocs.map(m => `${m.nom} (${m.heure})`).join(', ') || 'aucun' }}</li>
      <li>Avortée : {{ model.avortee ? 'oui' : 'non' }}</li>
      <li>Nausée : {{ model.nausee ? 'oui' : 'non' }} — Vomissement : {{ model.vomissement ? 'oui' : 'non' }}</li>
      <li>Aura : {{ model.aura ? 'oui' : 'non' }}</li>
      <li>Localisation : {{ model.localisation ?? 'non renseignée' }}</li>
      <li>Déclencheurs : {{ model.declencheurs.join(', ') || 'aucun' }}</li>
      <li v-if="model.notes">Notes : {{ model.notes }}</li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import type { MigraineDraft } from './draft'
const model = defineModel<MigraineDraft>({ required: true })
</script>
