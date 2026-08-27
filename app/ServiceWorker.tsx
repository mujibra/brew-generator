'use client'

import { useEffect, useState } from 'react'

/**
 * Registers the service worker and reports the two states a user actually cares
 * about: you are offline, and a new version is ready.
 *
 * Nothing here blocks the app. If registration fails the app still works, it
 * just is not offline-capable — and we say so rather than pretending.
 */
export function ServiceWorker() {
  const [offline, setOffline] = useState(false)
  const [updateReady, setUpdateReady] = useState(false)

  useEffect(() => {
    setOffline(!navigator.onLine)
    const goOffline = () => setOffline(true)
    const goOnline = () => setOffline(false)
    window.addEventListener('offline', goOffline)
    window.addEventListener('online', goOnline)

    let cancelled = false
    if ('serviceWorker' in navigator) {
      // The worker lives beside the app, which is under a base path on Pages.
      const base = process.env.NEXT_PUBLIC_BASE_PATH ?? ''
      navigator.serviceWorker
        .register(`${base}/sw.js`, { scope: `${base}/` })
        .then((reg) => {
          if (cancelled) return
          // A worker already waiting means a newer build is sitting there.
          if (reg.waiting) setUpdateReady(true)
          reg.addEventListener('updatefound', () => {
            const incoming = reg.installing
            incoming?.addEventListener('statechange', () => {
              // Only an update if something was already serving this app.
              if (incoming.state === 'installed' && navigator.serviceWorker.controller) {
                setUpdateReady(true)
              }
            })
          })
        })
        .catch(() => {
          /* No offline support. Not fatal, and not worth a dialog. */
        })
    }

    return () => {
      cancelled = true
      window.removeEventListener('offline', goOffline)
      window.removeEventListener('online', goOnline)
    }
  }, [])

  if (!offline && !updateReady) return null

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center p-3">
      {offline ? (
        <p className="rounded-full border border-[var(--color-line)] bg-[var(--color-raised)] px-4 py-2 text-sm text-[var(--color-muted)] shadow-lg">
          Offline — everything still works
        </p>
      ) : (
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="pointer-events-auto compact rounded-full bg-[var(--color-accent)] px-5 text-sm font-semibold text-[var(--color-on-accent)] shadow-lg"
        >
          New version ready — reload
        </button>
      )}
    </div>
  )
}
