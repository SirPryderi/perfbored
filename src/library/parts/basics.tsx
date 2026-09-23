import { PITCH } from '../../model/geometry'
import type { PartDef, Suggestion } from '../../model/types'
import { legSpan, withLeads } from './legs'
import { Upright } from './Upright'

const LED_COLORS: Record<string, string> = {
  red: '#e04444',
  yellow: '#f0c419',
  green: '#3aa655',
  blue: '#3b7ddd',
  white: '#f5f5ef',
  orange: '#f08a24',
}

// Radial parts sit on legs 2.54 mm apart; bending them out is common.
const radial = legSpan(2, 5)

export const led: PartDef = {
  id: 'led',
  name: 'LED',
  category: 'Basics',
  ref: 'D',
  defaults: { color: 'red', size: '3mm', span: 2 },
  props: [
    { key: 'color', label: 'Colour', type: 'select', options: Object.keys(LED_COLORS) },
    { key: 'size', label: 'Size', type: 'select', options: ['3mm', '5mm'] },
    radial.spec,
  ],
  pins: (p) => [[0, 0], [radial.gaps(p), 0]],
  pinNames: () => ['+ · anode, long leg', '− · cathode, flat side'],
  bounds: (p) => {
    const r = p.size === '5mm' ? 2.9 : 1.9
    const cx = radial.length(p) / 2
    return withLeads(radial.length(p), { x: cx - r, y: -r, w: 2 * r, h: 2 * r })
  },
  render: (p) => {
    const r = p.size === '5mm' ? 2.5 : 1.5
    const cx = radial.length(p) / 2
    return (
      <>
        <line className="lead" x1={0} y1={0} x2={radial.length(p)} y2={0} />
        <circle className="body" cx={cx} cy={0} r={r + 0.4} />
        <circle className="led" cx={cx} cy={0} r={r} style={{ fill: LED_COLORS[p.color as string] }} />
        <line className="edge" x1={cx + r + 0.4} y1={-r * 0.7} x2={cx + r + 0.4} y2={r * 0.7} />
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

const DIODES: Suggestion[] = [
  { value: '1N4007', hint: 'General purpose, 1 A: reverse-polarity protection' },
  { value: '1N5819', hint: 'Schottky, 1 A: loses less voltage, good on batteries' },
  { value: '1N5822', hint: 'Schottky, 3 A: motor supplies' },
  { value: '1N4148', hint: 'Small signal: logic, flyback on small relays' },
]

// Pinouts of the same number differ between makers, so the hint says usually.
const TRANSISTORS: Suggestion[] = [
  { value: '2N2222', hint: 'NPN, switches up to 500 mA · usually EBC' },
  { value: '2N3904', hint: 'NPN, small signals and loads · usually EBC' },
  { value: 'S8050', hint: 'NPN, switches up to 500 mA · usually EBC' },
  { value: 'BC547', hint: 'NPN, small signals and loads · usually CBE' },
  { value: '2N3906', hint: 'PNP, switches the + side · usually EBC' },
  { value: 'BC557', hint: 'PNP, switches the + side · usually CBE' },
  { value: '2N7000', hint: 'N-channel MOSFET, small loads · usually SGD' },
  { value: 'BS170', hint: 'N-channel MOSFET, small loads · usually DGS' },
]

// Axial parts lie flat with their legs bent down at whatever spacing suits.
const axial = legSpan(3, 13)

export const resistor: PartDef = {
  id: 'resistor',
  name: 'Resistor',
  category: 'Basics',
  ref: 'R',
  defaults: { value: '220', span: 5 },
  props: [
    { key: 'value', label: 'Value (\u03a9)', type: 'text', suggestions: RESISTORS },
    axial.spec,
  ],
  pins: (p) => [[0, 0], [axial.gaps(p), 0]],
  bounds: (p) => withLeads(axial.length(p), { x: 0, y: -1.5, w: 0, h: 3 }),
  render: (p) => {
    const cx = axial.length(p) / 2
    const w = Math.min(6.4, axial.length(p) - 1.4)
    const k = w / 6.4
    const bands = resistorBands(String(p.value))
    return (
      <>
        <line className="lead" x1={0} y1={0} x2={axial.length(p)} y2={0} />
        <rect className="body" x={cx - w / 2} y={-1.2} width={w} height={2.4} rx={1.1 * k} />
        {bands.map((c, i) => (
          <rect
            key={i}
            className="band"
            x={cx + (-2.2 + i * 1.2 + (i === 3 ? 0.6 : 0)) * k}
            y={-1.15}
            width={0.6 * k}
            height={2.3}
            style={{ fill: c }}
          />
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
  defaults: { value: '100n', span: 2 },
  props: [{ key: 'value', label: 'Value (F)', type: 'text', suggestions: CERAMICS }, radial.spec],
  pins: (p) => [[0, 0], [radial.gaps(p), 0]],
  bounds: (p) => withLeads(radial.length(p), { x: radial.length(p) / 2 - 2.2, y: -1.6, w: 4.4, h: 3.2 }),
  render: (p, view) => {
    const cx = radial.length(p) / 2
    return (
      <>
        <line className="lead" x1={0} y1={0} x2={radial.length(p)} y2={0} />
        <rect className="body cap" x={cx - 1.87} y={-1.3} width={3.74} height={2.6} rx={1.2} />
        <Upright className="ink" x={cx} y={0} fontSize={1.2} anchor="middle" view={view}>{p.value}</Upright>
      </>
    )
  },
}

export const electrolyticCap: PartDef = {
  id: 'cap-electrolytic',
  name: 'Electrolytic capacitor',
  category: 'Basics',
  ref: 'C',
  defaults: { value: '10µ', diameter: '5', span: 2 },
  props: [
    { key: 'value', label: 'Value (F)', type: 'text', suggestions: ELECTROLYTICS },
    { key: 'diameter', label: 'Diameter (mm)', type: 'select', options: ['5', '6.3', '8'] },
    radial.spec,
  ],
  pins: (p) => [[0, 0], [radial.gaps(p), 0]],
  pinNames: () => ['+ · long leg', '− · stripe side'],
  bounds: (p) => {
    const r = Number(p.diameter) / 2 + 0.3
    const cx = radial.length(p) / 2
    return withLeads(radial.length(p), { x: cx - r, y: -r, w: 2 * r, h: 2 * r })
  },
  render: (p, view) => {
    const r = Number(p.diameter) / 2
    const cx = radial.length(p) / 2
    return (
      <>
        <line className="lead" x1={0} y1={0} x2={radial.length(p)} y2={0} />
        <circle className="body" cx={cx} cy={0} r={r} />
        <path className="stripe" d={`M ${cx + r * 0.45} ${-r * 0.89} A ${r} ${r} 0 0 1 ${cx + r * 0.45} ${r * 0.89} Z`} />
        <Upright className="ink" x={cx - r * 0.25} y={0} fontSize={1.3} anchor="middle" view={view}>{p.value}</Upright>
      </>
    )
  },
}

export const diode: PartDef = {
  id: 'diode',
  name: 'Diode',
  category: 'Basics',
  ref: 'D',
  defaults: { label: '1N4007', span: 5 },
  props: [{ key: 'label', label: 'Part number', type: 'text', suggestions: DIODES }, axial.spec],
  pins: (p) => [[0, 0], [axial.gaps(p), 0]],
  pinNames: () => ['Anode', 'Cathode · band side'],
  bounds: (p) => withLeads(axial.length(p), { x: 0, y: -1.6, w: 0, h: 3.2 }),
  render: (p, view) => {
    const cx = axial.length(p) / 2
    const w = Math.min(5.2, axial.length(p) - 1.4)
    const k = w / 5.2
    return (
      <>
        <line className="lead" x1={0} y1={0} x2={axial.length(p)} y2={0} />
        <rect className="body dark" x={cx - w / 2} y={-1.3} width={w} height={2.6} rx={0.4} />
        <rect className="band" x={cx + 1.4 * k} y={-1.3} width={0.7 * k} height={2.6} style={{ fill: '#d9d9d2' }} />
        {w >= 5 && (
          <Upright className="ink light" x={cx - 0.5} y={0} fontSize={0.8} anchor="middle" view={view}>{p.label}</Upright>
        )}
      </>
    )
  },
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
    { key: 'label', label: 'Part number', type: 'text', suggestions: TRANSISTORS },
    { key: 'pinout', label: 'Pins (flat side)', type: 'select', options: ['EBC', 'CBE', 'ECB', 'SGD', 'GDS', 'DGS'] },
  ],
  pins: () => [[0, 0], [1, 0], [2, 0]],
  pinNames: (p) => String(p.pinout).split('').map((c) => TO92_PINS[c]),
  bounds: () => ({ x: PITCH - 2.7, y: -2.9, w: 5.4, h: 4.6 }),
  render: (p, view) => (
    <>
      <path className="body dark" d={`M ${PITCH - 2.4} 1.3 L ${PITCH + 2.4} 1.3 A 2.5 2.5 0 0 0 ${PITCH - 2.4} 1.3 Z`} transform="translate(0 -0.4)" />
      <Upright className="ink light" x={PITCH} y={-0.5} fontSize={0.9} anchor="middle" view={view}>{p.label}</Upright>
      {String(p.pinout).split('').map((c, i) => (
        <Upright key={i} className="silk" x={i * PITCH} y={2} anchor="middle" view={view}>{c}</Upright>
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
        <Upright className="ink light" x={cx - 3.6} y={-2.9} fontSize={2} view={view}>+</Upright>
      </>
    )
  },
}
