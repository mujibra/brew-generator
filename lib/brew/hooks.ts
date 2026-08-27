'use client'

import { browserCapabilities } from '@/lib/capability/browser'
import { useEffect, useRef, useState } from 'react'
import type { Session } from './session'

/**
 * A clock that ticks the UI. It does NOT hold elapsed time — that is always
 * derived from the session's start stamp. This only decides how often to
 * re-render, so losing ticks costs nothing but smoothness.
 */
export function useNow(active: boolean, intervalMs = 250): number {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (!active) return
    // setInterval, not requestAnimationFrame: the timer's truth is the start
    // stamp, so a dropped or throttled tick costs nothing but smoothness. A rAF
    // loop pins the renderer for a display refresh we do not need.
    const id = setInterval(() => setNow(Date.now()), intervalMs)

    // Background tabs throttle timers hard, so resync the moment we are visible.
    const onVisible = () => setNow(Date.now())
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [active, intervalMs])

  return now
}

/** Keep the screen awake while brewing (PRD F1 R4). Silent no-op if unsupported. */
export function useWakeLock(active: boolean): void {
  useEffect(() => {
    if (!active || !browserCapabilities.wakeLock.check().available) return
    let release: (() => void) | undefined
    let cancelled = false

    browserCapabilities.wakeLock
      .request()
      .then((r) => {
        if (cancelled) r()
        else release = r
      })
      .catch(() => {
        /* Not fatal: the brew still works, the screen just sleeps. */
      })

    // The lock is dropped when the tab is hidden; re-acquire on return.
    const reacquire = () => {
      if (document.visibilityState === 'visible' && !release) {
        browserCapabilities.wakeLock
          .request()
          .then((r) => {
            release = r
          })
          .catch(() => {})
      }
    }
    document.addEventListener('visibilitychange', reacquire)

    return () => {
      cancelled = true
      release?.()
      document.removeEventListener('visibilitychange', reacquire)
    }
  }, [active])
}

const STORAGE_KEY = 'extraction:session'

/**
 * Persist the in-progress brew (PRD F1 R6). The session is a small plain object,
 * so this is one JSON write per tick and a refresh loses nothing.
 *
 * ponytail: localStorage, not the repository. This is ephemeral UI state, not a
 * record — the finished brew is what gets written to the journal.
 */
export function persistSession(s: Session | null): void {
  try {
    if (s === null) localStorage.removeItem(STORAGE_KEY)
    else localStorage.setItem(STORAGE_KEY, JSON.stringify(s))
  } catch {
    /* Private mode or a full quota. Losing resume is survivable; crashing is not. */
  }
}

export function loadSession(recipeId: string): Session | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const s = JSON.parse(raw) as Session
    return s.recipeId === recipeId ? s : null
  } catch {
    return null
  }
}

/** Step-boundary cues (PRD F1 R3). Audio always; haptics where they exist. */
export function useStepCue(stepIndex: number | undefined, enabled: boolean): void {
  const previous = useRef<number | undefined>(undefined)

  useEffect(() => {
    if (!enabled || stepIndex === undefined) {
      previous.current = stepIndex
      return
    }
    if (previous.current !== undefined && previous.current !== stepIndex) {
      browserCapabilities.haptics.stepBoundary()
      beep()
    }
    previous.current = stepIndex
  }, [stepIndex, enabled])
}

function beep(): void {
  try {
    const Ctx =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (!Ctx) return
    const ctx = new Ctx()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.frequency.value = 880
    gain.gain.value = 0.08
    osc.connect(gain).connect(ctx.destination)
    osc.start()
    osc.stop(ctx.currentTime + 0.12)
    osc.onended = () => void ctx.close()
  } catch {
    /* Audio blocked before a user gesture. Visual state is always complete. */
  }
}
