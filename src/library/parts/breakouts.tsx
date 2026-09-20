import { PITCH } from '../../model/geometry'
import type { Hole, PartDef, Props } from '../../model/types'
import { columnLabels, splitLabels } from './labels'
import { Upright } from './Upright'

interface Breakout {
  id: string
  name: string
  category: string
  gap: (p: Props) => number
  count?: (p: Props) => number
  chip?: string
  title?: (p: Props) => string
  defaults: Props
  props?: PartDef['props']
  describe?: Record<string, string>
}

// One or two columns of header pins along the board's length, with the edge
// half a pitch past the outer pins so modules tile side by side. Pin labels are
// editable to match the silkscreen; without a pin count they also set it.
export function breakout(b: Breakout): PartDef {
  const gap = (p: Props) => Math.max(0, b.gap(p))
  const rows = (p: Props) => (b.count ? Math.max(1, b.count(p)) : Math.max(splitLabels(p.left).length, splitLabels(p.right).length, 1))
  const column = (p: Props, key: 'left' | 'right') => {
    const given = splitLabels(p[key])
    return b.count ? Array.from({ length: rows(p) }, (_, i) => given[i] ?? '') : given
  }
  const columns = (p: Props) => ({ left: column(p, 'left'), right: gap(p) > 0 ? column(p, 'right') : [] })
  const size = (p: Props) => ({ w: (gap(p) + 1) * PITCH, h: rows(p) * PITCH })
  const edge = -PITCH / 2
  return {
    id: b.id,
    name: b.name,
    category: b.category,
    flippable: true,
    pads: true,
    ref: 'U',
    defaults: b.defaults,
    props: [...(b.props ?? []), { key: 'left', label: 'Left pins', type: 'text' }, { key: 'right', label: 'Right pins', type: 'text' }],
    pinLabel: columnLabels('left', 'right', (p) => columns(p).left.length),
    pins: (p) => {
      const { left, right } = columns(p)
      return [...left.map((_, i): Hole => [0, i]), ...right.map((_, i): Hole => [gap(p), i])]
    },
    pinNames: (p) => {
      const { left, right } = columns(p)
      return [...left, ...right].map((l, i) => (l && b.describe?.[l] ? `${l} · ${b.describe[l]}` : l || `Pin ${i + 1}`))
    },
    bounds: (p) => ({ x: edge, y: edge, ...size(p) }),
    render: (p, view) => {
      const { w, h } = size(p)
      const { left, right } = columns(p)
      const cx = (gap(p) * PITCH) / 2
      const cy = edge + h / 2
      const chip = Math.min(6, gap(p) * PITCH - 9.5)
      const title = b.title?.(p)
      return (
        <>
          <rect className="body pcb" x={edge} y={edge} width={w} height={h} rx={0.5} />
          {b.chip && (
            <>
              <rect className="body dark" x={cx - chip / 2} y={cy - 3.5} width={chip} height={7} rx={0.4} />
              <Upright className="ink light" x={cx + 0.3} y={cy} rotate={90} anchor="middle" fontSize={0.9} view={view}>
                {b.chip}
              </Upright>
            </>
          )}
          {title && gap(p) >= 2 && (
            <Upright className="ink" x={cx + 0.45} y={cy} rotate={gap(p) >= 7 ? 0 : 90} anchor="middle" fontSize={1.3} view={view}>
              {title}
            </Upright>
          )}
          {left.map((l, i) => (
            <Upright key={`l${i}`} className="silk" x={1.3} y={i * PITCH + 0.4} view={view}>{l}</Upright>
          ))}
          {right.map((l, i) => (
            <Upright key={`r${i}`} className="silk" x={gap(p) * PITCH - 1.3} y={i * PITCH + 0.4} anchor="end" view={view}>
              {l}
            </Upright>
          ))}
        </>
      )
    },
  }
}

export const genericBreakout = breakout({
  id: 'breakout',
  name: 'Breakout board',
  category: 'Breakouts',
  gap: (p) => Number(p.width) - 1,
  count: (p) => Number(p.pins),
  title: (p) => String(p.label),
  defaults: { label: 'Breakout', pins: 6, width: 6, left: '', right: '' },
  props: [
    { key: 'label', label: 'Label', type: 'text' },
    { key: 'pins', label: 'Pins along length', type: 'number', min: 1, max: 40 },
    { key: 'width', label: 'Width in holes', type: 'number', min: 1, max: 20 },
  ],
})

const MOTOR = {
  AO1: 'Motor A output',
  AO2: 'Motor A output',
  BO1: 'Motor B output',
  BO2: 'Motor B output',
  GND: 'Ground',
}

export const tb6612 = breakout({
  id: 'tb6612fng',
  name: 'TB6612FNG dual motor driver',
  category: 'Motor drivers',
  chip: 'TB6612',
  gap: () => 6,
  defaults: { left: 'PWMA AIN2 AIN1 STBY BIN1 BIN2 PWMB GND', right: 'VM VCC GND AO1 AO2 BO2 BO1 GND' },
  describe: {
    ...MOTOR,
    PWMA: 'Motor A speed (PWM)',
    AIN1: 'Motor A direction',
    AIN2: 'Motor A direction',
    PWMB: 'Motor B speed (PWM)',
    BIN1: 'Motor B direction',
    BIN2: 'Motor B direction',
    STBY: 'Standby, pull high to run',
    VM: 'Motor supply, up to 15 V',
    VCC: 'Logic supply, 2.7–5.5 V',
  },
})

export const drv8833 = breakout({
  id: 'drv8833',
  name: 'DRV8833 dual motor driver',
  category: 'Motor drivers',
  chip: 'DRV8833',
  gap: () => 5,
  defaults: { left: 'EEP IN1 IN2 IN3 IN4 ULT', right: 'VCC GND OUT1 OUT2 OUT3 OUT4' },
  describe: {
    ...MOTOR,
    IN1: 'Motor A input, PWM for speed',
    IN2: 'Motor A input, PWM for speed',
    IN3: 'Motor B input, PWM for speed',
    IN4: 'Motor B input, PWM for speed',
    AIN1: 'Motor A input, PWM for speed',
    AIN2: 'Motor A input, PWM for speed',
    BIN1: 'Motor B input, PWM for speed',
    BIN2: 'Motor B input, PWM for speed',
    OUT1: 'Motor A output',
    OUT2: 'Motor A output',
    OUT3: 'Motor B output',
    OUT4: 'Motor B output',
    EEP: 'Sleep, pull high to enable',
    SLP: 'Sleep, pull high to enable',
    ULT: 'Fault, pulled low on fault',
    FLT: 'Fault, pulled low on fault',
    VCC: 'Motor and logic supply, 2.7–10.8 V',
    VM: 'Motor supply, 2.7–10.8 V',
  },
})
