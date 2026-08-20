import type { PlayedSnap } from '../core'

export interface SavedRound { date: string; snaps: PlayedSnap[] }
export interface HistoryEntry { date: string; puzzleNumber: number; snaps: number | null }
export interface PlayerStats {
  currentStreak: number
  bestStreak: number
  lastCompletedDate?: string
  history: HistoryEntry[]
  distribution: Record<string, number>
}
