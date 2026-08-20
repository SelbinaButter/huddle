import { expect, it } from 'vitest'
import { buildTables } from '../../scripts/buildTables'
import { decodeShell, type PlayedSnap, type Puzzle } from '../../src/core'
import { shareText } from '../../src/game/share'
import puzzle from '../../public/puzzles/2026-08-20.json'

it('shares efficiency without leaking coverage, defenders, or concepts', () => {
  const typedPuzzle = puzzle as Puzzle
  const tables = buildTables()
  const shell = decodeShell(typedPuzzle.shell, typedPuzzle.date)
  const concept = typedPuzzle.concepts[0]
  const target = 'X'
  const snap: PlayedSnap = { concept, target, outcome: tables.outcomes[shell][`${concept}:${target}`], observation: tables.observations[shell][concept] }
  const text = shareText(typedPuzzle, [snap])
  expect(text).toContain('Huddle')
  expect(text).not.toContain(shell)
  expect(text).not.toMatch(/cover|tampa|four|mesh|flood|smash|levels|stick|slant|cross/i)
  expect(text).not.toMatch(/\b(LC|RC|FS|SS)\b/)
  expect(text).not.toContain(concept)
})
