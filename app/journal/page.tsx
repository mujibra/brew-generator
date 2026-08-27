import type { Metadata } from 'next'
import { JournalView } from './JournalView'

export const metadata: Metadata = {
  title: 'Journal',
  description:
    'Every brew you have logged, with a brew control chart, per-recipe scores, and a full export.',
}

export default function JournalPage() {
  return <JournalView />
}
