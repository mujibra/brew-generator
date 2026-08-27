import type { Metadata } from 'next'
import { WaterLab } from './WaterLab'

export const metadata: Metadata = {
  title: 'Water',
  description:
    'Build brewing water from salts, blend hard water down, and find out what your tap water is doing to your coffee.',
}

export default function WaterPage() {
  return <WaterLab />
}
