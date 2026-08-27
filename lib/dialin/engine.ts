/**
 * Dial-in engine — PRD 9.2, F4.3.
 *
 * Emits exactly ONE change, phrased in the user's own grinder units, with a
 * falsifiable prediction and a mandatory link to the mechanism that explains it.
 * Expert mode gets the full ranking; everyone else gets one action.
 */

import {
  type Evidence,
  HYPOTHESES,
  type Hypothesis,
  type HypothesisId,
  RULES,
  type Rule,
} from './rules'

export type GrinderRef = {
  name: string
  /** What this grinder's adjustment is called: clicks, steps, numbers. */
  unitLabel: string
  /** Microns per unit, if credibly known. PRD F6 — never presented as exact. */
  micronsPerUnit?: number
  /** The user's own baseline setting for this method, if they have set one. */
  baseline?: number
}

export type Attempt = { hypothesis: HypothesisId; outcome: 'better' | 'worse' | 'same' }

export type Ranked = {
  hypothesis: Hypothesis
  score: number
  firedRules: Rule[]
  excluded?: 'exhausted' | 'madeItWorse'
}

export type Recommendation = {
  hypothesis: Hypothesis
  /** The one thing to do, in the user's units. */
  action: string
  prediction: string
  mechanismCardId: string
  confidence: 'low' | 'medium' | 'high'
  reasoning: string[]
  /** Full ranking, for expert mode (PRD F4 R5). */
  ranking: Ranked[]
}

/** PRD F4.4: three consecutive no-change results must escalate elsewhere. */
const CONSECUTIVE_SAME_TO_EXHAUST = 3

function exhaustedHypotheses(history: Attempt[]): Set<HypothesisId> {
  const out = new Set<HypothesisId>()

  // A hypothesis that made things worse is done, immediately.
  for (const a of history) {
    if (a.outcome === 'worse') out.add(a.hypothesis)
  }

  // Trailing run of 'same' on one hypothesis: stop repeating it.
  let run = 0
  let runId: HypothesisId | undefined
  for (let i = history.length - 1; i >= 0; i--) {
    const a = history[i]!
    if (a.outcome !== 'same') break
    if (runId === undefined) runId = a.hypothesis
    if (a.hypothesis !== runId) break
    run++
  }
  if (runId !== undefined && run >= CONSECUTIVE_SAME_TO_EXHAUST) out.add(runId)

  return out
}

/** Round a micron delta into whole grinder units, with the uncertainty shown. */
function grindAction(h: Hypothesis, grinder: GrinderRef): string {
  if (h.lever.kind !== 'grind') throw new Error('grindAction called for a non-grind lever')
  const dir = h.lever.direction

  if (grinder.micronsPerUnit && grinder.micronsPerUnit > 0) {
    const units = Math.max(1, Math.round(h.lever.micronDelta / grinder.micronsPerUnit))
    const approx = units * grinder.micronsPerUnit
    return `Grind ${units} ${grinder.unitLabel}${units === 1 ? '' : ''} ${dir} on your ${grinder.name} (about ${approx} µm).`
  }
  // No credible micron figure: stay in relative terms rather than invent one.
  return `Grind 2-3 ${grinder.unitLabel} ${dir} on your ${grinder.name}.`
}

function actionFor(h: Hypothesis, grinder: GrinderRef): string {
  switch (h.lever.kind) {
    case 'grind':
      return grindAction(h, grinder)
    case 'ratio':
      return h.lever.direction === 'tighter'
        ? `Use more coffee per litre — tighten the ratio by about 1:${h.lever.deltaRatio} (same grind, same time).`
        : `Use less coffee per litre — loosen the ratio by about 1:${h.lever.deltaRatio} (same grind, same time).`
    case 'temp':
      return h.lever.deltaC > 0
        ? `Raise the water temperature by ${h.lever.deltaC} °C.`
        : `Lower the water temperature by ${Math.abs(h.lever.deltaC)} °C.`
    case 'technique':
      return h.lever.instruction
    case 'agitation':
      return h.lever.direction === 'less'
        ? 'Agitate less: skip the stir, pour more gently, and let the bed settle on its own.'
        : 'Agitate a little more: one gentle swirl after the bloom.'
    case 'wait':
      return `Rest the coffee ${h.lever.days} more days before dialling in again.`
    case 'replace':
      return `Change ${h.lever.what}.`
    case 'water':
      return h.lever.instruction
  }
}

function confidenceOf(top: Ranked, runnerUp: Ranked | undefined): 'low' | 'medium' | 'high' {
  if (top.score >= 10 && (!runnerUp || top.score - runnerUp.score >= 4)) return 'high'
  if (!runnerUp || top.score - runnerUp.score >= 2) return 'medium'
  return 'low'
}

export function diagnose(input: {
  evidence: Evidence
  grinder: GrinderRef
  history?: Attempt[]
}): Recommendation {
  const history = input.history ?? []
  const exhausted = exhaustedHypotheses(history)

  const scores = new Map<HypothesisId, { score: number; firedRules: Rule[] }>()
  for (const rule of RULES) {
    if (!rule.when(input.evidence)) continue
    const cur = scores.get(rule.hypothesis) ?? { score: 0, firedRules: [] }
    cur.score += rule.weight
    cur.firedRules.push(rule)
    scores.set(rule.hypothesis, cur)
  }

  const ranking: Ranked[] = [...scores.entries()]
    .map(([id, v]) => {
      const wasWorse = history.some((a) => a.hypothesis === id && a.outcome === 'worse')
      const ranked: Ranked = {
        hypothesis: HYPOTHESES[id],
        score: v.score,
        firedRules: v.firedRules,
      }
      if (exhausted.has(id)) ranked.excluded = wasWorse ? 'madeItWorse' : 'exhausted'
      return ranked
    })
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score
      // PRD 9.2 step 3: on a tie, prefer the cheapest, most reversible action.
      return a.hypothesis.cost - b.hypothesis.cost
    })

  const viable = ranking.filter((r) => !r.excluded)
  if (viable.length === 0) {
    throw new Error(
      'No viable hypothesis for this evidence. Widen the rule set or collect more evidence.',
    )
  }

  const top = viable[0]!
  return {
    hypothesis: top.hypothesis,
    action: actionFor(top.hypothesis, input.grinder),
    prediction: top.hypothesis.prediction,
    mechanismCardId: top.hypothesis.mechanismCardId,
    confidence: confidenceOf(top, viable[1]),
    reasoning: top.firedRules.map((r) => r.why),
    ranking,
  }
}
