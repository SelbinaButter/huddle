export const RECEIVERS = ['X', 'Z', 'S', 'Y', 'R'] as const
export type ReceiverId = (typeof RECEIVERS)[number]

export const CONCEPT_IDS = ['four-verts', 'mesh', 'flood', 'smash', 'levels', 'stick', 'slant-flat', 'y-cross'] as const
export type ConceptId = (typeof CONCEPT_IDS)[number]

export const BASE_SHELLS = ['cover-0', 'cover-1', 'cover-2', 'cover-3', 'cover-4', 'cover-6', 'tampa-2', 'man-2'] as const
export type BaseShell = (typeof BASE_SHELLS)[number]
export type Rotation = 'field' | 'boundary'
export type Blitzer = 'none' | 'N' | 'M' | 'W'
export type Leverage = 'inside' | 'outside'

export const COVERAGE_DEFENDERS = ['LC', 'RC', 'N', 'M', 'W', 'FS', 'SS'] as const
export type CoverageDefenderId = (typeof COVERAGE_DEFENDERS)[number]
export type DefenderId = CoverageDefenderId | 'EDGE-L' | 'DT-L' | 'DT-R' | 'EDGE-R'

export interface Vec2 { x: number; y: number }

export interface Route {
  receiver: ReceiverId
  name: string
  points: Vec2[]
}

export interface Concept {
  id: ConceptId
  name: string
  prompt: string
  routes: Route[]
}

export interface Shell {
  id: string
  base: BaseShell
  rotation: Rotation
  blitzer: Blitzer
  leftLeverage: Leverage
  rightLeverage: Leverage
}

export type ZoneId = 'deep-left' | 'deep-middle' | 'deep-right' | 'half-left' | 'half-right' | 'flat-left' | 'flat-right' | 'hook-left' | 'hook-middle' | 'hook-right' | 'robber'

export type Assignment =
  | { kind: 'man'; target: ReceiverId }
  | { kind: 'zone'; zone: ZoneId }
  | { kind: 'blitz' }

export type ObservationKind = 'ghost' | 'man' | 'zone' | 'blitz'

export interface DefenderObservation {
  defender: CoverageDefenderId
  from: Vec2
  to: Vec2
  kind: ObservationKind
  target?: ReceiverId
  zone?: ZoneId
}

export interface Observation {
  concept: ConceptId
  defenders: DefenderObservation[]
  signature: string
}

export type OutcomeKind = 'touchdown' | 'short' | 'breakup' | 'interception'

export interface PlayOutcome {
  kind: OutcomeKind
  yards: number
  nearestDefender?: CoverageDefenderId
  separation: number
}

export interface LookupTables {
  version: 1
  shells: string[]
  observations: Record<string, Record<ConceptId, Observation>>
  outcomes: Record<string, Record<string, PlayOutcome>>
}

export interface Puzzle {
  version: 1
  date: string
  number: number
  spot: 12
  personnel: '11' | '12'
  concepts: ConceptId[]
  shell: string
  par: number
}

export interface Feedback {
  observationSignature: string
  outcome: OutcomeKind
}

export interface PlayedSnap {
  concept: ConceptId
  target: ReceiverId
  outcome: PlayOutcome
  observation: Observation
}
