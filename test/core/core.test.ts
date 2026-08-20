import { describe, expect, it } from 'vitest'
import { buildTables } from '../../scripts/buildTables'
import { allPlays, computeShellTables, feedbackFor, filterCandidates, measureShell, SHELL_BY_ID } from '../../src/core'

const tables = buildTables()

describe('coverage core', () => {
  it('committed lookup values match a fresh integer recomputation', () => {
    for (const shellId of tables.shells.filter((_, index) => index % 17 === 0)) {
      const shell = SHELL_BY_ID.get(shellId)
      expect(shell).toBeDefined()
      expect(computeShellTables(shell!)).toEqual({ observations: tables.observations[shellId], outcomes: tables.outcomes[shellId] })
    }
  })

  it('never filters the true shell and filtering is order-independent', () => {
    for (const shellId of tables.shells.filter((_, index) => index % 11 === 0)) {
      const plays = allPlays().filter((_, index) => index % 7 === 0).slice(0, 4)
      const forward = plays.reduce((candidates, play) => filterCandidates(tables, candidates, play.concept, play.target, feedbackFor(tables, shellId, play.concept, play.target)), tables.shells)
      const reverse = [...plays].reverse().reduce((candidates, play) => filterCandidates(tables, candidates, play.concept, play.target, feedbackFor(tables, shellId, play.concept, play.target)), tables.shells)
      expect(forward).toContain(shellId)
      expect(reverse).toContain(shellId)
      expect([...forward].sort()).toEqual([...reverse].sort())
    }
  })

  it('has a healthy measured pool passing every daily gate', () => {
    const valid = tables.shells.map((shellId) => measureShell(tables, shellId)).filter((metrics) => metrics.passed)
    expect(valid.length).toBeGreaterThanOrEqual(31)
    for (const metrics of valid) {
      expect(metrics.preSnapGuaranteed).toBe(false)
      expect(metrics.blindScoreRate).toBeGreaterThanOrEqual(.05)
      expect(metrics.blindScoreRate).toBeLessThanOrEqual(.15)
      expect(metrics.survivorsAfterOne).toBeGreaterThanOrEqual(3)
      expect(metrics.survivorsAfterOne).toBeLessThanOrEqual(8)
      expect(metrics.convertible).toBeGreaterThanOrEqual(.9)
      expect(metrics.par).toBeLessThanOrEqual(3)
    }
  })
})
