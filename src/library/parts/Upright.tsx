import type { ReactNode } from 'react'
import type { PartView } from '../../model/types'

type Anchor = 'start' | 'middle' | 'end'

interface Props {
  x: number
  y: number
  view: PartView
  rotate?: number
  anchor?: Anchor
  className?: string
  fontSize?: number
  children: ReactNode
}

const swap: Record<Anchor, Anchor> = { start: 'end', middle: 'middle', end: 'start' }

// Text on a part that stays readable however the part is mounted and turned:
// never mirrored, and turned the right way up when it would read upside down,
// while keeping its place on the part.
export function Upright({ x, y, view, rotate = 0, anchor = 'start', className, fontSize, children }: Props) {
  const net = (((rotate + (view.flipped ? -view.rot : view.rot)) % 360) + 360) % 360
  const turn = net === 180
  let side = view.flipped && rotate % 180 === 0 ? swap[anchor] : anchor
  if (turn) side = swap[side]
  return (
    <text
      className={className}
      style={fontSize ? { fontSize } : undefined}
      transform={`translate(${x} ${y})${view.flipped ? ' scale(-1 1)' : ''} rotate(${rotate + (turn ? 180 : 0)})`}
      textAnchor={side}
      dominantBaseline={turn ? 'hanging' : undefined}
    >
      {children}
    </text>
  )
}
