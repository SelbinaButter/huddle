import { expect, it } from 'vitest'
import { buildTables } from '../../scripts/buildTables'
import { generatePuzzle } from '../../scripts/lib/generator'

function addDays(date: string, days: number): string {
  const value = new Date(`${date}T00:00:00Z`); value.setUTCDate(value.getUTCDate() + days); return value.toISOString().slice(0, 10)
}

it('generates 60 consecutive gated days without a shell repeat in any 30-day window', () => {
  const tables = buildTables()
  const shells: string[] = []
  for (let day = 0; day < 60; day += 1) {
    const generated = generatePuzzle(addDays('2026-01-01', day), tables, { salt: 'test-salt', recentShells: shells.slice(-30) })
    expect(generated.metrics.passed).toBe(true)
    expect(generated.metrics.preSnapGuaranteed).toBe(false)
    expect(shells.slice(-30)).not.toContain(generated.shellId)
    shells.push(generated.shellId)
  }
})
