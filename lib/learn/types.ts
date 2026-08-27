/**
 * Knowledge base types — PRD 8.0, F11.
 *
 * ponytail: typed TS modules rather than the MDX pipeline PRD 11 specifies.
 * The compiler enforces the schema for free and there is no build integration to
 * maintain. Move to MDX when a non-developer needs to author cards; the shape
 * here is deliberately frontmatter-compatible so that migration is mechanical.
 */

export type CardCategory = 'extraction' | 'grind' | 'roast' | 'water' | 'sensory'

/** PRD F11 R6 — how much weight a claim can carry. */
export type Confidence = 'established' | 'emerging' | 'contested' | 'folklore'

export type SourceKind =
  | 'industry-standard'
  | 'peer-reviewed'
  | 'book'
  | 'practitioner'
  | 'community'

export type Source = {
  title: string
  author?: string
  year?: number
  kind: SourceKind
  url?: string
}

export type Card = {
  /** `category/slug`. Doubles as the URL path under /learn/. */
  id: string
  category: CardCategory
  name: string
  aliases: string[]
  /** At most two sentences. */
  summary: string
  /**
   * What this changes about YOUR brew. Required — a card without one is trivia,
   * and PRD 5.1 exists to keep trivia out.
   */
  practicalImplication: string
  body: {
    /** Two sentences plus the implication. */
    quick: string
    standard: string
    /** Mechanism, contested points, the parts that need the reader to care. */
    deep?: string
  }
  /** Other card ids. Unresolved links are a build error, see the tests. */
  related: string[]
  sources: Source[]
  confidence: Confidence
  lastReviewed: string
}

export type Depth = 'quick' | 'standard' | 'deep'

export const CATEGORY_LABELS: Record<CardCategory, string> = {
  extraction: 'Extraction',
  grind: 'Grind',
  roast: 'Roast',
  water: 'Water',
  sensory: 'Tasting',
}

export const CATEGORY_BLURBS: Record<CardCategory, string> = {
  extraction: 'What actually dissolves, in what order, and what changes it.',
  grind: 'Particle size, distribution, and why your grinder is the limit.',
  roast: 'What roasting did to the bean, and what that means for brewing it.',
  water: 'The 98.5 % of your cup that nobody adjusts.',
  sensory: 'Naming what you taste, and the confusions that cost you cups.',
}

export const CONFIDENCE_LABELS: Record<Confidence, string> = {
  established: 'Well established',
  emerging: 'Emerging evidence',
  contested: 'Contested',
  folklore: 'Folklore, disputed',
}
