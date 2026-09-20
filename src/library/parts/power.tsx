import type { ReactNode } from 'react'
import { PITCH } from '../../model/geometry'
import type { PartDef, Props, Suggestion } from '../../model/types'
import { Upright } from './Upright'

// DC-005 style 5.5 × 2.1 mm barrel jack seen from above, mouth towards the top.
// Its T of pins (6 mm in line, 4.7 mm to the side) rounds to the 2.54 mm grid.
export const barrelJack: PartDef = {
  id: 'barrel-jack',
  name: 'DC barrel jack',
  category: 'Power',
  ref: 'J',
  pads: true,
  pins: () => [[0, 0], [0, -2], [2, -1]],
  pinNames: () => [
    'Center pin · usually +',
    'Sleeve · usually −',
    'Switch · touches the sleeve only when no plug is in',
  ],
  bounds: () => ({ x: -4.2, y: -14.6, w: 9.6, h: 16.8 }),
  render: () => (
    <>
      <rect className="body dark" x={-4.2} y={-12.2} width={9.4} height={14.4} rx={0.6} />
      <rect className="body dark" x={-3.4} y={-14.6} width={7.8} height={3} rx={0.4} />
      <circle className="socket" cx={0.5} cy={-13.1} r={0.9} />
      <line className="edge light" x1={-3.4} y1={-11.4} x2={4.4} y2={-11.4} />
    </>
  ),
}

const RATINGS: Suggestion[] = [
  { value: '500mA', hint: 'Small logic boards, sensors' },
  { value: '1A', hint: 'ESP32 or Arduino with a few LEDs' },
  { value: '2A', hint: 'Small motors, LED strips' },
  { value: '3A', hint: 'Two small motors, servos' },
  { value: '5A', hint: 'Bigger motors, long LED strips' },
  { value: '10A', hint: 'Battery main line' },
]

interface FuseStyle {
  span: number
  darkText?: boolean
  bounds: (span: number) => { x: number; y: number; w: number; h: number }
  draw: (span: number) => ReactNode
}

const FUSES: Record<string, FuseStyle> = {
  '5×20 glass holder': {
    span: 9,
    bounds: (s) => ({ x: -1.6, y: -4, w: s * PITCH + 3.2, h: 8 }),
    draw: (s) => (
      <>
        <rect className="body dark" x={-1.6} y={-4} width={s * PITCH + 3.2} height={8} rx={0.8} />
        <rect className="body metal" x={-1} y={-2.2} width={4} height={4.4} rx={0.4} />
        <rect className="body metal" x={s * PITCH - 3} y={-2.2} width={4} height={4.4} rx={0.4} />
        <rect className="glass-tube" x={1.4} y={-2.5} width={s * PITCH - 2.8} height={5} rx={2.5} />
        <line className="lead" x1={1.8} y1={0} x2={s * PITCH - 1.8} y2={0} />
      </>
    ),
  },
  'resettable PTC': {
    span: 2,
    darkText: true,
    bounds: (s) => ({ x: (s * PITCH) / 2 - 4, y: -2.2, w: 8, h: 4.4 }),
    draw: (s) => <rect className="body ptc" x={(s * PITCH) / 2 - 3.8} y={-1.8} width={7.6} height={3.6} rx={1.8} />,
  },
  'TR5 micro fuse': {
    span: 2,
    bounds: (s) => ({ x: (s * PITCH) / 2 - 4.3, y: -4.3, w: 8.6, h: 8.6 }),
    draw: (s) => <circle className="body dark" cx={(s * PITCH) / 2} cy={0} r={4.2} />,
  },
  'mini blade holder': {
    span: 2,
    bounds: (s) => ({ x: (s * PITCH) / 2 - 6, y: -3.2, w: 12, h: 6.4 }),
    draw: (s) => (
      <>
        <rect className="body dark" x={(s * PITCH) / 2 - 6} y={-3.2} width={12} height={6.4} rx={0.6} />
        <rect className="body blade" x={(s * PITCH) / 2 - 5.2} y={-1.9} width={10.4} height={3.8} rx={0.5} />
      </>
    ),
  },
}

const fuse = (p: Props) => FUSES[String(p.type)] ?? FUSES['5×20 glass holder']

export const fuseHolder: PartDef = {
  id: 'fuse',
  name: 'Fuse',
  category: 'Power',
  ref: 'F',
  defaults: { type: '5×20 glass holder', rating: '2A' },
  props: [
    { key: 'type', label: 'Type', type: 'select', options: Object.keys(FUSES) },
    { key: 'rating', label: 'Rating', type: 'text', suggestions: RATINGS },
  ],
  pins: (p) => [[0, 0], [fuse(p).span, 0]],
  pinNames: () => ['1 · supply side', '2 · load side'],
  bounds: (p) => fuse(p).bounds(fuse(p).span),
  render: (p, view) => {
    const f = fuse(p)
    const b = f.bounds(f.span)
    return (
      <>
        {f.draw(f.span)}
        <Upright className={f.darkText ? 'ink' : 'ink light'} x={(f.span * PITCH) / 2} y={b.y + b.h - 0.6} fontSize={1.1} anchor="middle" view={view}>
          {p.rating}
        </Upright>
      </>
    )
  },
}
