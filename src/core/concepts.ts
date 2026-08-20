import type { Concept, ConceptId, ReceiverId, Route, Vec2 } from './types'

export const RECEIVER_STARTS: Record<ReceiverId, Vec2> = {
  X: { x: -18, y: 0 },
  S: { x: -9, y: 0 },
  Y: { x: 9, y: 0 },
  Z: { x: 18, y: 0 },
  R: { x: 0, y: -3 },
}

function route(receiver: ReceiverId, name: string, ...points: Vec2[]): Route {
  return { receiver, name, points: [RECEIVER_STARTS[receiver], ...points] }
}

export const CONCEPTS: Record<ConceptId, Concept> = {
  'four-verts': {
    id: 'four-verts', name: 'Four Verticals', prompt: 'Stress every deep defender.', routes: [
      route('X', 'Go', { x: -18, y: 5 }, { x: -18, y: 10 }, { x: -17, y: 15 }),
      route('S', 'Seam', { x: -9, y: 6 }, { x: -7, y: 12 }, { x: -6, y: 17 }),
      route('Y', 'Seam', { x: 9, y: 6 }, { x: 7, y: 12 }, { x: 6, y: 17 }),
      route('Z', 'Go', { x: 18, y: 5 }, { x: 18, y: 10 }, { x: 17, y: 15 }),
      route('R', 'Check', { x: 0, y: 0 }, { x: 0, y: 4 }, { x: 0, y: 7 }),
    ],
  },
  mesh: {
    id: 'mesh', name: 'Mesh', prompt: 'Cross two routes to expose man coverage.', routes: [
      route('X', 'Dig', { x: -16, y: 5 }, { x: -8, y: 7 }, { x: 3, y: 7 }),
      route('S', 'Mesh', { x: -8, y: 3 }, { x: -2, y: 5 }, { x: 8, y: 6 }),
      route('Y', 'Mesh', { x: 8, y: 3 }, { x: 2, y: 5 }, { x: -8, y: 6 }),
      route('Z', 'Corner', { x: 17, y: 5 }, { x: 14, y: 10 }, { x: 10, y: 14 }),
      route('R', 'Sit', { x: 0, y: 0 }, { x: 1, y: 3 }, { x: 1, y: 5 }),
    ],
  },
  flood: {
    id: 'flood', name: 'Flood', prompt: 'Put three routes into one sideline.', routes: [
      route('X', 'Clear', { x: -18, y: 6 }, { x: -18, y: 12 }, { x: -16, y: 16 }),
      route('S', 'Sail', { x: -10, y: 5 }, { x: -13, y: 9 }, { x: -16, y: 11 }),
      route('Y', 'Drag', { x: 7, y: 3 }, { x: 1, y: 5 }, { x: -7, y: 6 }),
      route('Z', 'Post', { x: 18, y: 6 }, { x: 13, y: 11 }, { x: 5, y: 16 }),
      route('R', 'Flat', { x: -3, y: 0 }, { x: -9, y: 2 }, { x: -16, y: 3 }),
    ],
  },
  smash: {
    id: 'smash', name: 'Smash', prompt: 'High-low both corner defenders.', routes: [
      route('X', 'Corner', { x: -17, y: 5 }, { x: -14, y: 10 }, { x: -10, y: 14 }),
      route('S', 'Hitch', { x: -10, y: 3 }, { x: -11, y: 6 }, { x: -12, y: 6 }),
      route('Y', 'Hitch', { x: 10, y: 3 }, { x: 11, y: 6 }, { x: 12, y: 6 }),
      route('Z', 'Corner', { x: 17, y: 5 }, { x: 14, y: 10 }, { x: 10, y: 14 }),
      route('R', 'Middle', { x: 0, y: 0 }, { x: 0, y: 3 }, { x: 0, y: 6 }),
    ],
  },
  levels: {
    id: 'levels', name: 'Levels', prompt: 'Layer three in-breakers behind the backers.', routes: [
      route('X', 'In', { x: -16, y: 5 }, { x: -11, y: 8 }, { x: -5, y: 8 }),
      route('S', 'Deep in', { x: -8, y: 6 }, { x: -5, y: 11 }, { x: 4, y: 12 }),
      route('Y', 'In', { x: 8, y: 5 }, { x: 5, y: 9 }, { x: -3, y: 9 }),
      route('Z', 'Post', { x: 17, y: 6 }, { x: 13, y: 11 }, { x: 7, y: 15 }),
      route('R', 'Check', { x: 0, y: 0 }, { x: 0, y: 2 }, { x: 0, y: 4 }),
    ],
  },
  stick: {
    id: 'stick', name: 'Stick', prompt: 'Make underneath defenders declare early.', routes: [
      route('X', 'Hitch', { x: -18, y: 3 }, { x: -17, y: 5 }),
      route('S', 'Stick', { x: -9, y: 4 }, { x: -7, y: 6 }),
      route('Y', 'Stick', { x: 9, y: 4 }, { x: 7, y: 6 }),
      route('Z', 'Hitch', { x: 18, y: 3 }, { x: 17, y: 5 }),
      route('R', 'Arrow', { x: 3, y: -1 }, { x: 8, y: 2 }, { x: 13, y: 3 }),
    ],
  },
  'slant-flat': {
    id: 'slant-flat', name: 'Slant–Flat', prompt: 'Force each edge defender to choose.', routes: [
      route('X', 'Slant', { x: -16, y: 4 }, { x: -12, y: 8 }, { x: -7, y: 13 }),
      route('S', 'Flat', { x: -10, y: 1 }, { x: -15, y: 2 }, { x: -18, y: 3 }),
      route('Y', 'Flat', { x: 10, y: 1 }, { x: 15, y: 2 }, { x: 18, y: 3 }),
      route('Z', 'Slant', { x: 16, y: 4 }, { x: 12, y: 8 }, { x: 7, y: 13 }),
      route('R', 'Middle', { x: 0, y: 0 }, { x: 0, y: 4 }, { x: 0, y: 8 }),
    ],
  },
  'y-cross': {
    id: 'y-cross', name: 'Y-Cross', prompt: 'Stretch the coverage across and behind.', routes: [
      route('X', 'Go', { x: -18, y: 6 }, { x: -18, y: 12 }, { x: -16, y: 16 }),
      route('S', 'Over', { x: -8, y: 5 }, { x: 0, y: 8 }, { x: 10, y: 10 }),
      route('Y', 'Cross', { x: 8, y: 5 }, { x: 1, y: 9 }, { x: -10, y: 13 }),
      route('Z', 'Curl', { x: 18, y: 5 }, { x: 17, y: 8 }, { x: 15, y: 9 }),
      route('R', 'Flat', { x: 0, y: -1 }, { x: 6, y: 1 }, { x: 13, y: 3 }),
    ],
  },
}

export function playKey(concept: ConceptId, target: ReceiverId): string {
  return `${concept}:${target}`
}

export function targetRoute(concept: ConceptId, target: ReceiverId): Route {
  const found = CONCEPTS[concept].routes.find((candidate) => candidate.receiver === target)
  if (!found) throw new Error(`Missing ${target} route in ${concept}`)
  return found
}
