import { previousUtcDate, utcDate } from './date'
import type { PlayerStats, SavedRound } from './types'

const LEGACY_ROUND_KEY = 'huddle:round:v1'
const ROUND_KEY_PREFIX = 'huddle:round:v1:'
const STATS_KEY = 'huddle:stats:v1'
const ONBOARDING_KEY = 'huddle:onboarding:v1'
const EMPTY_STATS: PlayerStats = { currentStreak: 0, bestStreak: 0, history: [], distribution: {} }

function read<T>(key: string): T | undefined {
  try {
    const value = localStorage.getItem(key)
    return value ? JSON.parse(value) as T : undefined
  } catch { return undefined }
}

export function loadRound(date: string): SavedRound {
  const saved = read<SavedRound>(`${ROUND_KEY_PREFIX}${date}`) ?? read<SavedRound>(LEGACY_ROUND_KEY)
  return saved?.date === date ? saved : { date, snaps: [] }
}

export function saveRound(round: SavedRound): void {
  localStorage.setItem(`${ROUND_KEY_PREFIX}${round.date}`, JSON.stringify(round))
}

export function loadStats(now = new Date()): PlayerStats {
  const stats = read<PlayerStats>(STATS_KEY) ?? { ...EMPTY_STATS }
  const today = utcDate(now)
  if (stats.lastCompletedDate && stats.lastCompletedDate !== today && stats.lastCompletedDate !== previousUtcDate(today)) return { ...stats, currentStreak: 0 }
  return stats
}

export function recordResult(date: string, puzzleNumber: number, snaps: number | null): PlayerStats {
  const stats = loadStats()
  if (stats.history.some((entry) => entry.date === date)) return stats
  const currentStreak = snaps === null ? 0 : stats.lastCompletedDate === previousUtcDate(date) ? stats.currentStreak + 1 : 1
  const key = snaps === null ? 'X' : String(snaps)
  const updated: PlayerStats = {
    currentStreak,
    bestStreak: Math.max(stats.bestStreak, currentStreak),
    lastCompletedDate: date,
    history: [...stats.history, { date, puzzleNumber, snaps }].slice(-365),
    distribution: { ...stats.distribution, [key]: (stats.distribution[key] ?? 0) + 1 },
  }
  localStorage.setItem(STATS_KEY, JSON.stringify(updated))
  return updated
}

export function hasSeenOnboarding(): boolean { return localStorage.getItem(ONBOARDING_KEY) === 'seen' }
export function markOnboardingSeen(): void { localStorage.setItem(ONBOARDING_KEY, 'seen') }
