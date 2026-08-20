import type { Puzzle } from '../core'
import type { PlayedSnap } from '../core'
import { MAX_SNAPS } from './constants'

export type ShareMode = 'daily' | 'archive' | 'practice'

const OUTCOME_EMOJI = { touchdown: '🟩', short: '🟦', breakup: '🟨', interception: '🟥' } as const

export function shareText(puzzle: Puzzle, snaps: PlayedSnap[], options: { mode?: ShareMode; url?: string } = {}): string {
  const won = snaps.at(-1)?.outcome.kind === 'touchdown'
  const modeName = options.mode === 'archive' ? ' Archive' : options.mode === 'practice' ? ' Practice' : ''
  const score = won ? `${snaps.length}/${MAX_SNAPS}` : `X/${MAX_SNAPS}`
  const star = won && snaps.length < puzzle.par ? ' ⭐' : ''
  const row = Array.from({ length: MAX_SNAPS }, (_, index) => snaps[index] ? OUTCOME_EMOJI[snaps[index].outcome.kind] : '⬜').join('')
  const lines = [`🏈 Huddle${modeName} #${puzzle.number}  ${score}${star}`, '', row, `1st & goal from the ${puzzle.spot}`]
  if (options.url) lines.push('', options.url)
  return lines.join('\n')
}
