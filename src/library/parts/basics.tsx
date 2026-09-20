import { PITCH } from '../../model/geometry'
import type { PartDef, Suggestion } from '../../model/types'
import { Upright } from './Upright'

const LED_COLORS: Record<string, string> = {
  red: '#e04444',
  yellow: '#f0c419',
  green: '#3aa655',
  blue: '#3b7ddd',
  white: '#f5f5ef',
  orange: '#f08a24',
}

export const led: PartDef = {
  id: 'led',
  name: 'LED',
  category: 'Basics',
  ref: 'D',
  defaults: { color: 'red', size: '3mm' },
  props: [
    { key: 'color', label: 'Colour', type: 'select', options: Object.keys(LED_COLORS) },
    { key: 'size', label: 'Size', type: 'select', options: ['3mm', '5mm'] },
  ],
  pins: () => [[0, 0], [1, 0]],
  pinNames: () => ['+ · anode, long leg', '− · cathode, flat side'],
  bounds: (p) => {
    const r = p.size === '5mm' ? 2.9 : 1.9
    return { x: PITCH / 2 - r, y: -r, w: 2 * r, h: 2 * r }
  },
  render: (p) => {
    const r = p.size === '5mm' ? 2.5 : 1.5
    return (
      <>
        <circle className="body" cx={PITCH / 2} cy={0} r={r + 0.4} />
        <circle className="led" cx={PITCH / 2} cy={0} r={r} style={{ fill: LED_COLORS[p.color as string] }} />
        <line className="edge" x1={PITCH / 2 + r + 0.4} y1={-r * 0.7} x2={PITCH / 2 + r + 0.4} y2={r * 0.7} />
      </>
    )
  },
}

const BAND_COLORS = ['#1b1b1b', '#7a4a21', '#d33', '#f07f1f', '#f2cf1d', '#2f9a4b', '#2f68d8', '#8246c9', '#8c8c8c', '#f4f4f0']

function resistorBands(value: string): string[] {
  const m = /^([\d.]+)\s*([kKmM]?)/.exec(value)
  if (!m) return []
  const ohms = parseFloat(m[1]) * ({ k: 1e3, K: 1e3, m: 1e6, M: 1e6 }[m[2]] ?? 1)
  if (!(ohms >= 1)) return []
  let exp = Math.floor(Math.log10(ohms)) - 1
  let digits = Math.round(ohms / 10 ** exp)
  if (digits >= 100) {
    digits /= 10
    exp++
  }
  const mult = exp < 0 ? '#c9a13b' : BAND_COLORS[Math.min(exp, 9)]
  return [BAND_COLORS[Math.floor(digits / 10)], BAND_COLORS[digits % 10], mult, '#c9a13b']
}

const RESISTORS: Suggestion[] = [
  { value: '100', hint: 'Small series resistor' },
  { value: '220', hint: 'LED on 5 V' },
  { value: '330', hint: 'LED on 3.3 V' },
  { value: '470', hint: 'Dimmer LED, LED strip data line' },
  { value: '1k', hint: 'Transistor base, very dim LED' },
  { value: '2.2k', hint: 'I²C pull-up for long wires' },
  { value: '4.7k', hint: 'I²C or 1-Wire pull-up' },
  { value: '10k', hint: 'Pull-up or pull-down, buttons' },
  { value: '47k', hint: 'Weak pull-up, voltage divider' },
  { value: '100k', hint: 'Battery voltage divider' },
  { value: '1M', hint: 'Very weak pull-down' },
]

const CERAMICS: Suggestion[] = [
  { value: '22p', hint: 'Crystal load capacitor' },
  { value: '100p', hint: 'High-frequency filtering' },
  { value: '1n', hint: 'Signal filtering' },
  { value: '10n', hint: 'Button debounce, filtering' },
  { value: '100n', hint: 'Decoupling next to every chip' },
  { value: '1µ', hint: 'Regulator input or output' },
]

const ELECTROLYTICS: Suggestion[] = [
  { value: '10µ', hint: 'Small bulk on a logic rail' },
  { value: '47µ', hint: 'Regulator output' },
  { value: '100µ', hint: 'Bulk on a 3.3 V or 5 V input' },
  { value: '220µ', hint: 'Servos, small LED strips' },
  { value: '470µ', hint: 'Motor supply' },
  { value: '1000µ', hint: 'Big motors or long LED strips' },
]

export const resistor: PartDef = {
  id: 'resistor',
  name: 'Resistor',
  category: 'Basics',
  ref: 'R',
  defaults: { value: '220' },
  props: [{ key: 'value', label: 'Value (Ω)', type: 'text', suggestions: RESISTORS }],
  pins: () => [[0, 0], [4, 0]],
  bounds: () => ({ x: -0.6, y: -1.5, w: 4 * PITCH + 1.2, h: 3 }),
  render: (p) => {
    const cx = 2 * PITCH
    const bands = resistorBands(String(p.value))
    return (
      <>
        <line className="lead" x1={0} y1={0} x2={4 * PITCH} y2={0} />
        <rect className="body" x={cx - 3.2} y={-1.2} width={6.4} height={2.4} rx={1.1} />
        {bands.map((c, i) => (
          <rect key={i} className="band" x={cx - 2.2 + i * 1.2 + (i === 3 ? 0.6 : 0)} y={-1.15} width={0.6} height={2.3} style={{ fill: c }} />
        ))}
      </>
    )
  },
}

export const ceramicCap: PartDef = {
  id: 'cap-ceramic',
  name: 'Ceramic capacitor',
  category: 'Basics',
  ref: 'C',
  defaults: { value: '100n' },
  props: [{ key: 'value', label: 'Value (F)', type: 'text', suggestions: CERAMICS }],
  pins: () => [[0, 0], [1, 0]],
  bounds: () => ({ x: -0.9, y: -1.6, w: PITCH + 1.8, h: 3.2 }),
  render: (p, view) => (
    <>
      <rect className="body cap" x={-0.6} y={-1.3} width={PITCH + 1.2} height={2.6} rx={1.2} />
      <Upright className="ink" x={PITCH / 2} y={0.45} fontSize={1.2} anchor="middle" view={view}>{p.value}</Upright>
    </>
  ),
}

export const electrolyticCap: PartDef = {
  id: 'cap-electrolytic',
  name: 'Electrolytic capacitor',
  category: 'Basics',
  ref: 'C',
  defaults: { value: '10µ', diameter: '5' },
  props: [
    { key: 'value', label: 'Value (F)', type: 'text', suggestions: ELECTROLYTICS },
    { key: 'diameter', label: 'Diameter (mm)', type: 'select', options: ['5', '6.3', '8'] },
  ],
  pins: () => [[0, 0], [1, 0]],
  pinNames: () => ['+ · long leg', '− · stripe side'],
  bounds: (p) => {
    const r = Number(p.diameter) / 2 + 0.3
    return { x: PITCH / 2 - r, y: -r, w: 2 * r, h: 2 * r }
  },
  render: (p, view) => {
    const r = Number(p.diameter) / 2
    const cx = PITCH / 2
    return (
      <>
        <circle className="body" cx={cx} cy={0} r={r} />
        <path className="stripe" d={`M ${cx + r * 0.45} ${-r * 0.89} A ${r} ${r} 0 0 1 ${cx + r * 0.45} ${r * 0.89} Z`} />
        <Upright className="ink" x={cx - r * 0.25} y={0.5} fontSize={1.3} anchor="middle" view={view}>{p.value}</Upright>
      </>
    )
  },
}

export const diode: PartDef = {
  id: 'diode',
  name: 'Diode',
  category: 'Basics',
  ref: 'D',
  defaults: { label: '1N4007' },
  props: [{ key: 'label', label: 'Part', type: 'text' }],
  pins: () => [[0, 0], [4, 0]],
  pinNames: () => ['Anode', 'Cathode · band side'],
  bounds: () => ({ x: -0.6, y: -1.6, w: 4 * PITCH + 1.2, h: 3.2 }),
  render: () => (
    <>
      <line className="lead" x1={0} y1={0} x2={4 * PITCH} y2={0} />
      <rect className="body dark" x={2 * PITCH - 2.6} y={-1.3} width={5.2} height={2.6} rx={0.4} />
      <rect className="band" x={2 * PITCH + 1.4} y={-1.3} width={0.7} height={2.6} style={{ fill: '#d9d9d2' }} />
    </>
  ),
}

const TO92_PINS: Record<string, string> = {
  E: 'E · emitter',
  B: 'B · base',
  C: 'C · collector',
  S: 'S · source',
  G: 'G · gate',
  D: 'D · drain',
}

export const transistor: PartDef = {
  id: 'to92',
  name: 'Transistor (TO-92)',
  category: 'Basics',
  ref: 'Q',
  defaults: { label: '2N2222', pinout: 'EBC' },
  props: [
    { key: 'label', label: 'Part', type: 'text' },
    { key: 'pinout', label: 'Pins (flat side)', type: 'select', options: ['EBC', 'CBE', 'ECB', 'SGD', 'GDS', 'DGS'] },
  ],
  pins: () => [[0, 0], [1, 0], [2, 0]],
  pinNames: (p) => String(p.pinout).split('').map((c) => TO92_PINS[c]),
  bounds: () => ({ x: PITCH - 2.7, y: -2.9, w: 5.4, h: 4.6 }),
  render: (p, view) => (
    <>
      <path className="body dark" d={`M ${PITCH - 2.4} 1.3 L ${PITCH + 2.4} 1.3 A 2.5 2.5 0 0 0 ${PITCH - 2.4} 1.3 Z`} transform="translate(0 -0.4)" />
      <Upright className="ink light" x={PITCH} y={-0.2} fontSize={0.9} anchor="middle" view={view}>{p.label}</Upright>
      {String(p.pinout).split('').map((c, i) => (
        <Upright key={i} className="silk" x={i * PITCH} y={2.4} anchor="middle" view={view}>{c}</Upright>
      ))}
    </>
  ),
}

export const piezo: PartDef = {
  id: 'piezo-12',
  name: 'Piezo buzzer 12mm',
  category: 'Basics',
  ref: 'BZ',
  pins: () => [[0, 0], [3, 0]],
  pinNames: () => ['+', '−'],
  bounds: () => ({ x: 1.5 * PITCH - 6.3, y: -6.3, w: 12.6, h: 12.6 }),
  render: (_, view) => {
    const cx = 1.5 * PITCH
    return (
      <>
        <circle className="body dark" cx={cx} cy={0} r={6} />
        <circle className="hole-dark" cx={cx} cy={0} r={1.1} />
        <Upright className="ink light" x={cx - 3.6} y={-2.2} fontSize={2} view={view}>+</Upright>
      </>
    )
  },
}
