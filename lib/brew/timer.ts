/**
 * Brew timer — PRD 12 hard requirement, F1 R6.
 *
 * Elapsed time is DERIVED from a persisted wall-clock start stamp. It is never
 * accumulated from ticks, because iOS suspends backgrounded JavaScript and a
 * tick-accumulating timer silently loses the suspended interval.
 *
 * The whole state is a plain serialisable object, so persisting it every tick
 * and restoring it after a reload, tab discard, or app suspension is trivial.
 * Rendering reads `elapsedMs(state, Date.now())`; nothing mutates on a tick.
 */

export type TimerState = {
  /** Epoch ms when the brew started. */
  startedAt: number
  /** Total ms spent paused across all previous pauses. */
  pausedTotalMs: number
  /** Epoch ms of the current pause, if paused right now. */
  pausedAt?: number
  /** Epoch ms when the brew was stopped, if it has been. */
  stoppedAt?: number
}

export function start(now: number): TimerState {
  return { startedAt: now, pausedTotalMs: 0 }
}

export function isPaused(s: TimerState): boolean {
  return s.pausedAt !== undefined && s.stoppedAt === undefined
}

export function isRunning(s: TimerState): boolean {
  return s.stoppedAt === undefined && s.pausedAt === undefined
}

export function elapsedMs(s: TimerState, now: number): number {
  const end = s.stoppedAt ?? s.pausedAt ?? now
  return Math.max(0, end - s.startedAt - s.pausedTotalMs)
}

export function pause(s: TimerState, now: number): TimerState {
  if (!isRunning(s)) return s
  return { ...s, pausedAt: now }
}

export function resume(s: TimerState, now: number): TimerState {
  if (s.pausedAt === undefined || s.stoppedAt !== undefined) return s
  const { pausedAt, ...rest } = s
  return { ...rest, pausedTotalMs: s.pausedTotalMs + (now - pausedAt) }
}

export function stop(s: TimerState, now: number): TimerState {
  if (s.stoppedAt !== undefined) return s
  // Stopping while paused: close the pause first so elapsed time freezes where
  // the user last saw it, rather than jumping forward by the pause length.
  const closed = isPaused(s) ? resume(s, now) : s
  return { ...closed, stoppedAt: now }
}

/**
 * Rewind by a whole step (PRD F1 R6) — shifts the start stamp forward, which
 * keeps elapsed time derived rather than stored.
 */
export function rewind(s: TimerState, ms: number): TimerState {
  if (ms < 0) throw new RangeError('rewind must be >= 0')
  return { ...s, startedAt: s.startedAt + ms }
}

export function formatElapsed(ms: number): string {
  const total = Math.floor(ms / 1000)
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${String(s).padStart(2, '0')}`
}
