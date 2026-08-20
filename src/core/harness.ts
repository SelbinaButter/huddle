import { feedbackFor, outcomeFor } from './tables'
import type { ConceptId, LookupTables, ReceiverId } from './types'

export interface HarnessInput { shellId: string; concept: ConceptId; target: ReceiverId }

export function runLookupHarness(tables: LookupTables, inputs: HarnessInput[]) {
  return inputs.map((input) => ({
    feedback: feedbackFor(tables, input.shellId, input.concept, input.target),
    outcome: outcomeFor(tables, input.shellId, input.concept, input.target),
  }))
}
