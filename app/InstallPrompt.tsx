'use client'

import { useEffect, useState } from 'react'

/**
 * Install to home screen.
 *
 * Chromium fires `beforeinstallprompt` and lets us trigger the real dialog.
 * iOS Safari has no such API — installing is Share → Add to Home Screen and
 * nothing can automate it — so that platform gets instructions instead of a
 * button that could not work.
 *
 * Dismissal is remembered, because an install banner you have already refused
 * is nagging.
 */

type InstallEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const DISMISSED_KEY = 'extraction:install-dismissed'

function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    // iOS reports installation here rather than through display-mode.
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

function isIos(): boolean {
  const ua = navigator.userAgent
  return /iPad|iPhone|iPod/.test(ua) || (ua.includes('Mac') && 'ontouchend' in document)
}

export function InstallPrompt() {
  const [event, setEvent] = useState<InstallEvent | null>(null)
  const [showIosHelp, setShowIosHelp] = useState(false)
  const [dismissed, setDismissed] = useState(true)

  useEffect(() => {
    // Already installed: there is nothing to offer.
    if (isStandalone()) return

    let previouslyDismissed = false
    try {
      previouslyDismissed = localStorage.getItem(DISMISSED_KEY) === '1'
    } catch {
      /* Private mode. Showing the prompt once is better than crashing. */
    }
    if (previouslyDismissed) return

    setDismissed(false)

    // iOS never fires the event, so offer the instructions directly.
    if (isIos()) {
      setShowIosHelp(true)
      return
    }

    const onPrompt = (e: Event) => {
      // Chrome would otherwise show its own mini-infobar.
      e.preventDefault()
      setEvent(e as InstallEvent)
    }
    window.addEventListener('beforeinstallprompt', onPrompt)

    const onInstalled = () => {
      setEvent(null)
      setShowIosHelp(false)
    }
    window.addEventListener('appinstalled', onInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  function close() {
    setEvent(null)
    setShowIosHelp(false)
    setDismissed(true)
    try {
      localStorage.setItem(DISMISSED_KEY, '1')
    } catch {
      /* Nothing to do; it will simply ask again next time. */
    }
  }

  async function install() {
    if (!event) return
    await event.prompt()
    await event.userChoice
    setEvent(null)
  }

  if (dismissed || (!event && !showIosHelp)) return null

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 p-3">
      <div className="mx-auto max-w-md rounded-lg border-2 border-[var(--color-line-strong)] bg-[var(--color-raised)] p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-medium">Install Extraction</p>
            <p className="mt-1 text-sm text-[var(--color-muted)]">
              {showIosHelp
                ? 'Add it to your home screen and it runs full screen, works offline, and keeps its own storage.'
                : 'Runs full screen, works offline, and keeps your journal on this device.'}
            </p>
          </div>
          <button
            type="button"
            onClick={close}
            aria-label="Dismiss install prompt"
            className="compact shrink-0 rounded-full px-3 text-[var(--color-muted)]"
          >
            ✕
          </button>
        </div>

        {showIosHelp ? (
          <ol className="mt-3 space-y-1 text-sm text-[var(--color-muted)]">
            <li>
              1. Tap <span className="text-[var(--color-ink)]">Share</span> in the Safari toolbar
            </li>
            <li>
              2. Choose <span className="text-[var(--color-ink)]">Add to Home Screen</span>
            </li>
            <li>
              3. Tap <span className="text-[var(--color-ink)]">Add</span>
            </li>
          </ol>
        ) : (
          <button
            type="button"
            onClick={install}
            className="mt-3 w-full rounded-lg bg-[var(--color-accent)] py-3 font-semibold text-[var(--color-on-accent)]"
          >
            Install
          </button>
        )}
      </div>
    </div>
  )
}
