import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { computeShellTables, SHELLS, type LookupTables } from '../src/core/index'

export function buildTables(): LookupTables {
  const tables: LookupTables = { version: 1, shells: SHELLS.map((shell) => shell.id), observations: {}, outcomes: {} }
  for (const shell of SHELLS) {
    const computed = computeShellTables(shell)
    tables.observations[shell.id] = computed.observations
    tables.outcomes[shell.id] = computed.outcomes
  }
  return tables
}

async function main() {
  const output = resolve('public/tables.json')
  await mkdir(resolve('public'), { recursive: true })
  const tables = buildTables()
  await writeFile(output, `${JSON.stringify(tables)}\n`, 'utf8')
  console.log(`Wrote ${tables.shells.length} shells, ${tables.shells.length * 8} observations, and ${tables.shells.length * 40} outcomes.`)
}

if (process.argv[1]?.replace(/\\/g, '/').endsWith('/scripts/buildTables.ts')) {
  void main().catch((error: unknown) => {
    console.error(error)
    process.exitCode = 1
  })
}
