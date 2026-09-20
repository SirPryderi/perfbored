import { holeToMm } from '../model/geometry'
import type { BoardDef, Hole } from '../model/types'

interface Props {
  points: Hole[]
  color: string
  board: BoardDef
  id?: string
  far?: boolean
  selected?: boolean
  draft?: boolean
}

export function WireHandles({ points, board }: { points: Hole[]; board: BoardDef }) {
  return (
    <g>
      {points.map((p, i) => {
        const { x, y } = holeToMm(board, p)
        return <rect key={i} className="wire-handle" x={x - 0.65} y={y - 0.65} width={1.3} height={1.3} rx={0.25} data-vertex={i} />
      })}
    </g>
  )
}

export function WireView({ points, color, board, id, far, selected, draft }: Props) {
  const mm = points.map((p) => holeToMm(board, p))
  const d = mm.map(({ x, y }) => `${x},${y}`).join(' ')
  const cls = ['wire', far && 'far', draft && 'draft'].filter(Boolean).join(' ')
  const ends = [mm[0], mm[mm.length - 1]]
  return (
    <g className={cls}>
      {selected && <polyline className="wire-selected" points={d} />}
      <polyline className="wire-casing" points={d} />
      <polyline className="wire-core" points={d} style={{ stroke: color }} />
      {ends.map((p, i) => (
        <circle key={i} className="wire-end" cx={p.x} cy={p.y} r={0.62} style={{ fill: color }} />
      ))}
      {id && !far && <polyline className="wire-hit" points={d} data-wire={id} />}
    </g>
  )
}
