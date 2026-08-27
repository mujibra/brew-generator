import type { Metadata, Viewport } from 'next'
import type { ReactNode } from 'react'
import { ServiceWorker } from './ServiceWorker'
import './globals.css'

/** Next prefixes <Link> and asset imports automatically; metadata URLs it does not. */
const base = process.env.NEXT_PUBLIC_BASE_PATH ?? ''

export const metadata: Metadata = {
  title: {
    default: 'Extraction — manual brew companion',
    template: '%s · Extraction',
  },
  description:
    'Guided manual brewing, a brew log that reads itself, and a referenced specialty coffee knowledge base.',
  applicationName: 'Extraction',
  appleWebApp: { capable: true, title: 'Extraction', statusBarStyle: 'black-translucent' },
  manifest: `${base}/manifest.webmanifest`,
  icons: {
    icon: `${base}/icon.svg`,
    apple: `${base}/icon.svg`,
  },
}

export const viewport: Viewport = {
  themeColor: '#1b1809',
  width: 'device-width',
  initialScale: 1,
  // Kitchen use: allow zoom. Never trap a user who needs larger text.
  maximumScale: 5,
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-dvh">
        {children}
        <ServiceWorker />
      </body>
    </html>
  )
}
