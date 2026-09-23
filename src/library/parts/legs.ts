import { PITCH } from '../../model/geometry'
import type { Bounds, PropSpec, Props } from '../../model/types'

// Two legs that get bent to whatever spacing suits the layout. The span is how
// many holes the part takes from one leg to the other, both included, stored
// in the `span` prop on every part that has one.
export function legSpan(min: number, max: number) {
  const spec: PropSpec = { key: 'span', label: 'Leg span', type: 'number', min, max, unit: 'holes' }
  // Holes from the first leg to the second.
  const gaps = (p: Props) => Math.min(max, Math.max(min, Math.round(Number(p.span)) || min)) - 1
  // The legs as drawn from the first pin: the body sits centred between them.
  const length = (p: Props) => gaps(p) * PITCH
  return { spec, gaps, length }
}

// A body between two legs also covers the leads running out to the pins.
export const withLeads = (length: number, body: Bounds): Bounds => {
  const x = Math.min(body.x, -0.6)
  const y = Math.min(body.y, -0.6)
  return { x, y, w: Math.max(body.x + body.w, length + 0.6) - x, h: Math.max(body.y + body.h, 0.6) - y }
}
