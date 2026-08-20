import { CONCEPTS, playKey, targetRoute } from './concepts'
import { assignmentsFor, coverageDefenders, DEFENDER_STARTS, leveragedZoneAnchor } from './shells'
import type { ConceptId, CoverageDefenderId, DefenderObservation, Observation, PlayOutcome, ReceiverId, Route, Shell, Vec2 } from './types'

const REVEAL_RADIUS_SQ = 36
const COVER_RADIUS_SQ = 27
const PICK_RADIUS_SQ = 5

function distanceSquared(a: Vec2, b: Vec2): number {
  return (a.x - b.x) ** 2 + (a.y - b.y) ** 2
}

function finalPoint(route: Route): Vec2 { return route.points[route.points.length - 1] }

function manPoint(shell: Shell, defender: CoverageDefenderId, route: Route): Vec2 {
  const point = finalPoint(route)
  const side = defender === 'LC' ? -1 : defender === 'RC' ? 1 : Math.sign(point.x) || 1
  const leverage = defender === 'LC' ? shell.leftLeverage : defender === 'RC' ? shell.rightLeverage : 'inside'
  const horizontal = leverage === 'inside' ? -side * 2 : side * 2
  return { x: point.x + horizontal, y: point.y - 1 }
}

function routeStressesPoint(routes: Route[], point: Vec2): boolean {
  return routes.some((route) => route.points.some((sample) => distanceSquared(sample, point) <= REVEAL_RADIUS_SQ))
}

function manIsStressed(route: Route, routes: Route[]): boolean {
  if (finalPoint(route).y >= 11) return true
  return routes.some((other) => other.receiver !== route.receiver && route.points.some((point, index) => {
    const otherPoint = other.points[Math.min(index, other.points.length - 1)]
    return distanceSquared(point, otherPoint) <= 25
  }))
}

function ghostPoint(defender: CoverageDefenderId): Vec2 {
  const from = DEFENDER_STARTS[defender]
  return { x: from.x - Math.sign(from.x) * 2, y: from.y + 3 }
}

export function observationSignature(observation: Omit<Observation, 'signature'> | Observation): string {
  return observation.defenders.map((item) => item.kind === 'man'
    ? `${item.defender}:M${item.target}`
    : item.kind === 'zone' ? `${item.defender}:Z${item.zone}` : `${item.defender}:${item.kind[0].toUpperCase()}`).join('|')
}

export function observeShell(shell: Shell, conceptId: ConceptId): Observation {
  const routes = CONCEPTS[conceptId].routes
  const assignments = assignmentsFor(shell)
  const defenders: DefenderObservation[] = coverageDefenders().map((defender) => {
    const from = DEFENDER_STARTS[defender]
    const assignment = assignments[defender]
    if (assignment.kind === 'blitz') return { defender, from, to: { x: from.x / 2, y: -3 }, kind: 'blitz' }
    if (assignment.kind === 'man') {
      const route = targetRoute(conceptId, assignment.target)
      if (!manIsStressed(route, routes)) return { defender, from, to: ghostPoint(defender), kind: 'ghost' }
      return { defender, from, to: manPoint(shell, defender, route), kind: 'man', target: assignment.target }
    }
    const anchor = leveragedZoneAnchor(shell, defender, assignment.zone)
    if (!routeStressesPoint(routes, anchor)) return { defender, from, to: ghostPoint(defender), kind: 'ghost' }
    return { defender, from, to: anchor, kind: 'zone', zone: assignment.zone }
  })
  const bare = { concept: conceptId, defenders }
  return { ...bare, signature: observationSignature(bare) }
}

export function resolvePlay(shell: Shell, conceptId: ConceptId, target: ReceiverId): PlayOutcome {
  const route = targetRoute(conceptId, target)
  const catchPoint = finalPoint(route)
  const assignments = assignmentsFor(shell)
  let nearest: { defender: CoverageDefenderId; distance: number } | undefined
  for (const defender of coverageDefenders()) {
    const assignment = assignments[defender]
    if (assignment.kind === 'blitz') continue
    if (assignment.kind === 'man' && assignment.target !== target) continue
    const point = assignment.kind === 'man'
      ? manPoint(shell, defender, route)
      : leveragedZoneAnchor(shell, defender, assignment.zone)
    const distance = distanceSquared(catchPoint, point)
    if (!nearest || distance < nearest.distance) nearest = { defender, distance }
  }
  const separation = nearest ? Math.round(Math.sqrt(nearest.distance) * 10) / 10 : 20
  if (nearest && nearest.distance <= PICK_RADIUS_SQ) {
    return { kind: 'interception', yards: 0, nearestDefender: nearest.defender, separation }
  }
  if (nearest && nearest.distance <= COVER_RADIUS_SQ) {
    return { kind: 'breakup', yards: 0, nearestDefender: nearest.defender, separation }
  }
  const yards = Math.max(0, Math.min(12, Math.round(catchPoint.y)))
  return catchPoint.y >= 12
    ? { kind: 'touchdown', yards: 12, separation }
    : { kind: 'short', yards, separation }
}

export function computeShellTables(shell: Shell) {
  const observations = {} as Record<ConceptId, Observation>
  const outcomes: Record<string, PlayOutcome> = {}
  for (const concept of Object.keys(CONCEPTS) as ConceptId[]) {
    observations[concept] = observeShell(shell, concept)
    for (const route of CONCEPTS[concept].routes) outcomes[playKey(concept, route.receiver)] = resolvePlay(shell, concept, route.receiver)
  }
  return { observations, outcomes }
}
