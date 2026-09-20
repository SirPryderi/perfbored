import { PITCH } from '../../model/geometry'
import { WIRE_COLORS } from '../../model/routing'
import type { Hole, PartDef, PinLabel } from '../../model/types'
import { listLabels, pinLabelName, splitLabels } from './labels'
import { Upright } from './Upright'

export const header: PartDef = {
  id: 'header',
  name: 'Pin header 1×N',
  category: 'Connectors',
  ref: 'J',
  stacks: true,
  defaults: { count: 4, kind: 'female', color: WIRE_COLORS[1].value, labels: '' },
  props: [
    { key: 'count', label: 'Pins', type: 'number', min: 1, max: 40 },
    { key: 'kind', label: 'Type', type: 'select', options: ['female', 'male'] },
    { key: 'color', label: 'Colour', type: 'color' },
    { key: 'labels', label: 'Pin labels', type: 'text' },
  ],
  pinLabel: listLabels('labels'),
  pins: (p) => Array.from({ length: Number(p.count) }, (_, i): Hole => [i, 0]),
  pinNames: (p) => Array.from({ length: Number(p.count) }, (_, i) => pinLabelName(splitLabels(p.labels)[i], i)),
  bounds: (p) => ({ x: -PITCH / 2, y: -PITCH / 2, w: Number(p.count) * PITCH, h: PITCH }),
  render: (p) => (
    <>
      <rect className="body header" x={-PITCH / 2} y={-PITCH / 2} width={Number(p.count) * PITCH} height={PITCH} rx={0.3} style={{ fill: String(p.color) }} />
      {Array.from({ length: Number(p.count) }, (_, i) =>
        p.kind === 'male' ? (
          <rect key={i} className="metal" x={i * PITCH - 0.32} y={-0.32} width={0.64} height={0.64} />
        ) : (
          <rect key={i} className="hole-dark" x={i * PITCH - 0.55} y={-0.55} width={1.1} height={1.1} />
        ),
      )}
    </>
  ),
}

export const screwTerminal: PartDef = {
  id: 'screw-terminal',
  name: 'Screw terminal 5.08mm',
  category: 'Connectors',
  ref: 'J',
  defaults: { count: 2, labels: '' },
  props: [
    { key: 'count', label: 'Ways', type: 'number', min: 2, max: 6 },
    { key: 'labels', label: 'Pin labels', type: 'text' },
  ],
  pinLabel: listLabels('labels'),
  pins: (p) => Array.from({ length: Number(p.count) }, (_, i): Hole => [i * 2, 0]),
  pinNames: (p) => Array.from({ length: Number(p.count) }, (_, i) => pinLabelName(splitLabels(p.labels)[i], i, 'Terminal')),
  bounds: (p) => ({ x: -PITCH, y: -3.8, w: Number(p.count) * 2 * PITCH, h: 7.6 }),
  render: (p) => (
    <>
      <rect className="body terminal" x={-PITCH} y={-3.8} width={Number(p.count) * 2 * PITCH} height={7.6} rx={0.6} />
      {Array.from({ length: Number(p.count) }, (_, i) => (
        <g key={i}>
          <circle className="metal" cx={i * 2 * PITCH} cy={-1} r={1.5} />
          <line className="slot" x1={i * 2 * PITCH - 1} y1={-1} x2={i * 2 * PITCH + 1} y2={-1} />
        </g>
      ))}
    </>
  ),
}

// JST XH is 2.5 mm pitch; it drops into 2.54 mm perfboard with a little lean.
// Drawn from above: vertical shows the shroud with the pin tips inside and the
// cutouts in the pin-side wall; right angle shows the legs at the back and the
// mating face at the front.
export const jstXh: PartDef = {
  id: 'jst-xh',
  name: 'JST XH connector',
  category: 'Connectors',
  ref: 'J',
  defaults: { count: 2, style: 'vertical', labels: '' },
  props: [
    { key: 'count', label: 'Pins', type: 'number', min: 2, max: 10 },
    { key: 'style', label: 'Style', type: 'select', options: ['vertical', 'right angle'] },
    { key: 'labels', label: 'Pin labels', type: 'text' },
  ],
  pinLabel: listLabels('labels'),
  pins: (p) => Array.from({ length: Number(p.count) }, (_, i): Hole => [i, 0]),
  pinNames: (p) => Array.from({ length: Number(p.count) }, (_, i) => pinLabelName(splitLabels(p.labels)[i], i)),
  bounds: (p) => {
    const w = (Number(p.count) - 1) * PITCH + 4.9
    return p.style === 'vertical' ? { x: -2.45, y: -2.35, w, h: 5.75 } : { x: -2.45, y: -1.4, w, h: 9.6 }
  },
  render: (p) => {
    const n = Number(p.count)
    const span = (n - 1) * PITCH
    const w = span + 4.9
    const pins = Array.from({ length: n }, (_, i) => i * PITCH)
    // Cutouts in the wall nearest the pins: one in the middle on a 2-pin,
    // otherwise a small one at each end and a long one in the middle.
    const cutouts: [x: number, width: number][] =
      n === 2 ? [[span / 2, span]] : [[-1.1, 0.8], [span + 1.1, 0.8], [span / 2, Math.max(2.4, span - 2 * PITCH)]]
    if (p.style === 'vertical')
      return (
        <>
          <rect className="body jst" x={-2.45} y={-2.35} width={w} height={5.75} rx={0.35} />
          <rect className="cavity" x={-1.75} y={-1.65} width={w - 1.4} height={4.4} rx={0.2} />
          {cutouts.map(([x, width], i) => (
            <rect key={i} className="cavity" x={x - width / 2} y={-2.45} width={width} height={0.85} />
          ))}
          {pins.map((x) => (
            <rect key={x} className="metal" x={x - 0.32} y={-0.32} width={0.64} height={0.64} />
          ))}
        </>
      )
    return (
      <>
        {pins.map((x) => (
          <rect key={x} className="metal" x={x - 0.32} y={-0.8} width={0.64} height={1.6} />
        ))}
        <rect className="body jst" x={-2.45} y={0.9} width={w} height={7.3} rx={0.35} />
        <rect className="cavity" x={-1.75} y={6.4} width={w - 1.4} height={1.8} rx={0.2} />
        {pins.map((x) => (
          <rect key={x} className="metal" x={x - 0.32} y={6.9} width={0.64} height={0.64} />
        ))}
      </>
    )
  },
}

// Amass XT30 board mount: two contacts 5 mm apart, chamfered on one long side.
export const xt30: PartDef = {
  id: 'xt30-pcb',
  name: 'XT30 board mount',
  category: 'Connectors',
  ref: 'J',
  defaults: { style: 'vertical', gender: 'female', polarity: '+ −' },
  props: [
    { key: 'style', label: 'Style', type: 'select', options: ['vertical', 'right angle'] },
    { key: 'gender', label: 'Contacts', type: 'select', options: ['female', 'male'] },
    { key: 'polarity', label: 'Polarity', type: 'select', options: ['+ −', '− +'] },
  ],
  pins: () => [[0, 0], [2, 0]],
  pinNames: (p) => String(p.polarity).split(' ').map((c) => (c === '+' ? '+ · positive' : '− · negative')),
  bounds: (p) => (p.style === 'vertical' ? { x: PITCH - 5.1, y: -2.6, w: 10.2, h: 5.2 } : { x: PITCH - 5.1, y: -1.2, w: 10.2, h: 12 }),
  render: (p, view) => {
    const cx = PITCH
    const face = (y: number) => {
      const c = 1.4
      return `M ${cx - 5.1} ${y + 5.2} V ${y + c} L ${cx - 5.1 + c} ${y} H ${cx + 5.1 - c} L ${cx + 5.1} ${y + c} V ${y + 5.2} Z`
    }
    const contacts = (y: number) =>
      [0, 2 * PITCH].map((x) =>
        p.gender === 'male' ? (
          <circle key={x} className="metal" cx={x} cy={y} r={0.9} />
        ) : (
          <g key={x}>
            <circle className="socket" cx={x} cy={y} r={1.25} />
            <circle className="hole-dark" cx={x} cy={y} r={0.65} />
          </g>
        ),
      )
    const signs = String(p.polarity).split(' ')
    const marks = (y: number) =>
      signs.map((c, i) => (
        <Upright key={i} className="silk" x={i * 2 * PITCH} y={y} anchor="middle" view={view}>{c}</Upright>
      ))
    if (p.style === 'vertical')
      return (
        <>
          <path className="body xt" d={face(-2.6)} />
          {contacts(0)}
          {marks(-3)}
        </>
      )
    return (
      <>
        {[0, 2 * PITCH].map((x) => (
          <rect key={x} className="metal" x={x - 0.6} y={-1.2} width={1.2} height={2.4} rx={0.3} />
        ))}
        <rect className="body xt" x={cx - 5.1} y={0.8} width={10.2} height={10} rx={0.6} />
        <path className="edge" d={face(5.6)} />
        {contacts(8.2)}
        {marks(-1.7)}
      </>
    )
  },
}

const singleLabel: PinLabel = { get: (p) => String(p.label ?? ''), set: (p, _, label) => ({ ...p, label }) }

// Where a wire leaves the board: a solder pad, optionally with a flying lead.
export const offBoard: PartDef = {
  id: 'off-board',
  name: 'Off-board lead',
  category: 'Connectors',
  ref: 'P',
  overlay: true,
  defaults: { label: 'Lead', style: 'lead' },
  props: [
    { key: 'label', label: 'Label', type: 'text' },
    { key: 'style', label: 'Style', type: 'select', options: ['lead', 'pad'] },
  ],
  pinLabel: singleLabel,
  pins: () => [[0, 0]],
  pinNames: (p) => [String(p.label).trim() || 'Lead'],
  bounds: (p) => {
    const w = tagWidth(p.label)
    return p.style === 'lead' ? { x: -w / 2, y: -5.8, w, h: 6.9 } : { x: -1.1, y: -1.1, w: w + 2.6, h: 2.2 }
  },
  render: (p, view) => {
    const w = tagWidth(p.label)
    const lead = p.style === 'lead'
    const [tx, ty] = lead ? [-w / 2, -5.8] : [1.5, -1.1]
    return (
      <>
        <circle className="pad" cx={0} cy={0} r={0.95} />
        {lead && <line className="lead-wire" x1={0} y1={-0.2} x2={0} y2={-3.6} />}
        <rect className="tag" x={tx} y={ty} width={w} height={2.2} rx={1.1} />
        <Upright className="tag-text" x={tx + w / 2} y={ty + 1.55} anchor="middle" view={view}>{p.label}</Upright>
      </>
    )
  },
}

const tagWidth = (label: unknown) => Math.max(3.2, String(label).length * 0.82 + 1.8)
