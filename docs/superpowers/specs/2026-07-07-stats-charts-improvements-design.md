# Amélioration des statistiques et graphiques — Design

Date : 2026-07-07
Statut : approuvé (conversation Claude Code)

## Contexte

L'app suit par migraine : date, heureDebut, heureFin, intensité (1–10), avortée,
médocs pris (avec heure), symptômes, déclencheurs, zone, notes ; plus les périodes
de traitement de fond par médicament favori. Les stats vivent dans
`src/utils/stats.ts` (fonctions pures testées) et les graphiques chart.js dans
`src/components/charts/`, branchés dans `StatsView.vue` et `ChartDetailModal.vue`.

## 1. Fréquence × intensité

- `dailyFrequency` renvoie en plus `maxIntensity` (intensité max du jour, 0 si aucune crise).
- `weeklyFrequency` / `monthlyFrequency` renvoient en plus `avgIntensity`.
- `FrequencyChart.vue` :
  - Vue **jour** : hauteur de barre = intensité (axe Y fixé 0–10), couleur =
    `intensityColor(intensité)` (`src/utils/intensity.ts`). Tooltip « 7/10 — Forte ».
  - Vues **semaine/mois** : hauteur = nombre de crises (inchangé), couleur =
    `intensityColor(avgIntensity)`. Tooltip « 3 crises — intensité moy. 5,2 ».
  - Les bandes de traitement de fond restent inchangées.

## 2. Corrections de l'existant

- **Durée à cheval sur minuit** : helper unique `durationMin(debut, fin)` qui
  ajoute 24 h si la différence est négative. Utilisé par `durationStats`,
  `durationDistribution`, `averageDurationMinutes` (se propage à l'analyse
  traitement de fond).
- **Courbe intensité** (`IntensityChart`) : les périodes sans crise produisent
  `null` (plus de 0 trompeur) + `spanGaps: true`.
- **Efficacité médicaments** (`MedocEfficacyChart`) : label « Nom (n=X) »,
  tooltip « X avortées / Y prises », tri par estimateur lissé
  `(avortées+1)/(prises+2)` (Laplace) pour éviter qu'un n=1 à 100 % domine.
- **Distribution des intensités** : barres 1→10 colorées par `intensityColor(level)`.

## 3. Nouveaux graphiques

- **Heatmap calendrier** (`CalendarHeatmap.vue`, composant Vue custom sans chart.js) :
  grille type GitHub, colonnes = semaines, cases colorées par intensité,
  vide = fond neutre. ~4 derniers mois en carte sur StatsView, 12 mois dans la
  modale de détail. Tooltip natif (title) par case.
- **Déclencheurs / Symptômes / Zones** : `triggerFrequency()` (déjà écrite),
  nouvelle `symptomFrequency()` (même pattern, groupée par id), `zoneDistribution()`.
  Barres horizontales top 10 pour tags ; doughnut pour zones. Trois StatsButtons.
- **Patterns temporels** : `startHourDistribution()` (nuit 0–6 / matin 6–12 /
  après-midi 12–18 / soir 18–24) et `weekdayDistribution()` (lun–dim).
  Un StatsButton → modale à deux graphiques.
- **Suivi médicamenteux** : `medicationDaysPerMonth()` (jours distincts avec ≥1
  prise, sur 12 mois) avec seuils visuels : barres orange ≥8, rouges ≥10, ligne
  de seuil à 8 et mention du risque de céphalée par abus médicamenteux.
  `abortionRateByDelay()` : % avortée par délai entre heureDebut et première
  prise (<30 min / 30–60 / 1–2 h / >2 h). Un StatsButton → modale à deux graphiques.

## 4. Nouvelle donnée : soulagement par prise

- `MedocPris.soulagement?: 'oui' | 'partiel' | 'non'` (optionnel, pas de défaut).
- `StepMedocs.vue` : trois pastilles Oui/Partiel/Non par prise enregistrée.
- Sync : `medocs` est un blob JSON dans PocketBase → aucune migration.
- `reliefStats()` par médicament ; affichée dans la modale « Efficacité
  médicaments » quand des données existent (« soulagement complet 60 % (n=10) »).
  Le % avortée reste la mesure principale.

## Hors périmètre (sessions futures)

Sommeil de la veille, impact fonctionnel (MIDAS), cycle menstruel, météo/pression.

## Tests

Chaque nouvelle fonction de stats a ses cas dans `src/utils/stats.test.ts`
(y compris durée traversant minuit, jours sans crise → null, lissage Laplace).
Vérification finale : `npm test` + `npm run build` (vue-tsc) + revue visuelle.
