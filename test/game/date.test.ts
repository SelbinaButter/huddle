import { describe, expect, it } from 'vitest'
import { previousUtcDate, utcDate } from '../../src/game/date'

describe('UTC dates', () => {
  it('uses UTC even around a local date boundary', () => expect(utcDate(new Date('2026-08-20T23:59:59-07:00'))).toBe('2026-08-21'))
  it('walks backward across month boundaries', () => expect(previousUtcDate('2026-03-01')).toBe('2026-02-28'))
})
