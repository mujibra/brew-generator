import { HYPOTHESES } from '@/lib/dialin/rules'
import { describe, expect, it } from 'vitest'
import { CARDS, CARD_INDEX, cardById, cardsByCategory, searchCards } from './cards'
import { CATEGORY_LABELS } from './types'

describe('editorial rules', () => {
  // PRD 5.1 and F11 R6. These are the rules that keep the knowledge base from
  // decaying into trivia, so they are asserted rather than trusted.
  it('every card says what it changes about your brew', () => {
    for (const card of CARDS) {
      expect(card.practicalImplication, card.id).toBeTruthy()
      expect(card.practicalImplication.length, card.id).toBeGreaterThan(40)
    }
  })

  it('every card carries at least one source', () => {
    for (const card of CARDS) {
      expect(card.sources.length, card.id).toBeGreaterThan(0)
      for (const source of card.sources) {
        expect(source.title, card.id).toBeTruthy()
        expect(source.kind, card.id).toBeTruthy()
      }
    }
  })

  it('keeps summaries to at most two sentences', () => {
    for (const card of CARDS) {
      const sentences = card.summary.split(/[.!?]+\s/).filter(Boolean)
      expect(sentences.length, `${card.id}: "${card.summary}"`).toBeLessThanOrEqual(2)
    }
  })

  it('has a quick and standard body for every card', () => {
    for (const card of CARDS) {
      expect(card.body.quick.length, card.id).toBeGreaterThan(60)
      expect(card.body.standard.length, card.id).toBeGreaterThan(200)
    }
  })

  it('labels its confidence and review date', () => {
    for (const card of CARDS) {
      expect(['established', 'emerging', 'contested', 'folklore'], card.id).toContain(
        card.confidence,
      )
      expect(card.lastReviewed, card.id).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    }
  })

  it('uses unique ids shaped as category/slug', () => {
    expect(new Set(CARDS.map((c) => c.id)).size).toBe(CARDS.length)
    for (const card of CARDS) {
      expect(card.id, card.id).toMatch(/^[a-z]+\/[a-z0-9-]+$/)
      expect(card.id.split('/')[0], card.id).toBe(card.category)
    }
  })

  it('assigns every card to a labelled category', () => {
    for (const card of CARDS) {
      expect(CATEGORY_LABELS[card.category], card.id).toBeTruthy()
    }
  })
})

describe('cross-links', () => {
  it('resolves every related id', () => {
    for (const card of CARDS) {
      for (const id of card.related) {
        expect(CARD_INDEX.has(id), `${card.id} → ${id}`).toBe(true)
      }
    }
  })

  it('never links a card to itself', () => {
    for (const card of CARDS) {
      expect(card.related, card.id).not.toContain(card.id)
    }
  })

  it('leaves no card orphaned — everything is reachable from another card', () => {
    const linkedTo = new Set(CARDS.flatMap((c) => c.related))
    const orphans = CARDS.filter((c) => !linkedTo.has(c.id)).map((c) => c.id)
    expect(orphans).toEqual([])
  })
})

describe('dial-in integration', () => {
  // PRD F4 R6: "No recommendation is ever presented without a mechanism link."
  // The engine has always emitted these ids; this is what makes them real.
  it('has a card for every mechanism the dial-in engine cites', () => {
    const cited = [...new Set(Object.values(HYPOTHESES).map((h) => h.mechanismCardId))]
    const missing = cited.filter((id) => !CARD_INDEX.has(id))
    expect(missing, `dial-in references cards that do not exist: ${missing.join(', ')}`).toEqual([])
  })

  it('covers all twelve hypotheses', () => {
    for (const h of Object.values(HYPOTHESES)) {
      expect(cardById(h.mechanismCardId), h.id).toBeDefined()
    }
  })
})

describe('lookup and search', () => {
  it('finds a card by id', () => {
    expect(cardById('extraction/grind-size')?.name).toBe('Grind size')
    expect(cardById('nope/nope')).toBeUndefined()
  })

  it('groups by category', () => {
    const grouped = cardsByCategory()
    expect(grouped.get('extraction')!.length).toBeGreaterThan(0)
    expect([...grouped.values()].flat()).toHaveLength(CARDS.length)
  })

  it('searches names, aliases and summaries', () => {
    expect(searchCards('channel').map((c) => c.id)).toContain('extraction/channelling')
    // Alias hit: nobody searches for "alkalinity" when their coffee tastes flat.
    expect(searchCards('flat').map((c) => c.id)).toContain('water/alkalinity')
    expect(searchCards('KH').map((c) => c.id)).toContain('water/alkalinity')
    expect(searchCards('CO2').map((c) => c.id)).toContain('roast/degassing')
  })

  it('returns everything for an empty query and nothing for nonsense', () => {
    expect(searchCards('   ')).toHaveLength(CARDS.length)
    expect(searchCards('zzzzqqq')).toEqual([])
  })
})
