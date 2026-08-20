import { playKey } from './concepts'
import type { ConceptId, Feedback, LookupTables, PlayOutcome, ReceiverId } from './types'

export function outcomeFor(tables: LookupTables, shellId: string, concept: ConceptId, target: ReceiverId): PlayOutcome {
  const outcome = tables.outcomes[shellId]?.[playKey(concept, target)]
  if (!outcome) throw new Error(`No table outcome for ${shellId}/${concept}/${target}`)
  return outcome
}

export function feedbackFor(tables: LookupTables, shellId: string, concept: ConceptId, target: ReceiverId): Feedback {
  return { observationSignature: tables.observations[shellId][concept].signature, outcome: outcomeFor(tables, shellId, concept, target).kind }
}

export function filterCandidates(tables: LookupTables, candidates: string[], concept: ConceptId, target: ReceiverId, feedback: Feedback): string[] {
  return candidates.filter((shellId) => {
    const candidate = feedbackFor(tables, shellId, concept, target)
    return candidate.observationSignature === feedback.observationSignature && candidate.outcome === feedback.outcome
  })
}

export function scoringPlays(tables: LookupTables, candidates: string[], concepts: readonly ConceptId[]): string[] {
  if (candidates.length === 0) return []
  return concepts.flatMap((concept) => ['X', 'Z', 'S', 'Y', 'R'].map((target) => playKey(concept, target as ReceiverId)))
    .filter((key) => candidates.every((shellId) => tables.outcomes[shellId][key].kind === 'touchdown'))
}
