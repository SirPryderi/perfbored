import { useEffect } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { partById } from '../library'
import { partPins, PITCH, propsOf } from '../model/geometry'
import { WIRE_COLORS } from '../model/routing'
import type { Hole, PartDef, PartInstance, Props, Wire } from '../model/types'
import { isSelected, useEditor } from '../store'
import { useAnalysis } from '../useAnalysis'

// What makes one part a different thing to buy: everything but the text that
// varies board to board, such as pin labels or a switch's legend.
const specs = (def: PartDef) => (def.props ?? []).filter((p) => !(p.type === 'text' && p.caption))

// A number on its own means nothing here, so it keeps its label and unit:
// "Pins 4", "Leg span 5 holes".
const summary = (def: PartDef, props: Props) =>
  specs(def)
    .filter((p) => p.type !== 'color' && props[p.key] !== '')
    .map((p) => (p.type === 'number' ? [p.label, props[p.key], p.unit].filter(Boolean).join(' ') : String(props[p.key])))
    .join(' · ')

const swatches = (def: PartDef, props: Props) =>
  specs(def).filter((p) => p.type === 'color').map((p) => String(props[p.key]))

const kind = (def: PartDef, props: Props) => def.id + specs(def).map((p) => `|${p.key}=${props[p.key]}`).join('')

const order = (ref: string) => [ref.replace(/\d+$/, ''), Number(ref.match(/\d+$/)?.[0] ?? 0)] as const

// D1, D2, D3, D7 reads as D1–D3, D7, the way a parts list is usually written.
function runs(refs: string[]) {
  const sorted = [...refs].sort((a, b) => order(a)[0].localeCompare(order(b)[0]) || order(a)[1] - order(b)[1])
  const out: string[][] = []
  for (const ref of sorted) {
    const last = out[out.length - 1]
    const prev = last?.[last.length - 1]
    const joins = prev && order(prev)[0] === order(ref)[0] && order(prev)[1] + 1 === order(ref)[1]
    if (joins) last.push(ref)
    else out.push([ref])
  }
  return out.map((run) => (run.length > 2 ? `${run[0]}–${run[run.length - 1]}` : run.join(', '))).join(', ')
}

const wireLength = (w: Wire) =>
  w.points.slice(1).reduce((n, p, i) => n + Math.hypot(p[0] - w.points[i][0], p[1] - w.points[i][1]), 0) * PITCH

interface Group {
  def: PartDef
  props: Props
  parts: PartInstance[]
  refs: string[]
}

// What to gather before soldering: one line per kind of part, with how many of
// them and which designators they are on the board.
export function Parts() {
  const { doc, selection } = useEditor(useShallow((s) => ({ doc: s.doc, selection: s.selection })))
  const { refs } = useAnalysis()
  const e = useEditor.getState
  // A panel that goes away while hovered gets no mouseleave.
  useEffect(() => () => e().setHighlight(null), [e])

  const groups = new Map<string, Group>()
  for (const part of doc.parts) {
    const def = partById(part.def)
    if (!def || def.annotation) continue
    const props = propsOf(part, def)
    const group = groups.get(kind(def, props)) ?? { def, props, parts: [], refs: [] }
    group.parts.push(part)
    group.refs.push(refs.get(part.id) ?? '?')
    groups.set(kind(def, props), group)
  }
  const tally = [...groups.values()].sort((a, b) => {
    const [ap, an] = order(a.refs[0])
    const [bp, bn] = order(b.refs[0])
    return ap.localeCompare(bp) || an - bn
  })

  const wires = WIRE_COLORS.flatMap(({ name, value }) => {
    const same = doc.wires.filter((w) => w.color === value)
    return same.length ? [{ name, value, count: same.length, mm: same.reduce((n, w) => n + wireLength(w), 0), holes: same.flatMap((w) => w.points) }] : []
  })

  // Clicking the same line again steps to the next one of that kind; with
  // shift it adds all of them to the selection.
  const step = (group: Group, all: boolean) => {
    const items = group.parts.map((p) => ({ kind: 'part' as const, id: p.id }))
    if (all) return e().select([...selection.filter((i) => !items.some((p) => p.id === i.id)), ...items])
    const i = group.parts.findIndex((p) => isSelected(selection, p.id))
    e().select([items[(i + 1) % items.length]])
  }

  if (!tally.length && !wires.length) return <p className="checks-empty">Nothing on the board yet — pick a part from the library.</p>

  return (
    <div onMouseLeave={() => e().setHighlight(null)}>
      <ul className="part-list">
        {tally.map((group) => (
          <li key={kind(group.def, group.props)}>
            <button
              aria-current={group.parts.some((p) => isSelected(selection, p.id))}
              onMouseEnter={() => e().setHighlight(group.parts.flatMap((p) => partPins(p, group.def)))}
              onClick={(ev) => step(group, ev.shiftKey)}
            >
              <span className="tally">{group.parts.length}×</span>
              <span className="part-name">
                {group.def.name}
                {summary(group.def, group.props) && <em>{summary(group.def, group.props)}</em>}
              </span>
              <span className="part-colors">
                {swatches(group.def, group.props).map((color) => (
                  <span key={color} className="swatch tiny" style={{ background: color }} />
                ))}
              </span>
              <span className="meta">{runs(group.refs)}</span>
            </button>
          </li>
        ))}
      </ul>
      {wires.length > 0 && (
        <>
          <h3>Wire to cut</h3>
          <ul className="part-list">
            {wires.map((w) => (
              <li key={w.value}>
                <button onMouseEnter={() => e().setHighlight(w.holes as Hole[])}>
                  <span className="tally">{w.count}×</span>
                  <span className="part-name">{w.name}</span>
                  <span className="part-colors"><span className="swatch tiny" style={{ background: w.value }} /></span>
                  <span className="meta">{Math.round(w.mm)} mm</span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}
