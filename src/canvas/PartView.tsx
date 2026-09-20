import { holeToMm, inflate, partPins, partTransform, PITCH } from '../model/geometry'
import type { BoardDef, PartDef, PartInstance, Side } from '../model/types'

export interface Placed {
  part: PartInstance
  def: PartDef
}

interface BodyProps extends Placed {
  board: BoardDef
  far?: boolean
  ghost?: boolean
}

export function PartBody({ part, def, board, far, ghost }: BodyProps) {
  const props = { ...def.defaults, ...part.props }
  const b = def.bounds(props)
  const cls = ['part', far && 'far', ghost && 'ghost'].filter(Boolean).join(' ')
  return (
    <g className={cls} transform={partTransform(board, part)} data-part={ghost || far ? undefined : part.id}>
      <rect className="hit" x={b.x} y={b.y} width={b.w} height={b.h} />
      {def.render(props, { flipped: !!part.flipped, rot: part.rot })}
      {def.pads &&
        def.pins(props).map(([c, r]) => <circle key={`${c},${r}`} className="pad-top" cx={c * PITCH} cy={r * PITCH} r={0.72} />)}
    </g>
  )
}

interface PinsProps {
  items: Placed[]
  board: BoardDef
  facing: Side
  conflicts?: Set<string>
  ghost?: boolean
}

// Every through-hole pin shows on both sides: as a ring where the part sits,
// and as a solder joint where its leg pokes out the other side.
export function PinsLayer({ items, board, facing, conflicts, ghost }: PinsProps) {
  return (
    <g className={ghost ? 'pins ghost' : 'pins'}>
      {items.flatMap(({ part, def }) =>
        partPins(part, def).map(([c, r]) => {
          const { x, y } = holeToMm(board, [c, r])
          const cls = ['pin', part.side === facing ? 'near' : 'far', conflicts?.has(`${c},${r}`) && 'conflict']
          return (
            <circle
              key={`${part.id}:${c},${r}`}
              className={cls.filter(Boolean).join(' ')}
              cx={x}
              cy={y}
              r={0.72}
              data-part={ghost ? undefined : part.id}
            />
          )
        }),
      )}
    </g>
  )
}

export function SelectionOutline({ part, def, board }: Placed & { board: BoardDef }) {
  const b = inflate(def.bounds({ ...def.defaults, ...part.props }), 0.9)
  return (
    <g transform={partTransform(board, part)}>
      <rect className="selection" x={b.x} y={b.y} width={b.w} height={b.h} rx={1} />
    </g>
  )
}
