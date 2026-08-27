/**
 * Brew session — PRD F1 R6.
 *
 * The entire session is a plain serialisable object. Persist it on every tick,
 * restore it after a reload or a suspension, and nothing is lost: elapsed time
 * comes from the timer's start stamp and everything else is derived.
 *
 * There is no interval, no accumulator, and no mutable clock anywhere here.
 */

import type { CompiledRecipe, TimedStep } from './steps'
import { stepIndexAt, targetFlowAt, targetMassAt } from './steps'
import { type TimerState, elapsedMs, isPaused, pause, resume, rewind, start, stop } from './timer'

export type SessionPhase = 'prep' | 'brewing' | 'paused' | 'done'

export type Session = {
  recipeId: string
  /** Null until prep is finished and the brew actually starts. */
  timer: TimerState | null
  prepIndex: number
  /** Steps the user advanced early, so a user-terminated drain can end sooner. */
  manualAdvanceAtS: number[]
  actual: { doseG?: number; waterG?: number; beverageG?: number }
  startedAtEpoch?: number
  /**
   * Which bag is being brewed. Chosen before the timer starts, carried into the
   * log sheet, and persisted with the session so a resume keeps it.
   */
  beanId?: string
}

export function newSession(recipeId: string): Session {
  return { recipeId, timer: null, prepIndex: 0, manualAdvanceAtS: [], actual: {} }
}

export function chooseBean(s: Session, beanId: string | undefined): Session {
  if (!beanId) {
    const { beanId: _drop, ...rest } = s
    return rest as Session
  }
  return { ...s, beanId }
}

export function advancePrep(s: Session, prepCount: number): Session {
  return { ...s, prepIndex: Math.min(s.prepIndex + 1, prepCount) }
}

export function prepComplete(s: Session, prepCount: number): boolean {
  return s.prepIndex >= prepCount
}

export function beginBrew(s: Session, now: number): Session {
  if (s.timer) return s
  return { ...s, timer: start(now), startedAtEpoch: now }
}

export function pauseBrew(s: Session, now: number): Session {
  return s.timer ? { ...s, timer: pause(s.timer, now) } : s
}

export function resumeBrew(s: Session, now: number): Session {
  return s.timer ? { ...s, timer: resume(s.timer, now) } : s
}

export function finishBrew(s: Session, now: number): Session {
  return s.timer ? { ...s, timer: stop(s.timer, now) } : s
}

/** Rewind one step (PRD F1 R6), by shifting the timer's start stamp. */
export function rewindStep(s: Session, c: CompiledRecipe, now: number): Session {
  if (!s.timer) return s
  const t = elapsedS(s, now)
  const i = stepIndexAt(c, t)
  if (i <= 0) return s
  const target = c.steps[i - 1]!.startS
  // rewind() takes a positive "go back by" amount.
  return { ...s, timer: rewind(s.timer, (t - target) * 1000) }
}

/**
 * Advance past a user-terminated step early. Recorded rather than applied, so
 * elapsed time stays derived from the clock.
 */
export function advanceStep(s: Session, c: CompiledRecipe, now: number): Session {
  const t = elapsedS(s, now)
  const i = stepIndexAt(c, t)
  if (i < 0) return s
  return { ...s, manualAdvanceAtS: [...s.manualAdvanceAtS, t] }
}

export function elapsedS(s: Session, now: number): number {
  return s.timer ? elapsedMs(s.timer, now) / 1000 : 0
}

export function phaseOf(s: Session, c: CompiledRecipe, now: number): SessionPhase {
  if (!s.timer) return prepComplete(s, c.prep.length) ? 'brewing' : 'prep'
  if (s.timer.stoppedAt !== undefined) return 'done'
  if (isPaused(s.timer)) return 'paused'
  return 'brewing'
}

export type SessionView = {
  phase: SessionPhase
  elapsedS: number
  /** Current prep step, when in the prep phase. */
  prep?: CompiledRecipe['prep'][number]
  step?: TimedStep
  nextStep?: TimedStep
  /** Grams that should be on the scale right now. */
  targetMassG: number
  /** Grams per second the user should be pouring, 0 when not pouring. */
  targetFlowGPerS: number
  /** 0..1 through the current step. */
  stepProgress: number
  /** 0..1 through the whole brew. */
  brewProgress: number
  /** Seconds until the current step ends; negative once overrun. */
  secondsToStepEnd: number
  isLastStep: boolean
}

export function viewOf(s: Session, c: CompiledRecipe, now: number): SessionView {
  const phase = phaseOf(s, c, now)

  if (phase === 'prep') {
    return {
      phase,
      elapsedS: 0,
      prep: c.prep[s.prepIndex],
      step: c.steps[0],
      targetMassG: 0,
      targetFlowGPerS: 0,
      stepProgress: 0,
      brewProgress: 0,
      secondsToStepEnd: c.steps[0]?.durationS ?? 0,
      isLastStep: c.steps.length <= 1,
    }
  }

  const t = elapsedS(s, now)
  const i = stepIndexAt(c, t)
  const step = i >= 0 ? c.steps[i] : undefined

  return {
    phase,
    elapsedS: t,
    step,
    nextStep: i >= 0 ? c.steps[i + 1] : undefined,
    targetMassG: targetMassAt(c, t),
    targetFlowGPerS: targetFlowAt(c, t),
    stepProgress:
      step && step.durationS > 0
        ? Math.min(1, Math.max(0, (t - step.startS) / step.durationS))
        : step
          ? 1
          : 0,
    brewProgress: c.totalS > 0 ? Math.min(1, t / c.totalS) : 0,
    secondsToStepEnd: step ? step.endS - t : 0,
    isLastStep: i >= 0 && i === c.steps.length - 1,
  }
}

/** Tolerance band for the live mass target, PRD F1 R2. */
export const MASS_TOLERANCE_G = 3

export type PourStatus = 'ahead' | 'behind' | 'onTarget' | 'notPouring'

export function pourStatus(view: SessionView, actualG: number | undefined): PourStatus {
  if (actualG === undefined || !view.step?.pouring) return 'notPouring'
  const delta = actualG - view.targetMassG
  if (delta > MASS_TOLERANCE_G) return 'ahead'
  if (delta < -MASS_TOLERANCE_G) return 'behind'
  return 'onTarget'
}
