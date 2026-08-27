import type { Metadata } from 'next'
import { LearnIndex } from './LearnIndex'

export const metadata: Metadata = {
  title: 'Learn',
  description:
    'How coffee extraction actually works: grind, temperature, agitation, water chemistry, roast and tasting — each with what it changes about your brew.',
}

export default function LearnPage() {
  return <LearnIndex />
}
