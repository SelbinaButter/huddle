import { CONCEPT_IDS, encodeShell, measureShell, type LookupTables, type Puzzle, type ShellMetrics } from '../../src/core/index'
import { hashString, mulberry32, shuffle } from './random'

const PUZZLE_EPOCH = Date.UTC(2026, 0, 1)

export function puzzleNumber(date: string): number {
  return Math.floor((Date.parse(`${date}T00:00:00Z`) - PUZZLE_EPOCH) / 86_400_000) + 1
}

export interface GeneratedPuzzle { puzzle: Puzzle; metrics: ShellMetrics; shellId: string }

let metricsCache: Map<string, ShellMetrics> | undefined

export function validShells(tables: LookupTables): { id: string; metrics: ShellMetrics }[] {
  if (!metricsCache) metricsCache = new Map(tables.shells.map((shellId) => [shellId, measureShell(tables, shellId)]))
  return tables.shells.map((id) => ({ id, metrics: metricsCache?.get(id) as ShellMetrics })).filter(({ metrics }) => metrics.passed)
}

export function generatePuzzle(date: string, tables: LookupTables, options: { salt?: string; recentShells?: string[] } = {}): GeneratedPuzzle {
  const random = mulberry32(hashString(`${date}:${options.salt ?? 'huddle-local-preview-v1'}`))
  const excluded = new Set(options.recentShells ?? [])
  const eligible = validShells(tables).filter(({ id }) => !excluded.has(id))
  if (eligible.length === 0) throw new Error('No shell satisfies all generation gates outside the 30-day repeat window.')
  const selected = eligible[Math.floor(random() * eligible.length)]
  const concepts = shuffle(random, CONCEPT_IDS)
  const puzzle: Puzzle = {
    version: 1,
    date,
    number: puzzleNumber(date),
    spot: 12,
    personnel: random() < 0.72 ? '11' : '12',
    concepts,
    shell: encodeShell(selected.id, date),
    par: selected.metrics.par,
  }
  return { puzzle, metrics: selected.metrics, shellId: selected.id }
}
