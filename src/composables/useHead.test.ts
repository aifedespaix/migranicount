import { beforeEach, describe, expect, it } from 'vitest'
import { applySeo } from './useHead'

beforeEach(() => {
  document.head.innerHTML = ''
})

describe('applySeo', () => {
  it('sets document.title', () => {
    applySeo({ title: 'Test', description: 'A description for testing purposes.' }, '/test')
    expect(document.title).toBe('Test - Migracount')
  })

  it('creates meta[name=description] on first call', () => {
    applySeo({ title: 'Test', description: 'My description here.' }, '/test')
    const el = document.head.querySelector('meta[name="description"]')
    expect(el).not.toBeNull()
    expect(el?.getAttribute('content')).toBe('My description here.')
  })

  it('updates meta[name=description] without duplicating', () => {
    applySeo({ title: 'Test', description: 'First description.' }, '/test')
    applySeo({ title: 'Test', description: 'Second description.' }, '/test')
    const tags = document.head.querySelectorAll('meta[name="description"]')
    expect(tags.length).toBe(1)
    expect(tags[0].getAttribute('content')).toBe('Second description.')
  })

  it('creates og:title meta[property] tag with the title (not suffixed)', () => {
    applySeo({ title: 'Mon titre', description: 'Une description quelconque.' }, '/test')
    const el = document.head.querySelector('meta[property="og:title"]')
    expect(el?.getAttribute('content')).toBe('Mon titre')
  })

  it('creates canonical link tag with correct href', () => {
    applySeo({ title: 'Test', description: 'Une description quelconque.' }, '/test')
    const el = document.head.querySelector('link[rel="canonical"]')
    expect(el?.getAttribute('href')).toBe('https://migracount.aifedespaix.com/test')
  })

  it('defaults og:image to the default OG image URL when not specified', () => {
    applySeo({ title: 'Test', description: 'Une description quelconque.' }, '/test')
    const el = document.head.querySelector('meta[property="og:image"]')
    expect(el?.getAttribute('content')).toBe('https://migracount.aifedespaix.com/og-image.png')
  })

  it('sets robots from meta.robots', () => {
    applySeo({ title: 'Test', description: 'Une description quelconque.', robots: 'index, follow' }, '/test')
    const el = document.head.querySelector('meta[name="robots"]')
    expect(el?.getAttribute('content')).toBe('index, follow')
  })

  it('overrides robots to noindex, nofollow', () => {
    applySeo({ title: 'Réglages', description: 'Une description quelconque.', robots: 'noindex, nofollow' }, '/settings')
    const el = document.head.querySelector('meta[name="robots"]')
    expect(el?.getAttribute('content')).toBe('noindex, nofollow')
  })
})
