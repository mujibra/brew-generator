import { CARDS, cardById } from '@/lib/learn/cards'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { CardView } from '../CardView'

/**
 * Card ids are `category/slug`, so the route is a catch-all. That keeps the
 * PRD's id format and gives clean URLs like /learn/extraction/grind-size/.
 */
export function generateStaticParams() {
  return CARDS.map((c) => ({ slug: c.id.split('/') }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string[] }>
}): Promise<Metadata> {
  const { slug } = await params
  const card = cardById(slug.join('/'))
  if (!card) return { title: 'Not found' }
  return {
    title: card.name,
    description: `${card.summary} ${card.practicalImplication}`.slice(0, 200),
  }
}

export default async function LearnCardPage({ params }: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await params
  const card = cardById(slug.join('/'))
  if (!card) notFound()
  return <CardView card={card} />
}
