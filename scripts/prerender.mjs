// Pré-rendu statique léger, exécuté après `vite build`.
//
// But : donner aux robots d'indexation du HTML avec du vrai texte dès la
// première requête, sans navigateur headless (Puppeteer/Playwright) — trop
// lourd/fragile à builder sur une infra ARM (Raspberry Pi via Dokploy/Railpack).
//
// Principe : on part du dist/index.html généré par Vite (qui contient déjà les
// bonnes balises <script>/<link> hashées), on y injecte des meta/JSON-LD
// spécifiques à chaque route publique, et on écrit un index.html statique par
// route. Vue Router prend ensuite le relais normalement côté client dès
// l'hydratation (aucune donnée d'hydratation stricte n'est requise ici,
// createApp().mount() remplace simplement le contenu de #app).

import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { confidentialite, mentionsLegales } from '../src/content/legal.mjs'
import { homeIntro } from '../src/content/home.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const distDir = path.join(__dirname, '..', 'dist')
const distIndexPath = path.join(distDir, 'index.html')
const SITE_URL = 'https://migracount.aifedespaix.com'
const SITE_NAME = 'Migracount'

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function replaceMeta(html, attr, value, content) {
  const re = new RegExp(`(<meta\\s+${attr}="${value}"[\\s\\S]*?content=")[^"]*("[\\s\\S]*?\\/?>)`)
  if (!re.test(html)) {
    throw new Error(`prerender: meta ${attr}="${value}" introuvable dans dist/index.html`)
  }
  return html.replace(re, `$1${escapeHtml(content)}$2`)
}

function replaceLink(html, rel, href) {
  const re = new RegExp(`(<link\\s+rel="${rel}"[\\s\\S]*?href=")[^"]*("[\\s\\S]*?\\/?>)`)
  if (!re.test(html)) {
    throw new Error(`prerender: link rel="${rel}" introuvable dans dist/index.html`)
  }
  return html.replace(re, `$1${href}$2`)
}

function renderSections(sections) {
  return sections
    .map((section) => {
      const paras = section.paragraphs.map((p) => `<p>${p}</p>`).join('\n')
      const list = section.list
        ? `<ul>${section.list.map((item) => `<li>${item}</li>`).join('')}</ul>`
        : ''
      const after = (section.paragraphsAfterList ?? [])
        .map((p) => `<p>${p}</p>`)
        .join('\n')
      return `<section><h2>${escapeHtml(section.heading)}</h2>${paras}${list}${after}</section>`
    })
    .join('\n')
}

function applyCommonMeta(html, { pageTitle, ogTitle, description, path: routePath, jsonLd }) {
  const url = `${SITE_URL}${routePath}`

  let out = html
  out = out.replace(/<title>[^<]*<\/title>/, `<title>${escapeHtml(pageTitle)}</title>`)
  out = replaceMeta(out, 'name', 'description', description)
  out = replaceMeta(out, 'name', 'robots', 'index, follow')
  out = replaceLink(out, 'canonical', url)
  out = replaceMeta(out, 'property', 'og:title', ogTitle)
  out = replaceMeta(out, 'property', 'og:description', description)
  out = replaceMeta(out, 'property', 'og:url', url)
  out = replaceMeta(out, 'name', 'twitter:title', ogTitle)
  out = replaceMeta(out, 'name', 'twitter:description', description)

  if (jsonLd) {
    const script = `<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>\n  </head>`
    out = out.replace('</head>', script)
  }

  return out
}

function injectAppContent(html, innerHtml) {
  if (!html.includes('<div id="app"></div>')) {
    throw new Error('prerender: <div id="app"></div> introuvable dans dist/index.html')
  }
  return html.replace('<div id="app"></div>', `<div id="app">${innerHtml}</div>`)
}

async function writeRoute(baseHtml, routePath, outputRelPath, meta, innerHtml) {
  let html = applyCommonMeta(baseHtml, { ...meta, path: routePath })
  html = injectAppContent(html, innerHtml)
  const outPath = path.join(distDir, outputRelPath)
  await mkdir(path.dirname(outPath), { recursive: true })
  await writeFile(outPath, html, 'utf-8')
  console.log(`[prerender] ${routePath} -> dist/${outputRelPath}`)
}

async function main() {
  if (!existsSync(distIndexPath)) {
    throw new Error('prerender: dist/index.html introuvable — lance `vite build` avant ce script.')
  }
  const baseHtml = await readFile(distIndexPath, 'utf-8')

  const homeJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'Migracount',
    url: `${SITE_URL}/`,
    description:
      'Suivez vos crises de migraine, analysez vos déclencheurs et optimisez vos traitements avec Migracount, votre journal personnel de migraine synchronisé.',
    applicationCategory: 'HealthApplication',
    operatingSystem: 'Any (PWA)',
    inLanguage: 'fr-FR',
    isAccessibleForFree: true,
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'EUR' },
    author: { '@type': 'Person', name: 'Aife' },
  }

  await writeRoute(
    baseHtml,
    '/',
    'index.html',
    {
      pageTitle: 'Migracount',
      ogTitle: 'Migracount - Suivi personnel des migraines',
      description:
        'Suivez vos crises de migraine, analysez vos déclencheurs et optimisez vos traitements avec Migracount, votre journal personnel de migraine synchronisé.',
      jsonLd: homeJsonLd,
    },
    `<h1>${escapeHtml(homeIntro.title)}</h1><p>${escapeHtml(homeIntro.paragraph)}</p>`,
  )

  await writeRoute(
    baseHtml,
    '/confidentialite/',
    'confidentialite/index.html',
    {
      pageTitle: 'Politique de confidentialité - Migracount',
      ogTitle: 'Politique de confidentialité',
      description:
        'Comment Migracount traite vos données de santé : stockage local par défaut, synchronisation optionnelle et vos droits RGPD.',
    },
    `<h1>${escapeHtml(confidentialite.title)}</h1>${renderSections(confidentialite.sections)}`,
  )

  await writeRoute(
    baseHtml,
    '/mentions-legales/',
    'mentions-legales/index.html',
    {
      pageTitle: 'Mentions légales - Migracount',
      ogTitle: 'Mentions légales',
      description:
        'Informations légales sur l’éditeur et l’hébergement de Migracount, application personnelle de suivi de migraine.',
    },
    `<h1>${escapeHtml(mentionsLegales.title)}</h1>${renderSections(mentionsLegales.sections)}`,
  )
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
