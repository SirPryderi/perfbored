import { partById } from './library'
import { newId } from './model/doc'
import { isMirrored, partPins } from './model/geometry'
import type { Doc, Hole, PartInstance, Rotation, Wire } from './model/types'

// Pure edits on a set of parts and wires, picked by id. Everything that acts on
// the selection goes through these, and turning the board is a turn of all.

export interface Items {
  parts: PartInstance[]
  wires: Wire[]
}

export const pick = (doc: Doc, ids: Set<string>): Items => ({
  parts: doc.parts.filter((p) => ids.has(p.id)),
  wires: doc.wires.filter((w) => ids.has(w.id)),
})

// Every hole the items occupy: legs and wire points, or where a part without
// legs (an annotation) is anchored.
export function holesOf({ parts, wires }: Items): Hole[] {
  const legs = parts.flatMap((p) => {
    const def = partById(p.def)
    const pins = def ? partPins(p, def) : []
    return pins.length ? pins : [[p.col, p.row] as Hole]
  })
  return [...legs, ...wires.flatMap((w) => w.points)]
}

// The hole nearest the middle of the items.
export function centreOf(items: Items): Hole {
  const holes = holesOf(items)
  if (!holes.length) return [0, 0]
  const mid = (i: 0 | 1) => Math.round((Math.min(...holes.map((h) => h[i])) + Math.max(...holes.map((h) => h[i]))) / 2)
  return [mid(0), mid(1)]
}

function update(doc: Doc, ids: Set<string>, part: (p: PartInstance) => PartInstance, wire: (w: Wire) => Wire): Doc {
  return {
    ...doc,
    parts: doc.parts.map((p) => (ids.has(p.id) ? part(p) : p)),
    wires: doc.wires.map((w) => (ids.has(w.id) ? wire(w) : w)),
  }
}

export const move = (doc: Doc, ids: Set<string>, dc: number, dr: number): Doc =>
  update(
    doc,
    ids,
    (p) => ({ ...p, col: p.col + dc, row: p.row + dr }),
    (w) => ({ ...w, points: w.points.map(([c, r]): Hole => [c + dc, r + dr]) }),
  )

// Turns items a quarter (or half) turn, carrying each hole through `map`. A
// mirrored part turns the other way, since its mirror is applied after its own
// rotation.
export function turn(doc: Doc, ids: Set<string>, delta: 90 | -90 | 180, map: (h: Hole) => Hole): Doc {
  return update(
    doc,
    ids,
    (p) => {
      const [col, row] = map([p.col, p.row])
      const spin = isMirrored(p) ? -delta : delta
      return { ...p, col, row, rot: (((p.rot + spin + 360) % 360) as Rotation) }
    },
    (w) => ({ ...w, points: w.points.map(map) }),
  )
}

// A quarter turn about a hole, the same way a part's own rotation goes.
export const about =
  ([pc, pr]: Hole, delta: 90 | -90) =>
  ([c, r]: Hole): Hole =>
    delta === 90 ? [pc - (r - pr), pr + (c - pc)] : [pc + (r - pr), pr - (c - pc)]

// Mirroring a part around its origin moves it; this is the column shift that
// puts its legs back in the same holes.
export function mirrorShift(part: PartInstance) {
  const def = partById(part.def)
  const cols = def ? partPins(part, def).map(([c]) => c) : []
  return cols.length ? Math.min(...cols) + Math.max(...cols) - 2 * part.col : 0
}

// Through the board to the other side, every leg and wire staying in its holes.
export const otherSide = (doc: Doc, ids: Set<string>): Doc =>
  update(
    doc,
    ids,
    (p) => (partById(p.def)?.annotation ? p : { ...p, side: p.side === 'front' ? 'back' : 'front', col: p.col + mirrorShift(p) }),
    (w) => ({ ...w, side: w.side === 'front' ? 'back' : 'front' }),
  )

// Fresh copies, shifted by (dc, dr).
export const copies = ({ parts, wires }: Items, dc = 0, dr = 0): Items => ({
  parts: parts.map((p) => ({ ...p, id: newId(), col: p.col + dc, row: p.row + dr })),
  wires: wires.map((w) => ({ ...w, id: newId(), points: w.points.map(([c, r]): Hole => [c + dc, r + dr]) })),
})

export const remove = (doc: Doc, ids: Set<string>): Doc => ({
  ...doc,
  parts: doc.parts.filter((p) => !ids.has(p.id)),
  wires: doc.wires.filter((w) => !ids.has(w.id)),
})
