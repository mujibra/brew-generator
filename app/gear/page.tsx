import type { Metadata } from 'next'
import { GearView } from './GearView'

export const metadata: Metadata = {
  title: 'Gear',
  description:
    'Record your grinder and your own baseline setting per brewer, so every grind suggestion arrives as an offset from something you know works.',
}

export default function GearPage() {
  return <GearView />
}
