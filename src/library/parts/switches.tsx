import { PITCH } from '../../model/geometry'
import type { PartDef } from '../../model/types'
import { Upright } from './Upright'

function tactile(id: string, name: string, span: number, size: number, cap: number): PartDef {
  const cx = (span * PITCH) / 2
  const cy = PITCH
  return {
    id,
    name,
    category: 'Switches',
    ref: 'SW',
    defaults: { label: '' },
    props: [{ key: 'label', label: 'Label', type: 'text' }],
    pins: () => [[0, 0], [span, 0], [0, 2], [span, 2]],
    pinNames: () => {
      const side = (s: string, other: string) => `${s} · always joined to the other ${s}, pressing joins it to ${other}`
      return [side('1', '2'), side('1', '2'), side('2', '1'), side('2', '1')]
    },
    bounds: () => ({ x: cx - size / 2, y: cy - size / 2, w: size, h: size }),
    render: (p, view) => (
      <>
        <rect className="body" x={cx - size / 2} y={cy - size / 2} width={size} height={size} rx={size / 10} />
        <circle className="edge" cx={cx} cy={cy} r={cap} />
        {p.label ? (
          <Upright className="ink muted" x={cx + size / 2 + 1.2} y={cy + 0.9} fontSize={2.6} view={view}>{p.label}</Upright>
        ) : null}
      </>
    ),
  }
}

export const button6 = tactile('button-6x6', 'Tactile button 6×6', 3, 6, 1.75)
export const button12 = tactile('button-12x12', 'Tactile button 12×12', 5, 12, 3.6)

// 7 mm self-locking push switch, DPDT: each row of three is one pole with the
// common in the middle.
export const pushLatch: PartDef = {
  id: 'push-latch-6',
  name: 'Push switch 6-pin (latching)',
  category: 'Switches',
  ref: 'SW',
  pins: () => [[0, 0], [1, 0], [2, 0], [0, 2], [1, 2], [2, 2]],
  pinNames: () =>
    ['A', 'B'].flatMap((pole) => [
      `${pole}1 · pole ${pole}, joined to ${pole} COM in one position`,
      `${pole} COM · pole ${pole} common`,
      `${pole}2 · pole ${pole}, joined to ${pole} COM in the other position`,
    ]),
  bounds: () => ({ x: PITCH - 3.6, y: PITCH - 3.6, w: 7.2, h: 7.2 }),
  render: () => (
    <>
      <rect className="body" x={PITCH - 3.5} y={PITCH - 3.5} width={7} height={7} rx={0.5} />
      <rect className="body dark" x={PITCH - 1.9} y={PITCH - 1.9} width={3.8} height={3.8} rx={0.6} />
    </>
  ),
}

// Sliding SPDT switch: the middle pin is common, the knob joins it to one side.
export const slideSwitch: PartDef = {
  id: 'slide-spdt',
  name: 'Slide switch (SPDT)',
  category: 'Switches',
  ref: 'SW',
  defaults: { pitch: '2.54 mm' },
  props: [{ key: 'pitch', label: 'Pin spacing', type: 'select', options: ['2.54 mm', '5.08 mm'] }],
  pins: (p) => {
    const s = p.pitch === '5.08 mm' ? 2 : 1
    return [[0, 0], [s, 0], [2 * s, 0]]
  },
  pinNames: () => ['1 · joined to COM with the knob on this side', 'COM · common', '2 · joined to COM with the knob on this side'],
  bounds: (p) => {
    const span = (p.pitch === '5.08 mm' ? 4 : 2) * PITCH
    return { x: -2.3, y: -3.4, w: span + 4.6, h: 5.2 }
  },
  render: (p) => {
    const span = (p.pitch === '5.08 mm' ? 4 : 2) * PITCH
    const cx = span / 2
    return (
      <>
        <rect className="body metal" x={-2.2} y={-1.8} width={span + 4.4} height={3.6} rx={0.4} />
        <rect className="cavity" x={cx - 2.4} y={-1.1} width={4.8} height={2.2} rx={0.3} />
        <rect className="body dark" x={cx - 2.3} y={-3.3} width={2} height={3.4} rx={0.3} />
      </>
    )
  },
}
