/**
 * Script d'initialisation PocketBase pour Migracount.
 * Crée les 3 collections nécessaires à la sync.
 * Idempotent : skip si la collection existe déjà.
 *
 * Usage : node scripts/pb-init.mjs
 *
 * PRÉREQUIS : configurer Google OAuth2 dans l'admin PocketBase après execution
 *   → /_/ > Collections > users > API Rules > OAuth2 > activer Google
 *   → fournir le Client ID et Client Secret Google Console
 */

import PocketBase from 'pocketbase'

const PB_URL = process.env.PB_URL ?? 'https://api-migracount.aifedespaix.com/'
const EMAIL = process.env.PB_EMAIL
const PASSWORD = process.env.PB_PASSWORD

if (!EMAIL || !PASSWORD) {
  console.error('✗ Variables manquantes : définir PB_EMAIL et PB_PASSWORD')
  process.exit(1)
}

const pb = new PocketBase(PB_URL)

async function authAsSuperuser() {
  try {
    await pb.collection('_superusers').authWithPassword(EMAIL, PASSWORD)
    console.log('✓ Authentifié comme superuser')
  } catch {
    // Fallback pour versions antérieures
    await pb.admins.authWithPassword(EMAIL, PASSWORD)
    console.log('✓ Authentifié comme admin (fallback)')
  }
}

async function collectionExists(name) {
  try {
    await pb.collections.getOne(name)
    return true
  } catch {
    return false
  }
}

async function createMigrainesCollection() {
  const name = 'migraines'
  if (await collectionExists(name)) {
    console.log(`· Collection "${name}" existe déjà - skip`)
    return
  }

  const rule = '@request.auth.id = userId'
  await pb.collections.create({
    name,
    type: 'base',
    listRule: rule,
    viewRule: rule,
    createRule: rule,
    updateRule: rule,
    deleteRule: rule,
    fields: [
      { type: 'text', name: 'userId', required: true },
      { type: 'text', name: 'localId', required: true },
      { type: 'text', name: 'date', required: true },
      { type: 'text', name: 'heureDebut', required: true },
      { type: 'text', name: 'heureFin' },
      { type: 'json', name: 'medocs' },
      { type: 'number', name: 'intensite', required: true, min: 1, max: 10 },
      { type: 'text', name: 'avortee', required: true },
      { type: 'json', name: 'symptomes' },
      { type: 'text', name: 'zone' },
      { type: 'json', name: 'declencheurs' },
      { type: 'text', name: 'notes', max: 500 },
      { type: 'text', name: 'localUpdatedAt', required: true },
    ],
    indexes: [
      'CREATE UNIQUE INDEX idx_migraines_user_local ON migraines (userId, localId)',
    ],
  })
  console.log(`✓ Collection "${name}" créée`)
}

async function createMedocsFavorisCollection() {
  const name = 'medocs_favoris'
  if (await collectionExists(name)) {
    console.log(`· Collection "${name}" existe déjà - skip`)
    return
  }

  const rule = '@request.auth.id = userId'
  await pb.collections.create({
    name,
    type: 'base',
    listRule: rule,
    viewRule: rule,
    createRule: rule,
    updateRule: rule,
    deleteRule: rule,
    fields: [
      { type: 'text', name: 'userId', required: true },
      { type: 'text', name: 'localId', required: true },
      { type: 'text', name: 'nom', required: true },
      { type: 'text', name: 'description' },
      { type: 'number', name: 'usageCount', required: true, min: 0 },
      { type: 'number', name: 'posologieParJour', required: false },
      { type: 'number', name: 'intervalleHeures', required: false },
    ],
    indexes: [
      'CREATE UNIQUE INDEX idx_medocs_user_local ON medocs_favoris (userId, localId)',
    ],
  })
  console.log(`✓ Collection "${name}" créée`)
}

async function createUserPreferencesCollection() {
  const name = 'user_preferences'
  if (await collectionExists(name)) {
    console.log(`· Collection "${name}" existe déjà - skip`)
    return
  }

  const rule = '@request.auth.id = userId'
  await pb.collections.create({
    name,
    type: 'base',
    listRule: rule,
    viewRule: rule,
    createRule: rule,
    updateRule: rule,
    deleteRule: rule,
    fields: [
      { type: 'text', name: 'userId', required: true },
      { type: 'json', name: 'declencheursFavoris' },
      { type: 'json', name: 'symptomesCustom' },
      { type: 'text', name: 'theme' },
      { type: 'text', name: 'dyslexicFont' },
    ],
    indexes: [
      'CREATE UNIQUE INDEX idx_user_prefs_user ON user_preferences (userId)',
    ],
  })
  console.log(`✓ Collection "${name}" créée`)
}

async function updateMedocsFavorisCollection() {
  try {
    const col = await pb.collections.getOne('medocs_favoris')
    const existingNames = col.fields.map((f) => f.name)
    const newFields = []
    if (!existingNames.includes('isLongTermTreatment'))
      newFields.push({ type: 'bool', name: 'isLongTermTreatment' })
    if (!existingNames.includes('treatmentPeriods'))
      newFields.push({ type: 'json', name: 'treatmentPeriods' })
    if (!existingNames.includes('sideEffects'))
      newFields.push({ type: 'text', name: 'sideEffects', max: 500 })
    if (!existingNames.includes('expectedEffects'))
      newFields.push({ type: 'text', name: 'expectedEffects', max: 500 })
    if (!newFields.length) {
      console.log('· Collection "medocs_favoris" déjà à jour - skip')
      return
    }
    await pb.collections.update(col.id, { fields: [...col.fields, ...newFields] })
    console.log(`✓ ${newFields.length} champ(s) ajouté(s) à "medocs_favoris"`)
  } catch (e) {
    console.error('✗ Impossible de mettre à jour "medocs_favoris" :', e.message)
  }
}

async function configureUsersDeleteRule() {
  try {
    const usersCollection = await pb.collections.getOne('users')
    const desired = 'id = @request.auth.id'
    if (usersCollection.deleteRule === desired) {
      console.log('· Collection "users" deleteRule deja configuree - skip')
      return
    }
    await pb.collections.update('users', { deleteRule: desired })
    console.log('✓ Collection "users" deleteRule configuree : ' + desired)
  } catch (e) {
    console.error('✗ Impossible de configurer deleteRule sur "users" :', e.message)
    throw e
  }
}

async function main() {
  console.log(`\nConnexion à ${PB_URL}...\n`)

  await authAsSuperuser()

  console.log('\nCréation des collections...\n')
  await createMigrainesCollection()
  await createMedocsFavorisCollection()
  await updateMedocsFavorisCollection()
  await createUserPreferencesCollection()

  console.log('\nConfiguration des regles de suppression...\n')
  await configureUsersDeleteRule()

  console.log(`
┌─────────────────────────────────────────────────────────┐
│  Collections PocketBase initialisées avec succès !     │
│                                                         │
│  ÉTAPE MANUELLE REQUISE :                               │
│  Configurer Google OAuth2 dans l'admin PocketBase :     │
│  ${PB_URL}_/                                            │
│  → Settings > Auth providers > Google                   │
│  → Activer + saisir Client ID et Client Secret         │
│    depuis console.developers.google.com                 │
│                                                         │
│  Redirect URI à saisir dans Google Console :            │
│  ${PB_URL}api/oauth2-redirect                           │
└─────────────────────────────────────────────────────────┘
`)
  console.log('  → deleteRule "users" : id = @request.auth.id (suppression compte activee)')
}

main().catch((e) => {
  console.error('\n✗ Erreur :', e.message)
  process.exit(1)
})
