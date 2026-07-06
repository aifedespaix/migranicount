import { chromium } from 'playwright'
import { createServer } from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import { join, extname } from 'node:path'

const DIST = 'C:/Users/clape/Documents/dev/migranicount/dist'
const OUT = 'C:/Users/clape/AppData/Local/Temp/claude/C--Users-clape-Documents-dev-migranicount/7826c639-04a0-4588-aa6e-84d1eacaf782/scratchpad'

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.webmanifest': 'application/manifest+json', '.woff2': 'font/woff2' }

const server = createServer(async (req, res) => {
  try {
    let path = decodeURIComponent(req.url.split('?')[0])
    if (path === '/') path = '/index.html'
    let full = join(DIST, path)
    try { if ((await stat(full)).isDirectory()) full = join(full, 'index.html') } catch { full = join(DIST, 'index.html') }
    let data
    try { data = await readFile(full) } catch { data = await readFile(join(DIST, 'index.html')); full = 'index.html' }
    res.writeHead(200, { 'Content-Type': MIME[extname(full)] || 'application/octet-stream' })
    res.end(data)
  } catch (e) { res.writeHead(500); res.end(String(e)) }
})
await new Promise((r) => server.listen(4321, r))

// ── Seed data ────────────────────────────────────────────────────────────
const declencheurs = [
  { id: 'default-stress', nom: 'Stress' },
  { id: 'default-sommeil', nom: 'Manque de sommeil' },
  { id: 'default-ecrans', nom: 'Écrans' },
  { id: 'default-regles', nom: 'Règles' },
]
const symptomes = [
  { id: 'default-nausee', nom: 'Nausée' },
  { id: 'default-aura', nom: 'Aura visuelle' },
  { id: 's-photo', nom: 'Photophobie' },
]
const medocs = [
  { id: 'm-triptan', nom: 'Sumatriptan', usageCount: 12 },
  { id: 'm-doli', nom: 'Doliprane', usageCount: 20 },
  { id: 'm-ibu', nom: 'Ibuprofène', usageCount: 5 },
]
const zones = ['gauche', 'droite', 'bilaterale', 'nuque']
const migraines = []
const today = new Date()
let seed = 42
const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff }
for (let i = 0; i < 120; i++) {
  const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - Math.floor(rnd() * 330))
  const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  const intensite = 1 + Math.floor(rnd() * 10)
  const startH = Math.floor(rnd() * 24)
  const heureDebut = `${String(startH).padStart(2, '0')}:${rnd() > 0.5 ? '30' : '00'}`
  const durH = 1 + Math.floor(rnd() * 8)
  const endH = (startH + durH) % 24
  const heureFin = rnd() > 0.2 ? `${String(endH).padStart(2, '0')}:00` : null
  const med = medocs[Math.floor(rnd() * medocs.length)]
  const delay = Math.floor(rnd() * 150)
  const priseH = (startH * 60 + Math.floor(d.getMinutes()) + delay)
  const ph = Math.floor(priseH / 60) % 24
  const avortee = rnd() > 0.55 ? true : rnd() > 0.5 ? 'probable' : false
  const soul = rnd() > 0.6 ? (rnd() > 0.5 ? 'oui' : rnd() > 0.5 ? 'partiel' : 'non') : undefined
  migraines.push({
    id: 'mig-' + i, date: iso, heureDebut, heureFin,
    medocs: rnd() > 0.15 ? [{ id: 'p' + i, medocId: med.id, nom: med.nom, heure: `${String(ph).padStart(2, '0')}:00`, ...(soul ? { soulagement: soul } : {}) }] : [],
    intensite, avortee,
    symptomes: rnd() > 0.4 ? [symptomes[Math.floor(rnd() * symptomes.length)]] : [],
    zone: rnd() > 0.3 ? zones[Math.floor(rnd() * zones.length)] : null,
    declencheurs: rnd() > 0.35 ? [declencheurs[Math.floor(rnd() * declencheurs.length)]] : [],
    createdAt: iso, updatedAt: iso,
  })
}
// Add a couple midnight-crossing crises to exercise the duration fix
migraines.push({ id: 'mig-night', date: '2026-06-10', heureDebut: '22:30', heureFin: '05:00', medocs: [], intensite: 9, avortee: false, symptomes: [], zone: 'gauche', declencheurs: [], createdAt: '2026-06-10', updatedAt: '2026-06-10' })

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 430, height: 900 } })
const errors = []
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message))

await page.goto('http://localhost:4321/')
await page.evaluate((data) => {
  localStorage.setItem('migracount:schemaVersion', '5')
  localStorage.setItem('migracount:migraines', JSON.stringify(data.migraines))
  localStorage.setItem('migracount:medocsFavoris', JSON.stringify(data.medocs))
  localStorage.setItem('migracount:declencheursFavoris', JSON.stringify(data.declencheurs))
  localStorage.setItem('migracount:symptomesCustom', JSON.stringify(data.symptomes))
}, { migraines, medocs, declencheurs, symptomes })
await page.reload()
await page.waitForTimeout(1500)

await page.screenshot({ path: join(OUT, 'stats-main.png'), fullPage: true })

// Day view of frequency chart (intensity-scaled + colored)
const dayBtn = page.locator('.period-btn', { hasText: 'Jour' })
if (await dayBtn.count()) { await dayBtn.first().click(); await page.waitForTimeout(800); await page.screenshot({ path: join(OUT, 'stats-day.png'), fullPage: true }) }

// Open a few detail modals
async function openCard(text, file) {
  const el = page.locator('button', { hasText: text })
  if (await el.count()) {
    await el.first().click(); await page.waitForTimeout(900)
    await page.screenshot({ path: join(OUT, file) })
    const close = page.locator('[aria-label="Fermer"], .modal-close, button:has-text("×")')
    await page.keyboard.press('Escape'); await page.waitForTimeout(400)
  }
}
await openCard('Suivi médicamenteux', 'modal-medication.png')
await openCard('Patterns temporels', 'modal-time.png')
await openCard('Zones touchées', 'modal-zones.png')
await openCard('Déclencheurs', 'modal-triggers.png')
await openCard('Calendrier des crises', 'modal-heatmap.png')
await openCard('Efficacité médicaments', 'modal-efficacy.png')

console.log('CONSOLE_ERRORS:', JSON.stringify(errors, null, 2))
await browser.close()
await new Promise((r) => server.close(r))
