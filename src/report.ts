import { analyze, at } from './analysis'
import { boardById, partById } from './library'
import { namedPins, PITCH } from './model/geometry'
import { WIRE_COLORS } from './model/routing'
import type { Doc, Wire } from './model/types'

// A plain-text description of a board for review by a person or an LLM.

const wireLength = (w: Wire) =>
  w.points.slice(1).reduce((n, p, i) => n + Math.hypot(p[0] - w.points[i][0], p[1] - w.points[i][1]), 0) * PITCH

export function describe(doc: Doc): string {
  const board = boardById(doc.board)
  const a = analyze(doc)
  const lines: string[] = []
  const out = (s = '') => lines.push(s)

  out(`PERFBOARD LAYOUT: "${doc.name}"`)
  out(`Board: ${board.name}, ${board.cols} columns × ${board.rows} rows. Holes are C<col>R<row>, 1-based, as seen from the FRONT (C1 = left, R1 = top).`)
  out('Parts on the back, or mounted upside down, are listed with the holes their legs go through (front coordinates).')
  out('Connections: a wire connects its ends, any pin whose hole it runs through, and any wire that ends on it. Wires that merely cross are insulated.')
  out("Pins in the same hole are connected, as are same-named pins on one part (two GND pins, a button's paired legs). Pin headers under modules are sockets, not shorts.")
  out()

  out('PARTS')
  for (const part of doc.parts) {
    const def = partById(part.def)
    if (!def || def.annotation) continue
    const holes = namedPins(part, def).map((p) => p.hole)
    const cols = holes.map((h) => h[0] + 1)
    const rows = holes.map((h) => h[1] + 1)
    const span = holes.length ? `C${Math.min(...cols)}–C${Math.max(...cols)} × R${Math.min(...rows)}–R${Math.max(...rows)}` : ''
    const props = Object.entries({ ...def.defaults, ...part.props })
      .filter(([, v]) => v !== '')
      .map(([k, v]) => `${k}=${v}`)
      .join(', ')
    const mount = part.flipped ? ' · upside down' : ''
    out(`${a.refs.get(part.id)}  ${def.name} · ${part.side}${mount} · rot ${part.rot}° · pins ${span}${props ? ` · ${props}` : ''}`)
  }
  out()

  out('NETS')
  a.nets.forEach((n, i) => {
    const merged = new Map<string, typeof n.pins>()
    for (const p of n.pins) merged.set(`${p.ref}.${p.name}`, [...(merged.get(`${p.ref}.${p.name}`) ?? []), p])
    const members = [...merged].map(([id, same]) => {
      const detail = same[0].detail ? ` (${same[0].detail})` : ''
      return `${id}${detail} @${same.map((p) => at(p.hole)).join(',')}`
    })
    out(`N${i + 1}  ${members.join('  —  ') || '(no pins)'}${n.wires.length ? `   [${n.wires.join(', ')}]` : ''}`)
  })
  if (!a.nets.length) out('(none)')
  out()

  out('UNCONNECTED PINS')
  for (const [ref, names] of a.loose) out(`${ref}: ${names.join(', ')}`)
  if (!a.loose.size) out('(none)')
  out()

  out('WIRES')
  for (const w of doc.wires) {
    const colour = WIRE_COLORS.find((c) => c.value === w.color)?.name.toLowerCase() ?? w.color
    const bends = w.points.slice(1, -1).map(at).join(' ')
    out(`${a.wireRefs.get(w.id)}  ${colour} · ${w.side} · ${at(w.points[0])} → ${at(w.points[w.points.length - 1])} · ${wireLength(w).toFixed(1)} mm${bends ? ` · via ${bends}` : ''}`)
  }
  if (!doc.wires.length) out('(none)')
  if (a.junctions.length) out(`Junctions (wire ends soldered onto another wire): ${a.junctions.map((j) => at(j.hole)).join(', ')}`)
  out()

  const notes = doc.parts.filter((p) => partById(p.def)?.annotation)
  if (notes.length) {
    out('NOTES')
    for (const part of notes) {
      const def = partById(part.def)!
      const props = Object.entries({ ...def.defaults, ...part.props }).map(([k, v]) => `${k}=${v}`).join(', ')
      out(`${def.name} · ${part.side} · centred ${at([part.col, part.row])} · ${props}`)
    }
    out()
  }

  out('CHECKS')
  for (const c of a.checks) out(`${c.level === 'fault' ? '!' : '·'} ${c.message}`)
  if (!a.checks.length) out('(no problems found)')

  return lines.join('\n')
}
