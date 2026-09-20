import type { Hole } from './types'

export type Bend = 'horizontal' | 'vertical'

// Corner holes for a right-angle hop from `a` to `b`, leaving along `bend`.
export function corner(a: Hole, b: Hole, bend: Bend): Hole[] {
  if (a[0] === b[0] || a[1] === b[1]) return []
  return bend === 'horizontal' ? [[b[0], a[1]]] : [[a[0], b[1]]]
}

// Keep heading the way the wire was already going, so it doesn't zigzag.
export function naturalBend(points: Hole[]): Bend {
  if (points.length < 2) return 'horizontal'
  const [a, b] = points.slice(-2)
  return a[1] === b[1] ? 'horizontal' : 'vertical'
}

export function simplify(points: Hole[]): Hole[] {
  const out: Hole[] = []
  for (const p of points) {
    const last = out[out.length - 1]
    if (last && last[0] === p[0] && last[1] === p[1]) continue
    if (out.length >= 2) {
      const [a, b] = out.slice(-2)
      const collinear = (b[0] - a[0]) * (p[1] - b[1]) === (b[1] - a[1]) * (p[0] - b[0])
      const sameWay = (b[0] - a[0]) * (p[0] - b[0]) + (b[1] - a[1]) * (p[1] - b[1]) > 0
      if (collinear && sameWay) out.pop()
    }
    out.push(p)
  }
  return out
}

export const WIRE_COLORS = [
  { name: 'Red', value: '#d93a3a' },
  { name: 'Black', value: '#2b2b2b' },
  { name: 'Blue', value: '#2f6fdb' },
  { name: 'Green', value: '#2e9d4f' },
  { name: 'Yellow', value: '#e3bb18' },
  { name: 'Orange', value: '#ec7a1c' },
  { name: 'White', value: '#f4f4f0' },
  { name: 'Purple', value: '#8a4fd1' },
  { name: 'Brown', value: '#8a5a2b' },
  { name: 'Grey', value: '#8c8c8c' },
]

// Move vertex `i` of a wire to `to`, keeping straight segments straight: interior
// neighbours slide along with it, while the wire's ends stay put and gain a bend.
export function moveVertex(points: Hole[], i: number, to: Hole, free: boolean): Hole[] {
  const out = points.map((p): Hole => [p[0], p[1]])
  out[i] = to
  if (free) return out
  const last = points.length - 1
  const inserts: { at: number; hole: Hole }[] = []
  for (const j of [i - 1, i + 1]) {
    if (j < 0 || j > last) continue
    const [a, b] = [points[j], points[i]]
    const horizontal = a[1] === b[1] && a[0] !== b[0]
    const vertical = a[0] === b[0] && a[1] !== b[1]
    if (!horizontal && !vertical) continue
    if (j !== 0 && j !== last) {
      out[j] = horizontal ? [a[0], to[1]] : [to[0], a[1]]
    } else if (horizontal ? a[1] !== to[1] : a[0] !== to[0]) {
      // Dragging an end keeps the run it had; dragging a corner turns at the fixed end.
      const keepRun = i === 0 || i === last
      const hole: Hole = horizontal === keepRun ? [to[0], a[1]] : [a[0], to[1]]
      inserts.push({ at: Math.max(i, j), hole })
    }
  }
  for (const { at, hole } of inserts.sort((x, y) => y.at - x.at)) out.splice(at, 0, hole)
  return out
}
