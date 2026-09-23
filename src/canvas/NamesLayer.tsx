import { partById } from '../library'
import { holeToMm, partPins } from '../model/geometry'
import type { BoardDef, Bounds, Doc, Side } from '../model/types'

const FONT = 2.2
const ROW = 3.2 // height of a stacked tag on a side edge
const GAP = 2.4 // between two tags sharing an edge
const GUTTER = 3.2 // first leader lane, measured from the board edge
const CAPTION = 7.5 // the board's own caption sits under the bottom edge
const LANE = 1.5 // between leader lanes
const CLEAR = 0.8 // between the last lane and the text

type Edge = 'left' | 'right' | 'top' | 'bottom'

const SIDEWAYS: Record<Edge, boolean> = { left: true, right: true, top: false, bottom: false }

interface Tag {
  id: string
  name: string
  edge: Edge
  far: boolean
  anchor: { x: number; y: number }
  pos: number // along the edge: y on a side, x on the top or bottom
  size: number // how much of the edge it takes
  lane: number
  base: number // distance from the board edge to the first leader lane
  text: number // distance from the board edge to the text
}

// Where a name goes: out to the nearer side edge, unless the part is much
// closer to the top or bottom. Sideways leaders read better and leave the
// board's own top and bottom clear, so they win ties by a wide margin.
function edgeFor(board: BoardDef, box: Bounds): Edge {
  const left = box.x
  const right = board.width - (box.x + box.w)
  const top = box.y
  const bottom = board.height - (box.y + box.h)
  const sideways = Math.min(left, right) <= Math.min(top, bottom) + board.height / 4
  return sideways ? (left <= right ? 'left' : 'right') : top <= bottom ? 'top' : 'bottom'
}

export interface Names {
  tags: Tag[]
  bounds: Bounds
}

// Tags stack along their edge without overlapping, and their leaders run out in
// lanes: a leader only shares a lane with one it cannot collide with.
export function layoutNames(doc: Doc, board: BoardDef, shown: Side): Names {
  const tags: Tag[] = []
  for (const part of doc.parts) {
    const def = partById(part.def)
    if (!def) continue
    const name = String({ ...def.defaults, ...part.props }.name ?? '').trim()
    const points = name ? partPins(part, def).map((h) => holeToMm(board, h)) : []
    if (!points.length) continue
    const xs = points.map((p) => p.x)
    const ys = points.map((p) => p.y)
    const box = { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) }
    const edge = edgeFor(board, box)
    const mid = { x: box.x + box.w / 2, y: box.y + box.h / 2 }
    tags.push({
      id: part.id,
      name,
      edge,
      far: part.side !== shown,
      anchor: {
        x: edge === 'left' ? box.x : edge === 'right' ? box.x + box.w : mid.x,
        y: edge === 'top' ? box.y : edge === 'bottom' ? box.y + box.h : mid.y,
      },
      pos: SIDEWAYS[edge] ? mid.y - ROW / 2 : mid.x,
      size: SIDEWAYS[edge] ? ROW : name.length * FONT * 0.55,
      lane: 0,
      base: edge === 'bottom' ? CAPTION : GUTTER,
      text: 0,
    })
  }

  const reach: Record<Edge, number> = { left: 0, right: 0, top: 0, bottom: 0 }
  for (const edge of ['left', 'right', 'top', 'bottom'] as Edge[]) {
    const group = tags.filter((t) => t.edge === edge).sort((a, b) => a.pos - b.pos)
    const limit = SIDEWAYS[edge] ? board.height : board.width
    let end = -Infinity
    for (const tag of group) {
      tag.pos = Math.max(Math.min(tag.pos, limit - tag.size), end + GAP)
      end = tag.pos + tag.size
    }
    // A lane is free for this leader when the last one in it ended before this
    // one starts, so leaders only stack up where they would really cross.
    const lanes: number[] = []
    for (const tag of group) {
      const from = SIDEWAYS[tag.edge] ? tag.anchor.y : tag.anchor.x
      const [a, b] = from < tag.pos ? [from, tag.pos + tag.size] : [tag.pos, from]
      const free = lanes.findIndex((last) => last < a - GAP / 2)
      tag.lane = free < 0 ? lanes.length : free
      lanes[tag.lane] = b
    }
    if (!group.length) continue
    const base = edge === 'bottom' ? CAPTION : GUTTER
    const text = base + lanes.length * LANE + CLEAR
    for (const tag of group) tag.text = text
    reach[edge] = text + (SIDEWAYS[edge] ? Math.max(...group.map((t) => t.name.length * FONT * 0.55)) : FONT) + CLEAR
  }

  return {
    tags,
    bounds: {
      x: -reach.left,
      y: -reach.top,
      w: board.width + reach.left + reach.right,
      h: board.height + reach.top + reach.bottom,
    },
  }
}

// Text that stays readable when the board is viewed mirrored from the back.
function Text({ x, y, anchor, mirrored, children }: {
  x: number
  y: number
  anchor: 'start' | 'end'
  mirrored: boolean
  children: string
}) {
  return (
    <text
      className="name-text"
      transform={`translate(${x} ${y})${mirrored ? ' scale(-1 1)' : ''}`}
      textAnchor={mirrored === (anchor === 'start') ? 'end' : 'start'}
      dominantBaseline="middle"
    >
      {children}
    </text>
  )
}

export function NamesLayer({ names, board, mirrored }: { names: Names; board: BoardDef; mirrored: boolean }) {
  return (
    <g className="names">
      {names.tags.map((tag) => {
        const out = (d: number) =>
          tag.edge === 'left' ? -d : tag.edge === 'right' ? board.width + d : tag.edge === 'top' ? -d : board.height + d
        const gutter = out(tag.base + tag.lane * LANE)
        const text = out(tag.text)
        const { x, y } = tag.anchor
        const lead = SIDEWAYS[tag.edge]
          ? `M ${x} ${y} H ${gutter} V ${tag.pos + ROW / 2} H ${text}`
          : `M ${x} ${y} V ${gutter} H ${tag.pos} V ${text}`
        return (
          <g key={tag.id} className={tag.far ? 'name-tag far' : 'name-tag'}>
            <path className="name-lead" d={lead} />
            <circle className="name-dot" cx={x} cy={y} r={0.35} />
            {SIDEWAYS[tag.edge] ? (
              <Text
                x={text + (tag.edge === 'left' ? -CLEAR : CLEAR)}
                y={tag.pos + ROW / 2}
                anchor={tag.edge === 'left' ? 'end' : 'start'}
                mirrored={mirrored}
              >
                {tag.name}
              </Text>
            ) : (
              <Text x={tag.pos + CLEAR} y={text} anchor="start" mirrored={mirrored}>{tag.name}</Text>
            )}
          </g>
        )
      })}
    </g>
  )
}
