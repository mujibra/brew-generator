import type { Metadata } from 'next'
import { ShelfView } from './ShelfView'

export const metadata: Metadata = {
  title: 'Shelf',
  description:
    'Your coffee bags with freshness tracking, remaining dose, and how your brews from each bag score over time.',
}

export default function ShelfPage() {
  return <ShelfView />
}
