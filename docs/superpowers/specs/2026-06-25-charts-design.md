# Graphiques & Data Viz

Domaine 5 sur 6 du lot d'améliorations UI/UX.

## Goals

1. **Supprimer le 3e graphique** (EfficacyChart) de la grille principale et de `ChartDetailModal`.
2. **Responsive** : s'assurer que les graphiques se redimensionnent correctement (min-height explicite sur `.chart-wrap`).
3. **Sélecteur de période** : boutons Jour / Semaine / Mois dans `StatsView`.
4. **Échelle dynamique par défaut** : calculée selon la profondeur d'historique de l'utilisateur.

## Architecture

### Suppression d'EfficacyChart

- `StatsView.vue` : retirer la `<button class="chart-card">` pour l'efficacité et `openDetail('efficacy')`. Les 2 graphiques restants (Fréquence, Intensité) occupent la grille à 2 colonnes sur desktop.
- `ChartDetailModal.vue` : retirer la branche `v-else` (EfficacyChart), mettre `v-else-if="chart === 'intensity'"`. Prop type passe de `'frequency' | 'intensity' | 'efficacy'` à `'frequency' | 'intensity'`. Retirer l'import `EfficacyChart` et les computed `efficacyRank`.
- `StatsView.vue` : `activeDetail` type passe à `'frequency' | 'intensity' | null`.
- `EfficacyChart.vue` : le fichier est conservé mais n'est plus importé nulle part (peut être supprimé ou laissé inutilisé — plan inclut la suppression).

### Sélecteur de période

Local à `StatsView.vue` — pas de store (préférence non persistée, reset à chaque visite).

```ts
type Period = 'day' | 'week' | 'month'
const period = ref<Period>(defaultPeriod(migraines.migraines))
```

`defaultPeriod` est une nouvelle fonction utilitaire exportée de `src/utils/stats.ts` :
- 0 migraine → `'month'`
- Migraine la plus ancienne < 3 mois → `'day'`
- Entre 3 et 6 mois → `'week'`
- > 6 mois → `'month'`

UI : 3 boutons pill (classes `.period-btn`, `.period-btn.active`) placés au-dessus de la grille de graphiques.

### Nouvelles fonctions stats

Ajoutées à `src/utils/stats.ts`, toutes testées :

```ts
dailyFrequency(migraines, from?, days?=30): { day: string; count: number }[]
weeklyFrequency(migraines, from?, weeks?=12): { week: string; count: number }[]
averageIntensityByDay(migraines, from?, days?=30): { day: string; avg: number }[]
averageIntensityByWeek(migraines, from?, weeks?=12): { week: string; avg: number }[]
defaultPeriod(migraines): Period
```

- `weeklyFrequency` : la semaine commence le lundi (ISO). Clé = date du lundi au format `YYYY-MM-DD`.
- Toutes retournent des entrées pour toutes les périodes de la fenêtre, même celles à 0.

### FrequencyChart.vue et IntensityChart.vue

Nouvelle prop `period: 'day' | 'week' | 'month'` avec default `'month'`.

Le `computed` de `chartData` sélectionne la fonction selon `props.period` :
```ts
if (props.period === 'day')    data = dailyFrequency(props.migraines).map(d => ({ label: d.day.slice(5), count: d.count }))
else if (props.period === 'week') data = weeklyFrequency(props.migraines).map(d => ({ label: d.week.slice(5), count: d.count }))
else                           data = monthlyFrequency(props.migraines).map(d => ({ label: d.month.slice(5), count: d.count }))
```

Idem pour IntensityChart (avec `avg` au lieu de `count`).

### Responsive / ResizeObserver

Chart.js utilise déjà `responsive: true, maintainAspectRatio: false`. Ajouter `min-height: 200px` sur `.chart-wrap` dans `StatsView.vue` comme garde-fou pour les petits écrans.

## Tests

- `src/utils/stats.test.ts` (TDD) : `dailyFrequency`, `weeklyFrequency`, `averageIntensityByDay`, `averageIntensityByWeek`, `defaultPeriod`.

## Out of scope

- Pas de persistance de la période sélectionnée.
- `ChartDetailModal` ne reçoit pas de prop `period` — il reste toujours en vue mensuelle.
- Pas de graphique de type "camembert" ni d'autres types de visualisation.
