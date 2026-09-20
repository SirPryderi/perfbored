import type { BoardDef, Bounds, Hole, PartDef, PartInstance, Rotation } from './types'

export const PITCH = 2.54

export function boardOrigin(board: BoardDef) {
  return {
    x: (board.width - (board.cols - 1) * PITCH) / 2,
    y: (board.height - (board.rows - 1) * PITCH) / 2,
  }
}

export function holeToMm(board: BoardDef, [col, row]: Hole) {
  const o = boardOrigin(board)
  return { x: o.x + col * PITCH, y: o.y + row * PITCH }
}

export function mmToHole(board: BoardDef, x: number, y: number): Hole {
  const o = boardOrigin(board)
  return [Math.round((x - o.x) / PITCH), Math.round((y - o.y) / PITCH)]
}

export function rotateHole([c, r]: Hole, rot: Rotation): Hole {
  switch (rot) {
    case 90: return [-r, c]
    case 180: return [-c, -r]
    case 270: return [r, -c]
    default: return [c, r]
  }
}

// Board coordinates are always as seen from the front, so a part on the back
// is mirrored left-to-right, as is one mounted upside down on either side.
export const isMirrored = (part: PartInstance) => (part.side === 'back') !== !!part.flipped

export function orient(p: Hole, part: PartInstance): Hole {
  const [c, r] = rotateHole(p, part.rot)
  return [isMirrored(part) ? -c : c, r]
}

export function partPins(part: PartInstance, def: PartDef): Hole[] {
  return def.pins({ ...def.defaults, ...part.props }).map((p) => {
    const [c, r] = orient(p, part)
    return [part.col + c, part.row + r]
  })
}

export interface NamedPin {
  hole: Hole
  name: string
}

export function namedPins(part: PartInstance, def: PartDef): NamedPin[] {
  const names = def.pinNames?.({ ...def.defaults, ...part.props }) ?? []
  return partPins(part, def).map((hole, i) => ({ hole, name: names[i] ?? `Pin ${i + 1}` }))
}

export function partTransform(board: BoardDef, part: PartInstance) {
  const { x, y } = holeToMm(board, [part.col, part.row])
  return `translate(${x} ${y})${isMirrored(part) ? ' scale(-1 1)' : ''} rotate(${part.rot})`
}

export function inflate(b: Bounds, by: number): Bounds {
  return { x: b.x - by, y: b.y - by, w: b.w + 2 * by, h: b.h + 2 * by }
}

// Offset (in holes) that puts a part's centre under the cursor while placing.
export function centreOffset(def: PartDef, part: PartInstance): Hole {
  const b = def.bounds({ ...def.defaults, ...part.props })
  const [c, r] = orient([(b.x + b.w / 2) / PITCH, (b.y + b.h / 2) / PITCH], part)
  return [Math.round(c), Math.round(r)]
}

export const holeKey = ([c, r]: Hole) => `${c},${r}`
