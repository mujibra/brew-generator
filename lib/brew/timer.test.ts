import { describe, expect, it } from 'vitest'
import {
  elapsedMs,
  formatElapsed,
  isPaused,
  isRunning,
  pause,
  resume,
  rewind,
  start,
  stop,
} from './timer'

const T0 = 1_800_000_000_000 // fixed epoch, no Date.now() in tests

describe('timer', () => {
  it('derives elapsed time from the start stamp, not from ticks', () => {
    const s = start(T0)
    expect(elapsedMs(s, T0)).toBe(0)
    expect(elapsedMs(s, T0 + 5000)).toBe(5000)
    expect(elapsedMs(s, T0 + 210_000)).toBe(210_000)
  })

  // PRD 12: the whole reason the timer is shaped this way.
  it('loses nothing when the app is suspended for minutes', () => {
    const s = start(T0)
    // No ticks happen at all between T0 and T0 + 10 minutes.
    expect(elapsedMs(s, T0 + 600_000)).toBe(600_000)
  })

  it('survives a serialise/restore round trip', () => {
    const s = start(T0)
    const restored = JSON.parse(JSON.stringify(s))
    expect(elapsedMs(restored, T0 + 42_000)).toBe(42_000)
  })

  it('freezes while paused and continues from there on resume', () => {
    let s = start(T0)
    s = pause(s, T0 + 30_000)
    expect(isPaused(s)).toBe(true)
    expect(isRunning(s)).toBe(false)
    // Time passing while paused must not count.
    expect(elapsedMs(s, T0 + 30_000)).toBe(30_000)
    expect(elapsedMs(s, T0 + 90_000)).toBe(30_000)

    s = resume(s, T0 + 90_000)
    expect(isRunning(s)).toBe(true)
    expect(elapsedMs(s, T0 + 90_000)).toBe(30_000)
    expect(elapsedMs(s, T0 + 100_000)).toBe(40_000)
  })

  it('handles several pauses', () => {
    let s = start(T0)
    s = pause(s, T0 + 10_000)
    s = resume(s, T0 + 20_000)
    s = pause(s, T0 + 30_000)
    s = resume(s, T0 + 60_000)
    // 10s + 10s of real running, 40s of pause
    expect(elapsedMs(s, T0 + 60_000)).toBe(20_000)
  })

  it('stops and stays stopped', () => {
    let s = start(T0)
    s = stop(s, T0 + 180_000)
    expect(elapsedMs(s, T0 + 999_999)).toBe(180_000)
    expect(isRunning(s)).toBe(false)
    expect(stop(s, T0 + 200_000)).toBe(s)
  })

  it('does not jump forward when stopped while paused', () => {
    let s = start(T0)
    s = pause(s, T0 + 30_000)
    s = stop(s, T0 + 300_000)
    expect(elapsedMs(s, T0 + 400_000)).toBe(30_000)
  })

  it('ignores pause on a stopped timer and resume on a running one', () => {
    const stopped = stop(start(T0), T0 + 1000)
    expect(pause(stopped, T0 + 2000)).toBe(stopped)
    const running = start(T0)
    expect(resume(running, T0 + 1000)).toBe(running)
  })

  it('rewinds by shifting the start stamp', () => {
    const s = rewind(start(T0), 30_000)
    expect(elapsedMs(s, T0 + 60_000)).toBe(30_000)
  })

  it('never reports negative elapsed time', () => {
    const s = rewind(start(T0), 60_000)
    expect(elapsedMs(s, T0 + 10_000)).toBe(0)
  })

  it('rejects a negative rewind', () => {
    expect(() => rewind(start(T0), -1)).toThrow(RangeError)
  })
})

describe('formatElapsed', () => {
  it('formats as m:ss', () => {
    expect(formatElapsed(0)).toBe('0:00')
    expect(formatElapsed(9_000)).toBe('0:09')
    expect(formatElapsed(65_000)).toBe('1:05')
    expect(formatElapsed(210_000)).toBe('3:30')
    expect(formatElapsed(3_600_000)).toBe('60:00')
  })

  it('truncates rather than rounds, so the display never runs ahead', () => {
    expect(formatElapsed(1999)).toBe('0:01')
  })
})
