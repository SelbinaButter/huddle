import { expect, it } from 'vitest'
import { buildTables } from '../../scripts/buildTables'
import { allPlays, measureShell, referenceScore } from '../../src/core'

it('reference solver converts every eligible shell within four and matches measured par', () => {
  const tables = buildTables()
  for (const shellId of tables.shells) {
    const metrics = measureShell(tables, shellId)
    if (!metrics.passed) continue
    const scores = allPlays().map((play) => referenceScore(tables, shellId, play))
    expect(Math.max(...scores)).toBe(metrics.par)
    expect(Math.max(...scores)).toBeLessThanOrEqual(4)
  }
})
