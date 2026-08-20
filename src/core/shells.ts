import { BASE_SHELLS, COVERAGE_DEFENDERS, type Assignment, type Blitzer, type CoverageDefenderId, type Leverage, type Rotation, type Shell, type Vec2, type ZoneId } from './types'

export const DEFENDER_STARTS: Record<CoverageDefenderId, Vec2> = {
  LC: { x: -18, y: 4 }, RC: { x: 18, y: 4 }, N: { x: -8, y: 4 },
  M: { x: 0, y: 5 }, W: { x: 8, y: 4 }, FS: { x: -5, y: 10 }, SS: { x: 6, y: 9 },
}

export const ZONE_ANCHORS: Record<ZoneId, Vec2> = {
  'deep-left': { x: -13, y: 15 }, 'deep-middle': { x: 0, y: 16 }, 'deep-right': { x: 13, y: 15 },
  'half-left': { x: -9, y: 15 }, 'half-right': { x: 9, y: 15 },
  'flat-left': { x: -15, y: 6 }, 'flat-right': { x: 15, y: 6 },
  'hook-left': { x: -6, y: 9 }, 'hook-middle': { x: 0, y: 10 }, 'hook-right': { x: 6, y: 9 },
  robber: { x: 0, y: 7 },
}

const ROTATIONS: Rotation[] = ['field', 'boundary']
const BLITZERS: Blitzer[] = ['none', 'N', 'M', 'W']
const LEVERAGES: Leverage[] = ['inside', 'outside']

function shortBase(base: Shell['base']): string {
  return ({ 'cover-0': 'C0', 'cover-1': 'C1', 'cover-2': 'C2', 'cover-3': 'C3', 'cover-4': 'C4', 'cover-6': 'C6', 'tampa-2': 'T2', 'man-2': 'M2' } as const)[base]
}

export function shellId(shell: Omit<Shell, 'id'>): string {
  return `${shortBase(shell.base)}-${shell.rotation === 'field' ? 'F' : 'B'}-${shell.blitzer}-${shell.leftLeverage[0]}${shell.rightLeverage[0]}`
}

export function enumerateShells(): Shell[] {
  const shells: Shell[] = []
  for (const base of BASE_SHELLS) for (const rotation of ROTATIONS) for (const blitzer of BLITZERS) {
    for (const leftLeverage of LEVERAGES) for (const rightLeverage of LEVERAGES) {
      const partial = { base, rotation, blitzer, leftLeverage, rightLeverage }
      shells.push({ ...partial, id: shellId(partial) })
    }
  }
  return shells
}

export const SHELLS = enumerateShells()
export const SHELL_BY_ID = new Map(SHELLS.map((shell) => [shell.id, shell]))

function zone(zone: ZoneId): Assignment { return { kind: 'zone', zone } }
function man(target: 'X' | 'Z' | 'S' | 'Y' | 'R'): Assignment { return { kind: 'man', target } }

export function assignmentsFor(shell: Shell): Record<CoverageDefenderId, Assignment> {
  const fieldLeft = shell.rotation === 'field'
  const leftDeep: ZoneId = fieldLeft ? 'deep-left' : 'deep-right'
  const rightDeep: ZoneId = fieldLeft ? 'deep-right' : 'deep-left'
  let result: Record<CoverageDefenderId, Assignment>
  switch (shell.base) {
    case 'cover-0':
      result = { LC: man('X'), RC: man('Z'), N: man('S'), M: man('Y'), W: man('R'), FS: man('Y'), SS: man('S') }
      break
    case 'cover-1':
      result = { LC: man('X'), RC: man('Z'), N: man('S'), M: man('Y'), W: man('R'), FS: zone('deep-middle'), SS: zone('robber') }
      break
    case 'cover-2':
      result = { LC: zone('flat-left'), RC: zone('flat-right'), N: zone('hook-left'), M: zone('hook-middle'), W: zone('hook-right'), FS: zone('half-left'), SS: zone('half-right') }
      break
    case 'cover-3':
      result = { LC: zone(leftDeep), RC: zone(rightDeep), N: zone('flat-left'), M: zone('hook-middle'), W: zone('flat-right'), FS: zone('deep-middle'), SS: zone(fieldLeft ? 'hook-right' : 'hook-left') }
      break
    case 'cover-4':
      result = { LC: zone('deep-left'), RC: zone('deep-right'), N: zone('hook-left'), M: zone('hook-middle'), W: zone('hook-right'), FS: zone('half-left'), SS: zone('half-right') }
      break
    case 'cover-6':
      result = fieldLeft
        ? { LC: zone('deep-left'), RC: zone('flat-right'), N: zone('hook-left'), M: zone('hook-middle'), W: zone('hook-right'), FS: zone('half-left'), SS: zone('half-right') }
        : { LC: zone('flat-left'), RC: zone('deep-right'), N: zone('hook-left'), M: zone('hook-middle'), W: zone('hook-right'), FS: zone('half-left'), SS: zone('half-right') }
      break
    case 'tampa-2':
      result = { LC: zone('flat-left'), RC: zone('flat-right'), N: zone('hook-left'), M: zone('deep-middle'), W: zone('hook-right'), FS: zone('half-left'), SS: zone('half-right') }
      break
    case 'man-2':
      result = { LC: man('X'), RC: man('Z'), N: man('S'), M: man('Y'), W: man('R'), FS: zone('half-left'), SS: zone('half-right') }
  }
  if (shell.blitzer !== 'none') result[shell.blitzer] = { kind: 'blitz' }
  return result
}

export function leveragedZoneAnchor(shell: Shell, defender: CoverageDefenderId, zoneId: ZoneId): Vec2 {
  const anchor = ZONE_ANCHORS[zoneId]
  if (defender !== 'LC' && defender !== 'RC') return anchor
  const leverage = defender === 'LC' ? shell.leftLeverage : shell.rightLeverage
  const side = defender === 'LC' ? -1 : 1
  return { x: anchor.x + (leverage === 'outside' ? side * 2 : side * -2), y: anchor.y }
}

export function coverageDefenders(): readonly CoverageDefenderId[] { return COVERAGE_DEFENDERS }
