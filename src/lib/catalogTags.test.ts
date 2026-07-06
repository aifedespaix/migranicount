import { describe, it, expect } from 'vitest'
import { normalizeCatalogTags, dedupeCatalogTags, mergeCatalogTags } from './catalogTags'
import { DEFAULT_SYMPTOMES } from '../data/defaultTags'

describe('normalizeCatalogTags', () => {
  it('convertit les strings héritées en tags avec un id minté', () => {
    const tags = normalizeCatalogTags(['Photophobie', 'Phonophobie'])
    expect(tags).toHaveLength(2)
    expect(tags[0]).toMatchObject({ nom: 'Photophobie' })
    expect(tags[0].id).toBeTruthy()
    expect(tags[1].id).not.toBe(tags[0].id)
  })

  it('garde les tags valides tels quels', () => {
    const tags = normalizeCatalogTags([{ id: 't1', nom: 'Photophobie' }])
    expect(tags).toEqual([{ id: 't1', nom: 'Photophobie' }])
  })

  it('mint un id pour un objet sans id mais avec un nom', () => {
    const tags = normalizeCatalogTags([{ nom: 'Photophobie' }])
    expect(tags).toHaveLength(1)
    expect(tags[0].id).toBeTruthy()
  })

  it('élimine les entrées invalides (vides, sans nom, null, non-tableau)', () => {
    expect(normalizeCatalogTags(['', '   ', null, undefined, {}, { id: 'x' }, { id: 'y', nom: '  ' }, 42])).toEqual([])
    expect(normalizeCatalogTags(null)).toEqual([])
    expect(normalizeCatalogTags('pas un tableau')).toEqual([])
  })
})

describe('dedupeCatalogTags', () => {
  it('dédoublonne par nom (insensible à la casse et aux espaces), garde le premier, remap les suivants', () => {
    const { tags, remap } = dedupeCatalogTags([
      { id: 'a', nom: 'Photophobie' },
      { id: 'b', nom: ' photophobie ' },
      { id: 'c', nom: 'Phonophobie' },
    ])
    expect(tags).toEqual([
      { id: 'a', nom: 'Photophobie' },
      { id: 'c', nom: 'Phonophobie' },
    ])
    expect(remap.get('b')).toBe('a')
    expect(remap.has('a')).toBe(false)
  })

  it('élimine les customs qui dupliquent un défaut (remap vers l\'id du défaut)', () => {
    const { tags, remap } = dedupeCatalogTags(
      [{ id: 'x', nom: 'Nausée' }, { id: 'y', nom: 'Photophobie' }],
      DEFAULT_SYMPTOMES,
    )
    expect(tags).toEqual([{ id: 'y', nom: 'Photophobie' }])
    expect(remap.get('x')).toBe('default-nausee')
  })

  it('ne remap pas un tag portant déjà l\'id du défaut (pas de remap identitaire)', () => {
    const { tags, remap } = dedupeCatalogTags(
      [{ id: 'default-nausee', nom: 'Nausée' }],
      DEFAULT_SYMPTOMES,
    )
    expect(tags).toEqual([])
    expect(remap.size).toBe(0)
  })
})

describe('mergeCatalogTags', () => {
  it('fusionne par id, le local gagne', () => {
    const merged = mergeCatalogTags(
      [{ id: 'a', nom: 'Renommé local' }],
      [{ id: 'a', nom: 'Ancien nom' }, { id: 'b', nom: 'Distant' }],
      [],
    )
    expect(merged).toEqual([
      { id: 'a', nom: 'Renommé local' },
      { id: 'b', nom: 'Distant' },
    ])
  })

  it('ne crée pas de doublon quand le distant a le même nom sous un autre id', () => {
    const merged = mergeCatalogTags(
      [{ id: 'local-1', nom: 'Photophobie' }],
      [{ id: 'remote-1', nom: 'Photophobie' }],
      [],
    )
    expect(merged).toEqual([{ id: 'local-1', nom: 'Photophobie' }])
  })

  it('normalise le distant au format hérité (strings) sans créer de tag vide ni de doublon', () => {
    const merged = mergeCatalogTags(
      [{ id: 'local-1', nom: 'Photophobie' }],
      ['Photophobie', 'Osmophobie', ''],
      [],
    )
    expect(merged.map((t) => t.nom).sort()).toEqual(['Osmophobie', 'Photophobie'])
    expect(merged.every((t) => t.id && t.nom)).toBe(true)
  })

  it('écarte les entrées distantes qui dupliquent un tag par défaut', () => {
    const merged = mergeCatalogTags([], [{ id: 'r1', nom: 'nausée' }], DEFAULT_SYMPTOMES)
    expect(merged).toEqual([])
  })
})
