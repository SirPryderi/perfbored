import { boardOrigin, PITCH } from '../model/geometry'
import type { BoardDef } from '../model/types'

const MOUNT_INSET = 2.5

// Text that stays readable when the board is viewed mirrored from the back.
function Label({ x, y, anchor, mirrored, className = 'axis', children }: {
  x: number
  y: number
  anchor: 'start' | 'middle' | 'end'
  mirrored: boolean
  className?: string
  children: React.ReactNode
}) {
  const flipped = mirrored && anchor !== 'middle' ? (anchor === 'start' ? 'end' : 'start') : anchor
  return (
    <text className={className} transform={`translate(${x} ${y})${mirrored ? ' scale(-1 1)' : ''}`} textAnchor={flipped}>
      {children}
    </text>
  )
}

export function BoardView({ board, mirrored }: { board: BoardDef; mirrored: boolean }) {
  const { x: ox, y: oy } = boardOrigin(board)
  const { width: w, height: h } = board
  const corners = [
    [MOUNT_INSET, MOUNT_INSET],
    [w - MOUNT_INSET, MOUNT_INSET],
    [MOUNT_INSET, h - MOUNT_INSET],
    [w - MOUNT_INSET, h - MOUNT_INSET],
  ]
  const holes = []
  for (let c = 0; c < board.cols; c++) {
    for (let r = 0; r < board.rows; r++) {
      const x = ox + c * PITCH
      const y = oy + r * PITCH
      if (Math.min(x, w - x) < 4 && Math.min(y, h - y) < 4) continue
      holes.push(<circle key={`${c},${r}`} className="hole" cx={x} cy={y} r={0.38} />)
    }
  }
  const ticks = (count: number) => Array.from({ length: count }, (_, i) => i).filter((i) => i === 0 || (i + 1) % 5 === 0)

  return (
    <g>
      <rect className="board" x={0} y={0} width={w} height={h} rx={1.5} />
      {corners.map(([x, y], i) => (
        <circle key={i} className="mount" cx={x} cy={y} r={1.4} />
      ))}
      {holes}
      {ticks(board.cols).map((c) => (
        <Label key={`c${c}`} x={ox + c * PITCH} y={-1.6} anchor="middle" mirrored={mirrored}>{c + 1}</Label>
      ))}
      {ticks(board.rows).map((r) => (
        <Label key={`r${r}`} x={-1.6} y={oy + r * PITCH + 0.6} anchor="end" mirrored={mirrored}>{r + 1}</Label>
      ))}
      <Label className="axis caption" x={mirrored ? w : 0} y={h + 4.5} anchor={mirrored ? 'end' : 'start'} mirrored={mirrored}>
        {board.name} · {board.cols} × {board.rows} holes · {mirrored ? 'back' : 'front'}
      </Label>
    </g>
  )
}
