import type { NextConfig } from 'next'

/**
 * Static export is a hard constraint, not a preference.
 *
 * The `out/` directory this produces is exactly what Capacitor's `webDir`
 * consumes at Phase 2 (PRD 18.3). Adding any server-only Next feature —
 * route handlers, middleware, ISR, the image optimizer — breaks the native
 * shell. Sync (PRD 12) is a separate API service, never a route handler here.
 */

/**
 * GitHub Pages serves a project repo from /<repo>/, so the app needs a base
 * path there. It stays empty everywhere else — local dev, Cloudflare/Vercel,
 * and the Capacitor shell all serve from the root and MUST NOT be prefixed.
 */
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? ''

const nextConfig: NextConfig = {
  output: 'export',
  images: { unoptimized: true },
  trailingSlash: true, // file:// origins in the Capacitor shell need directory-style URLs
  reactStrictMode: true,
  ...(basePath ? { basePath, assetPrefix: basePath } : {}),
}

export default nextConfig
