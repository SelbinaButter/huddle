import { access, mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { decodeShell, type LookupTables, type Puzzle } from '../src/core/index'
import { generatePuzzle } from './lib/generator'

interface Arguments { dates: string[]; missingOnly: boolean; salt?: string }

function nextDate(date: string): string {
  const value = new Date(`${date}T00:00:00Z`)
  value.setUTCDate(value.getUTCDate() + 1)
  return value.toISOString().slice(0, 10)
}

function dateRange(from: string, through: string): string[] {
  const dates: string[] = []
  for (let date = from; date <= through; date = nextDate(date)) dates.push(date)
  return dates
}

function addDays(date: string, days: number): string {
  const value = new Date(`${date}T00:00:00Z`)
  value.setUTCDate(value.getUTCDate() + days)
  return value.toISOString().slice(0, 10)
}

function parseArguments(argv: string[]): Arguments {
  const value = (flag: string): string | undefined => {
    const exact = argv.indexOf(flag)
    if (exact >= 0) return argv[exact + 1]
    return argv.find((argument) => argument.startsWith(`${flag}=`))?.slice(flag.length + 1)
  }
  const positional = argv.filter((argument) => !argument.startsWith('--'))
  const missingOnly = argv.includes('--missing')
  const salt = value('--salt') ?? process.env.HUDDLE_SEED_SALT
  const singleDate = value('--date') ?? (positional.length === 1 ? positional[0] : undefined)
  if (singleDate) return { dates: [singleDate], missingOnly, salt }
  const from = value('--from') ?? positional[0] ?? new Date().toISOString().slice(0, 10)
  const positionalRangeEnd = positional[1]
    ? /^\d+$/.test(positional[1]) ? addDays(from, Math.max(0, Number(positional[1]) - 1)) : positional[1]
    : undefined
  const through = value('--through') ?? positionalRangeEnd ?? (value('--days')
    ? addDays(from, Math.max(0, Number(value('--days')) - 1))
    : from)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(through)) throw new Error('Dates must use YYYY-MM-DD.')
  return { dates: dateRange(from, through), missingOnly, salt }
}

async function exists(path: string): Promise<boolean> { try { await access(path); return true } catch { return false } }

async function recentShells(puzzleDirectory: string, date: string): Promise<string[]> {
  const files = (await readdir(puzzleDirectory)).filter((file) => /^\d{4}-\d{2}-\d{2}\.json$/.test(file) && file.slice(0, 10) < date).sort().slice(-30)
  const shells: string[] = []
  for (const file of files) {
    const puzzle = JSON.parse(await readFile(resolve(puzzleDirectory, file), 'utf8')) as Puzzle
    shells.push(decodeShell(puzzle.shell, puzzle.date))
  }
  return shells
}

async function main() {
  const args = parseArguments(process.argv.slice(2))
  if (process.env.CI && !args.salt) throw new Error('HUDDLE_SEED_SALT must be configured in CI so future puzzles cannot be predicted.')
  const puzzleDirectory = resolve('public/puzzles')
  const solutionDirectory = resolve('.generated/solutions')
  await mkdir(puzzleDirectory, { recursive: true })
  await mkdir(solutionDirectory, { recursive: true })
  const tables = JSON.parse(await readFile(resolve('public/tables.json'), 'utf8')) as LookupTables
  for (const date of args.dates) {
    const puzzlePath = resolve(puzzleDirectory, `${date}.json`)
    if (args.missingOnly && await exists(puzzlePath)) { console.log(`${date}: already generated`); continue }
    const generated = generatePuzzle(date, tables, { salt: args.salt, recentShells: await recentShells(puzzleDirectory, date) })
    await writeFile(puzzlePath, `${JSON.stringify(generated.puzzle, null, 2)}\n`, 'utf8')
    await writeFile(resolve(solutionDirectory, `${date}.json`), `${JSON.stringify({ date, shell: generated.shellId, ...generated.metrics }, null, 2)}\n`, 'utf8')
    console.log(`${date}: ${generated.shellId}, ${generated.metrics.scoringPlayCount}/40 TDs, par ${generated.metrics.par}`)
  }
  const dates = (await readdir(puzzleDirectory)).map((file) => /^(\d{4}-\d{2}-\d{2})\.json$/.exec(file)?.[1]).filter((date): date is string => Boolean(date)).sort()
  await writeFile(resolve(puzzleDirectory, 'index.json'), `${JSON.stringify({ dates }, null, 2)}\n`, 'utf8')
}

await main()
