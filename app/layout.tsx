import type { Metadata, Viewport } from 'next'
import { Outfit } from 'next/font/google'
import type { ReactNode } from 'react'
import { InstallPrompt } from './InstallPrompt'
import { ServiceWorker } from './ServiceWorker'
import './globals.css'

/*
 * Outfit: geometric, so its letterforms echo the rectangles the interface is
 * built from. Self-hosted at build time by next/font, which keeps the static
 * export offline-capable — a runtime request to fonts.googleapis.com would
 * fail on a phone in a kitchen with no signal.
 */
const outfit = Outfit({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-outfit',
  display: 'swap',
})

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
    icon: [
      { url: `${base}/icon.svg`, type: 'image/svg+xml' },
      { url: `${base}/icon-192.png`, sizes: '192x192', type: 'image/png' },
      { url: `${base}/icon-512.png`, sizes: '512x512', type: 'image/png' },
    ],
    // iOS ignores the manifest and reads this. It must be PNG and opaque.
    apple: [{ url: `${base}/apple-touch-icon.png`, sizes: '180x180', type: 'image/png' }],
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
    <html lang="en" className={outfit.variable}>
      <body className="min-h-dvh">
        {children}
        <ServiceWorker />
        <InstallPrompt />
      </body>
    </html>
  )
}
