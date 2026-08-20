import { readFile } from 'node:fs/promises'
import { expect, test } from '@playwright/test'
import { runLookupHarness, type HarnessInput, type LookupTables } from '../../src/core'

test('Node and Chromium return identical observation and outcome table lookups', async ({ page }) => {
  await page.goto('/')
  const tables = JSON.parse(await readFile('public/tables.json', 'utf8')) as LookupTables
  const inputs: HarnessInput[] = Array.from({ length: 200 }, (_, index) => ({
    shellId: tables.shells[(index * 37) % tables.shells.length],
    concept: ['four-verts', 'mesh', 'flood', 'smash', 'levels', 'stick', 'slant-flat', 'y-cross'][index % 8] as HarnessInput['concept'],
    target: ['X', 'Z', 'S', 'Y', 'R'][index % 5] as HarnessInput['target'],
  }))
  const expected = runLookupHarness(tables, inputs)
  const actual = await page.evaluate(async (canonicalInputs) => {
    const response = await fetch('/tables.json')
    const browserTables = await response.json()
    // @ts-expect-error Vite serves this pure source module to the browser harness.
    const harness = await import('/src/core/harness.ts')
    return harness.runLookupHarness(browserTables, canonicalInputs)
  }, inputs)
  expect(actual).toEqual(expected)
})
