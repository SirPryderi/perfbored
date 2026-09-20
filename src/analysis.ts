import { docBoard, partById } from './library'
import { holeKey, holeToMm, isMirrored, namedPins, rotateHole } from './model/geometry'
import { coords } from './model/naming'
import type { Doc, Hole, PartDef, PartInstance, Side, Wire } from './model/types'

// Electrical and physical analysis of a board. Connectivity rules:
// - a wire is one conductor along its whole path;
// - pins in the same hole are connected, as are same-named pins on one part;
// - a wire connects to any pin whose hole it passes through (solder across);
// - a wire END landing anywhere on another wire makes a junction;
// - wires that merely cross are insulated from each other.

export interface Pin {
  partId: string
  ref: string
  name: string
  detail: string
  hole: Hole
}

export interface Net {
  pins: Pin[]
  wires: string[]
}

export interface Check {
  level: 'fault' | 'note'
  message: string
  holes: Hole[]
}

export interface Analysis {
  refs: Map<string, string>
  wireRefs: Map<string, string>
  nets: Net[]
  loose: Map<string, string[]>
  junctions: { hole: Hole; side: Side; color: string }[]
  checks: Check[]
}

// Every hole a wire runs through, including its ends and bends.
export function wireHoles(w: Wire): Hole[] {
  const out: Hole[] = [w.points[0]]
  for (let i = 1; i < w.points.length; i++) {
    const [a, b] = [w.points[i - 1], w.points[i]]
    const dc = b[0] - a[0]
    const dr = b[1] - a[1]
    const steps = gcd(Math.abs(dc), Math.abs(dr))
    for (let s = 1; s <= steps; s++) out.push([a[0] + (dc / steps) * s, a[1] + (dr / steps) * s])
  }
  return out
}

const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a || 1)

class Groups {
  private parent = new Map<string, string>()
  find(k: string): string {
    const p = this.parent.get(k) ?? k
    if (p === k) return k
    const root = this.find(p)
    this.parent.set(k, root)
    return root
  }
  join(a: string, b: string) {
    this.parent.set(this.find(a), this.find(b))
  }
}

function box(doc: Doc, part: PartInstance, def: PartDef) {
  const b = def.bounds({ ...def.defaults, ...part.props })
  const origin = holeToMm(docBoard(doc), [part.col, part.row])
  const corners = [
    [b.x, b.y],
    [b.x + b.w, b.y],
    [b.x, b.y + b.h],
    [b.x + b.w, b.y + b.h],
  ].map(([x, y]) => {
    const [rx, ry] = rotateHole([x, y], part.rot)
    return [origin.x + (isMirrored(part) ? -rx : rx), origin.y + ry]
  })
  const xs = corners.map((c) => c[0])
  const ys = corners.map((c) => c[1])
  return { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) }
}

export function analyze(doc: Doc): Analysis {
  const board = docBoard(doc)
  const at = coords(doc, board).hole
  const placed = doc.parts.flatMap((part) => {
    const def = partById(part.def)
    return def && !def.annotation ? [{ part, def }] : []
  })
  const defOf = new Map(placed.map(({ part, def }) => [part.id, def]))

  const refs = new Map<string, string>()
  const counters = new Map<string, number>()
  for (const { part, def } of placed) {
    const prefix = def.ref ?? 'X'
    const n = (counters.get(prefix) ?? 0) + 1
    counters.set(prefix, n)
    refs.set(part.id, `${prefix}${n}`)
  }
  const wireRefs = new Map(doc.wires.map((w, i) => [w.id, `W${i + 1}`]))

  const pins: Pin[] = placed.flatMap(({ part, def }) =>
    namedPins(part, def).map(({ hole, name }) => {
      const [short, ...rest] = name.split(' · ')
      return { partId: part.id, ref: refs.get(part.id)!, name: short, detail: rest.join(' · '), hole }
    }),
  )
  const pinsAt = new Map<string, Pin[]>()
  for (const p of pins) pinsAt.set(holeKey(p.hole), [...(pinsAt.get(holeKey(p.hole)) ?? []), p])

  const ends = new Map<string, string[]>()
  for (const w of doc.wires)
    for (const e of [w.points[0], w.points[w.points.length - 1]])
      ends.set(holeKey(e), [...(ends.get(holeKey(e)) ?? []), w.id])

  const groups = new Groups()
  const hole = (h: Hole) => `h:${holeKey(h)}`
  const checks: Check[] = []
  const junctions: Analysis['junctions'] = []

  const firstByName = new Map<string, Hole>()
  for (const p of pins) {
    const key = `${p.partId}.${p.name}`
    const first = firstByName.get(key)
    if (first) groups.join(hole(first), hole(p.hole))
    else firstByName.set(key, p.hole)
  }

  const passing = new Map<string, Set<string>>()
  for (const w of doc.wires) {
    const path = wireHoles(w)
    const [first, last] = [holeKey(w.points[0]), holeKey(w.points[w.points.length - 1])]
    for (const h of path) {
      const k = holeKey(h)
      passing.set(k, (passing.get(k) ?? new Set()).add(w.id))
      const isEnd = k === first || k === last
      const others = (ends.get(k) ?? []).filter((id) => id !== w.id)
      if (isEnd || pinsAt.has(k) || others.length) groups.join(`w:${w.id}`, hole(h))
      if (!isEnd && others.length && !pinsAt.has(k))
        junctions.push({ hole: h, side: w.side, color: doc.wires.find((o) => o.id === others[0])!.color })
      if (!isEnd && pinsAt.has(k))
        checks.push({
          level: 'note',
          message: `${wireRefs.get(w.id)} runs through ${pinsAt.get(k)!.map((p) => `${p.ref}.${p.name}`).join(', ')} at ${at(h)}, treated as soldered`,
          holes: [h],
        })
    }
  }

  const netsByRoot = new Map<string, Net>()
  const net = (key: string) => {
    const root = groups.find(key)
    if (!netsByRoot.has(root)) netsByRoot.set(root, { pins: [], wires: [] })
    return netsByRoot.get(root)!
  }
  for (const p of pins) net(hole(p.hole)).pins.push(p)
  for (const w of doc.wires) net(`w:${w.id}`).wires.push(wireRefs.get(w.id)!)

  const connected = (n: Net) => n.wires.length > 0 || new Set(n.pins.map((p) => p.partId)).size > 1
  const nets = [...netsByRoot.values()].filter(connected)
  const loose = new Map<string, string[]>()
  for (const n of netsByRoot.values())
    if (!connected(n)) for (const p of n.pins) loose.set(p.ref, [...new Set([...(loose.get(p.ref) ?? []), p.name])])

  for (const same of pinsAt.values()) {
    const parts = [...new Set(same.map((p) => p.partId))]
    const stacked = parts.some((id) => defOf.get(id)?.stacks)
    if (parts.length > 1 && !stacked)
      checks.push({
        level: 'fault',
        message: `${same.map((p) => `${p.ref}.${p.name}`).join(' and ')} share hole ${at(same[0].hole)}, so they're shorted together`,
        holes: [same[0].hole],
      })
  }

  for (const w of doc.wires)
    for (const e of [w.points[0], w.points[w.points.length - 1]]) {
      const k = holeKey(e)
      const touched = pinsAt.has(k) || (ends.get(k)?.length ?? 0) > 1 || (passing.get(k)?.size ?? 0) > 1
      if (!touched)
        checks.push({ level: 'fault', message: `${wireRefs.get(w.id)} end at ${at(e)} isn't connected to anything`, holes: [e] })
    }

  for (const p of pins) {
    const [c, r] = p.hole
    if (c < 0 || r < 0 || c >= board.cols || r >= board.rows)
      checks.push({ level: 'fault', message: `${p.ref}.${p.name} is off the board at ${at(p.hole)}`, holes: [p.hole] })
  }

  for (const n of nets) {
    const byPart = new Map<string, Pin[]>()
    for (const p of n.pins) byPart.set(p.partId, [...(byPart.get(p.partId) ?? []), p])
    for (const same of byPart.values()) {
      const names = [...new Set(same.map((p) => p.name))]
      const total = pins.filter((p) => p.partId === same[0].partId).length
      if (names.length < 2 || defOf.get(same[0].partId)?.stacks) continue
      checks.push(
        total === 2
          ? { level: 'fault', message: `${same[0].ref} is shorted: ${names.join(' and ')} are on the same net`, holes: same.map((p) => p.hole) }
          : { level: 'note', message: `${same[0].ref} has ${names.join(', ')} on the same net`, holes: same.map((p) => p.hole) },
      )
    }
  }

  for (let i = 0; i < placed.length; i++)
    for (let j = i + 1; j < placed.length; j++) {
      const [a, b] = [placed[i], placed[j]]
      if (a.part.side !== b.part.side || a.def.stacks || b.def.stacks || a.def.overlay || b.def.overlay) continue
      const p = box(doc, a.part, a.def)
      const q = box(doc, b.part, b.def)
      if (Math.min(p.x1, q.x1) - Math.max(p.x0, q.x0) > 0.3 && Math.min(p.y1, q.y1) - Math.max(p.y0, q.y0) > 0.3)
        checks.push({
          level: 'note',
          message: `${refs.get(a.part.id)} and ${refs.get(b.part.id)} overlap on the ${a.part.side}; fine if one sits raised on headers`,
          holes: [...namedPins(a.part, a.def), ...namedPins(b.part, b.def)].map((p) => p.hole),
        })
    }

  checks.sort((x, y) => (x.level === y.level ? 0 : x.level === 'fault' ? -1 : 1))
  return { refs, wireRefs, nets, loose, junctions, checks }
}
