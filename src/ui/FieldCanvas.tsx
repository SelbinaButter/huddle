import { useEffect, useRef } from 'react'
import { assignmentsFor, CONCEPTS, DEFENDER_STARTS, leveragedZoneAnchor, RECEIVER_STARTS, SHELL_BY_ID, targetRoute, type ConceptId, type Observation, type PlayedSnap, type PlayOutcome, type ReceiverId, type Route, type Vec2 } from '../core'

interface ActiveSnap { observation: Observation; outcome: PlayOutcome; progress: number }
interface Props {
  concept: ConceptId
  target: ReceiverId
  snaps: PlayedSnap[]
  active?: ActiveSnap
  revealedShellId?: string
}

const COLORS = { X: '#ffcf56', Z: '#ff7a68', S: '#52d6ff', Y: '#b59cff', R: '#7ce5ad' } as const

function pointAt(points: Vec2[], progress: number): Vec2 {
  const scaled = Math.max(0, Math.min(0.9999, progress)) * (points.length - 1)
  const index = Math.floor(scaled)
  const blend = scaled - index
  const a = points[index]
  const b = points[Math.min(index + 1, points.length - 1)]
  return { x: a.x + (b.x - a.x) * blend, y: a.y + (b.y - a.y) * blend }
}

function playPath(route: Route, outcome: PlayOutcome): Vec2[] {
  // Saved rounds from the original rules do not have the YAC field.
  if (!outcome.yardsAfterCatch) return route.points
  const caught = route.points[route.points.length - 1]
  return [...route.points, { x: caught.x, y: caught.y + outcome.yardsAfterCatch }]
}

export function FieldCanvas({ concept, target, snaps, active, revealedShellId }: Props) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const ratio = Math.min(2, window.devicePixelRatio || 1)
    canvas.width = Math.round(rect.width * ratio)
    canvas.height = Math.round(rect.height * ratio)
    const context = canvas.getContext('2d')
    if (!context) return
    context.scale(ratio, ratio)
    const width = rect.width
    const height = rect.height
    const project = (point: Vec2): Vec2 => ({ x: ((point.x + 24) / 48) * width, y: height - ((point.y + 6) / 27) * height })
    const path = (points: Vec2[], color: string, alpha: number, lineWidth = 2, dashed = false) => {
      context.save(); context.globalAlpha = alpha; context.strokeStyle = color; context.lineWidth = lineWidth; context.lineCap = 'round'; context.lineJoin = 'round'
      if (dashed) context.setLineDash([7, 7])
      context.beginPath()
      points.forEach((point, index) => { const p = project(point); if (index === 0) context.moveTo(p.x, p.y); else context.lineTo(p.x, p.y) })
      context.stroke(); context.restore()
    }
    const dot = (point: Vec2, color: string, label: string, radius = 10) => {
      const p = project(point); context.save(); context.fillStyle = color; context.strokeStyle = '#07140f'; context.lineWidth = 2; context.beginPath(); context.arc(p.x, p.y, radius, 0, Math.PI * 2); context.fill(); context.stroke(); context.fillStyle = '#07140f'; context.font = '700 10px system-ui'; context.textAlign = 'center'; context.textBaseline = 'middle'; context.fillText(label, p.x, p.y + .5); context.restore()
    }

    context.fillStyle = '#0b3d2c'; context.fillRect(0, 0, width, height)
    const endTop = project({ x: 0, y: 20 }).y; const goal = project({ x: 0, y: 12 }).y
    context.fillStyle = '#0f5038'; context.fillRect(0, endTop, width, goal - endTop)
    for (const yard of [0, 5, 10, 12, 15]) {
      const y = project({ x: 0, y: yard }).y
      context.strokeStyle = yard === 12 ? 'rgba(255,255,255,.9)' : 'rgba(255,255,255,.18)'; context.lineWidth = yard === 12 ? 3 : 1
      context.beginPath(); context.moveTo(0, y); context.lineTo(width, y); context.stroke()
      if (yard < 12) { context.fillStyle = 'rgba(255,255,255,.35)'; context.font = '600 10px system-ui'; context.fillText(String(12 - yard), 8, y - 5) }
    }
    context.fillStyle = 'rgba(255,255,255,.22)'; context.font = '800 20px system-ui'; context.textAlign = 'center'; context.fillText('END ZONE', width / 2, project({ x: 0, y: 16 }).y)
    for (let x = -20; x <= 20; x += 4) for (const yard of [2, 7]) { const p = project({ x, y: yard }); context.fillStyle = 'rgba(255,255,255,.25)'; context.fillRect(p.x - 1, p.y - 3, 2, 6) }

    snaps.forEach((snap, index) => {
      const color = snap.outcome.kind === 'touchdown' ? '#63e6a7' : snap.outcome.kind === 'interception' ? '#ff6b68' : '#d9e7df'
      const route = targetRoute(snap.concept, snap.target)
      path(playPath(route, snap.outcome), color, .22 + index * .08, 3)
      snap.observation.defenders.forEach((defender) => path([defender.from, defender.to], defender.kind === 'blitz' ? '#ff6b68' : '#8ed6ff', .16 + index * .07, 2))
    })

    const selected = CONCEPTS[concept]
    selected.routes.forEach((route) => path(route.points, COLORS[route.receiver], route.receiver === target ? .95 : .32, route.receiver === target ? 4 : 2, !active))

    const progress = active?.progress ?? 0
    selected.routes.forEach((route) => {
      const points = active && route.receiver === target ? playPath(route, active.outcome) : route.points
      dot(active ? pointAt(points, progress) : RECEIVER_STARTS[route.receiver], COLORS[route.receiver], route.receiver, route.receiver === target ? 11 : 9)
    })
    dot({ x: 0, y: -4 }, '#f4eee5', 'QB', 10)

    const rushStarts = [-13, -4, 4, 13].map((x) => ({ x, y: 2 }))
    rushStarts.forEach((start, index) => {
      const end = { x: start.x * .55, y: -3 }
      const now = active ? { x: start.x + (end.x - start.x) * progress, y: start.y + (end.y - start.y) * progress } : start
      if (active) path([start, end], '#ff766d', .5, 2)
      dot(now, '#ff766d', index === 0 || index === 3 ? 'E' : 'T', 8)
    })

    const observation = active?.observation
    const shell = revealedShellId ? SHELL_BY_ID.get(revealedShellId) : undefined
    const assignments = shell ? assignmentsFor(shell) : undefined
    Object.keys(DEFENDER_STARTS).forEach((key) => {
      const defender = key as keyof typeof DEFENDER_STARTS
      const item = observation?.defenders.find((entry) => entry.defender === defender)
      let end = item?.to ?? DEFENDER_STARTS[defender]
      let kind = item?.kind ?? 'ghost'
      let label: string = defender
      if (shell && assignments) {
        const assignment = assignments[defender]
        kind = assignment.kind
        if (assignment.kind === 'zone') end = leveragedZoneAnchor(shell, defender, assignment.zone)
        if (assignment.kind === 'blitz') end = { x: DEFENDER_STARTS[defender].x / 2, y: -3 }
        label = assignment.kind === 'man' ? `M·${assignment.target}` : assignment.kind === 'zone' ? 'ZONE' : 'BLITZ'
      }
      const start = DEFENDER_STARTS[defender]
      const now = active ? { x: start.x + (end.x - start.x) * progress, y: start.y + (end.y - start.y) * progress } : shell ? end : start
      if ((active && progress > .62 && kind !== 'ghost') || shell) {
        if (kind === 'zone') { const p = project(end); context.save(); context.fillStyle = 'rgba(82,181,255,.12)'; context.strokeStyle = 'rgba(113,201,255,.65)'; context.beginPath(); context.ellipse(p.x, p.y, width * .09, height * .07, 0, 0, Math.PI * 2); context.fill(); context.stroke(); context.restore() }
        if (kind === 'man' && item?.target) path([now, pointAt(targetRoute(concept, item.target).points, progress)], '#ffd166', .75, 2, true)
      }
      dot(now, kind === 'blitz' ? '#ff6b68' : kind === 'ghost' ? '#a5b8af' : '#7ec8ff', active && progress > .67 && kind !== 'ghost' || shell ? label : defender, 9)
    })
  }, [active, concept, revealedShellId, snaps, target])

  return <canvas ref={ref} className="field-canvas" role="img" aria-label="Football field showing the selected routes, defenders, and accumulated snap trails." />
}
