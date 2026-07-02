const SITE_URL = 'https://migracount.aifedespaix.com'
const SITE_NAME = 'Migracount'
const DEFAULT_OG_IMAGE = `${SITE_URL}/og-image.png`
const DEFAULT_OG_IMAGE_WIDTH = 1200
const DEFAULT_OG_IMAGE_HEIGHT = 630
const DEFAULT_OG_IMAGE_ALT = 'Migracount - suivi personnel des crises de migraine'

export interface SeoMeta {
  title: string
  description: string
  robots?: string
  ogType?: string
  ogLocale?: string
  ogImage?: string
  ogImageWidth?: number
  ogImageHeight?: number
  ogImageAlt?: string
  jsonLd?: Record<string, unknown>
}

function setMetaTag(attrName: 'name' | 'property', attrValue: string, content: string): void {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attrName}="${attrValue}"]`)
  if (el) {
    el.setAttribute('content', content)
  } else {
    el = document.createElement('meta')
    el.setAttribute(attrName, attrValue)
    el.setAttribute('content', content)
    document.head.appendChild(el)
  }
}

function setLinkTag(rel: string, href: string): void {
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`)
  if (el) {
    el.setAttribute('href', href)
  } else {
    el = document.createElement('link')
    el.setAttribute('rel', rel)
    el.setAttribute('href', href)
    document.head.appendChild(el)
  }
}

function setJsonLd(data: Record<string, unknown> | undefined): void {
  const existing = document.head.querySelector<HTMLScriptElement>('script#seo-jsonld')
  if (!data) {
    existing?.remove()
    return
  }
  const json = JSON.stringify(data)
  if (existing) {
    existing.textContent = json
    return
  }
  const el = document.createElement('script')
  el.id = 'seo-jsonld'
  el.type = 'application/ld+json'
  el.textContent = json
  document.head.appendChild(el)
}

export function applySeo(meta: SeoMeta, path: string): void {
  document.title = `${meta.title} - ${SITE_NAME}`

  setMetaTag('name', 'description', meta.description)
  setMetaTag('name', 'robots', meta.robots ?? 'index, follow')

  setLinkTag('canonical', `${SITE_URL}${path}`)

  setMetaTag('property', 'og:title', meta.title)
  setMetaTag('property', 'og:description', meta.description)
  setMetaTag('property', 'og:url', `${SITE_URL}${path}`)
  setMetaTag('property', 'og:type', meta.ogType ?? 'website')
  setMetaTag('property', 'og:site_name', SITE_NAME)
  setMetaTag('property', 'og:locale', meta.ogLocale ?? 'fr_FR')
  setMetaTag('property', 'og:image', meta.ogImage ?? DEFAULT_OG_IMAGE)
  setMetaTag('property', 'og:image:width', String(meta.ogImageWidth ?? DEFAULT_OG_IMAGE_WIDTH))
  setMetaTag('property', 'og:image:height', String(meta.ogImageHeight ?? DEFAULT_OG_IMAGE_HEIGHT))
  setMetaTag('property', 'og:image:alt', meta.ogImageAlt ?? DEFAULT_OG_IMAGE_ALT)

  setMetaTag('name', 'twitter:card', 'summary_large_image')
  setMetaTag('name', 'twitter:title', meta.title)
  setMetaTag('name', 'twitter:description', meta.description)
  setMetaTag('name', 'twitter:image', meta.ogImage ?? DEFAULT_OG_IMAGE)

  setJsonLd(meta.jsonLd)
}
