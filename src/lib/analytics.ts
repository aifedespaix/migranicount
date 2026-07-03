const SCRIPT_ID = 'umami-analytics'
const SCRIPT_SRC = 'https://analytics.aifedespaix.com/script.js'
const WEBSITE_ID = 'f547cada-5c09-478b-9f5a-4df4befe7e48'
const TRACKED_DOMAIN = 'migracount.aifedespaix.com'

export function enableAnalytics(): void {
  if (document.getElementById(SCRIPT_ID)) return

  const script = document.createElement('script')
  script.id = SCRIPT_ID
  script.defer = true
  script.src = SCRIPT_SRC
  script.dataset.websiteId = WEBSITE_ID
  script.dataset.domains = TRACKED_DOMAIN
  script.dataset.doNotTrack = 'true'
  script.dataset.excludeSearch = 'true'
  document.head.appendChild(script)
}

export function disableAnalytics(): void {
  document.getElementById(SCRIPT_ID)?.remove()
}
