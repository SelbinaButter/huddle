import { readFile } from 'node:fs/promises'
import { expect, test } from '@playwright/test'
import { decodeShell, type LookupTables, type Puzzle } from '../../src/core'
import { localDate, previousDate } from '../../src/game/date'

test('daily, archive, practice, and a scoring snap work', async ({ page }) => {
  const today = localDate()
  const next = new Date()
  next.setDate(next.getDate() + 1)
  const futureDate = localDate(next)
  await page.route('**/puzzles/index.json', async (route) => {
    const response = await route.fetch()
    const index = await response.json() as { dates: string[] }
    await route.fulfill({ response, json: { dates: [...new Set([...index.dates, futureDate])] } })
  })
  await page.goto('/')
  await page.getByRole('button', { name: 'Call the first play' }).click()
  await expect(page.getByRole('heading', { name: /Huddle/ })).toBeVisible()
  await page.getByRole('button', { name: 'Archive' }).click()
  await expect(page.getByText('Archived game')).toBeVisible()
  await expect(page.locator('.archive-picker select')).toHaveValue(previousDate(today))
  await expect(page.locator(`.archive-picker option[value="${futureDate}"]`)).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Next archived game' })).toBeDisabled()
  await page.getByRole('button', { name: 'Practice' }).click()
  await expect(page.getByText(/daily streak stays untouched/)).toBeVisible()
  await page.getByRole('button', { name: 'Today' }).click()
  const puzzle = JSON.parse(await readFile(`public/puzzles/${today}.json`, 'utf8')) as Puzzle
  const tables = JSON.parse(await readFile('public/tables.json', 'utf8')) as LookupTables
  const shell = decodeShell(puzzle.shell, puzzle.date)
  const key = Object.entries(tables.outcomes[shell]).find(([, outcome]) => outcome.kind === 'touchdown')?.[0]
  expect(key).toBeDefined()
  const split = key!.lastIndexOf(':')
  const concept = key!.slice(0, split)
  const target = key!.slice(split + 1)
  await page.getByRole('button', { name: new RegExp(`^${concept === 'four-verts' ? 'Four Verticals' : concept === 'slant-flat' ? 'Slant–Flat' : concept === 'y-cross' ? 'Y-Cross' : concept[0].toUpperCase() + concept.slice(1)}`) }).click()
  await page.getByRole('button', { name: new RegExp(`^${target}`) }).click()
  await page.getByRole('button', { name: new RegExp(`Snap it · throw to ${target}`) }).click()
  await expect(page.getByRole('dialog', { name: 'Puzzle result' })).toBeVisible({ timeout: 5000 })
  await expect(page.getByRole('dialog', { name: 'Puzzle result' })).toContainText('1/4')
})
