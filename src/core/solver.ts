import { CONCEPT_IDS, RECEIVERS, type ConceptId, type LookupTables, type ReceiverId } from './types'
import { feedbackFor, filterCandidates, outcomeFor, scoringPlays } from './tables'

export interface PlayChoice { concept: ConceptId; target: ReceiverId }

export interface ShellMetrics {
  blindScoreRate: number
  scoringPlayCount: number
  survivorsAfterOne: number
  preSnapGuaranteed: boolean
  convertible: number
  par: number
  passed: boolean
  failures: string[]
}

export function allPlays(concepts: readonly ConceptId[] = CONCEPT_IDS): PlayChoice[] {
  return concepts.flatMap((concept) => RECEIVERS.map((target) => ({ concept, target })))
}

function bucketKey(tables: LookupTables, shellId: string, play: PlayChoice): string {
  const feedback = feedbackFor(tables, shellId, play.concept, play.target)
  return `${feedback.observationSignature}::${feedback.outcome}`
}

export function chooseProbe(tables: LookupTables, candidates: string[], concepts: readonly ConceptId[] = CONCEPT_IDS): PlayChoice {
  let best = allPlays(concepts)[0]
  let bestWorst = Number.POSITIVE_INFINITY
  let bestKinds = -1
  for (const play of allPlays(concepts)) {
    const buckets = new Map<string, number>()
    for (const shellId of candidates) {
      const key = bucketKey(tables, shellId, play)
      buckets.set(key, (buckets.get(key) ?? 0) + 1)
    }
    const worst = Math.max(...buckets.values())
    if (worst < bestWorst || (worst === bestWorst && buckets.size > bestKinds)) {
      best = play
      bestWorst = worst
      bestKinds = buckets.size
    }
  }
  return best
}

export function referenceScore(tables: LookupTables, trueShell: string, firstPlay: PlayChoice, concepts: readonly ConceptId[] = CONCEPT_IDS): number {
  let candidates = [...tables.shells]
  let play = firstPlay
  for (let snap = 1; snap <= 4; snap += 1) {
    const outcome = outcomeFor(tables, trueShell, play.concept, play.target)
    if (outcome.kind === 'touchdown') return snap
    candidates = filterCandidates(tables, candidates, play.concept, play.target, feedbackFor(tables, trueShell, play.concept, play.target))
    const guaranteed = scoringPlays(tables, candidates, concepts)[0]
    if (guaranteed) {
      const split = guaranteed.lastIndexOf(':')
      play = { concept: guaranteed.slice(0, split) as ConceptId, target: guaranteed.slice(split + 1) as ReceiverId }
    } else {
      play = chooseProbe(tables, candidates, concepts)
    }
  }
  return 5
}

export function measureShell(tables: LookupTables, shellId: string, concepts: readonly ConceptId[] = CONCEPT_IDS): ShellMetrics {
  const plays = allPlays(concepts)
  const scoringPlayCount = plays.filter((play) => outcomeFor(tables, shellId, play.concept, play.target).kind === 'touchdown').length
  const survivors = plays.map((play) => filterCandidates(
    tables,
    tables.shells,
    play.concept,
    play.target,
    feedbackFor(tables, shellId, play.concept, play.target),
  ))
  const survivorsAfterOne = Math.max(...survivors.map((items) => items.length))
  const convertibleCount = survivors.filter((items, index) => {
    const play = plays[index]
    return outcomeFor(tables, shellId, play.concept, play.target).kind === 'touchdown' || scoringPlays(tables, items, concepts).length > 0
  }).length
  const par = Math.max(...plays.map((play) => referenceScore(tables, shellId, play, concepts)))
  const preSnapGuaranteed = scoringPlays(tables, tables.shells, concepts).length > 0
  const blindScoreRate = scoringPlayCount / plays.length
  const convertible = convertibleCount / plays.length
  const failures: string[] = []
  if (preSnapGuaranteed) failures.push('pre-snap-guaranteed')
  if (blindScoreRate < 0.05 || blindScoreRate > 0.15) failures.push('blind-score-rate')
  if (survivorsAfterOne < 3 || survivorsAfterOne > 8) failures.push('survivors-after-one')
  if (convertible < 0.9) failures.push('convertible')
  if (par > 3) failures.push('par')
  return { blindScoreRate, scoringPlayCount, survivorsAfterOne, preSnapGuaranteed, convertible, par, passed: failures.length === 0, failures }
}
