import { PITCH } from '../../model/geometry'
import type { Hole, PartDef, Props } from '../../model/types'
import { listLabels, pinLabelName, splitLabels } from './labels'
import { Upright } from './Upright'

// DIP pins run anticlockwise from the notch: down the left side, then back up
// the right one. They are listed in that order, so pin N is always index N-1
// for labels, the report and the label editor.
const perSide = (p: Props) => Math.max(1, Math.ceil(Number(p.pins) / 2))
const gapOf = (p: Props) => Math.max(1, Number(p.width) - 1)

const dipPins = (p: Props): Hole[] => {
  const n = perSide(p)
  return [...Array.from({ length: n }, (_, i): Hole => [0, i]), ...Array.from({ length: n }, (_, i): Hole => [gapOf(p), n - 1 - i])]
}

const edge = -PITCH / 2
const size = (p: Props) => ({ w: (gapOf(p) + 1) * PITCH, h: perSide(p) * PITCH })

function dip(id: string, name: string, socket: boolean): PartDef {
  return {
    id,
    name,
    category: 'ICs',
    pads: true,
    stacks: socket,
    ref: socket ? 'XU' : 'U',
    defaults: { label: socket ? '' : 'IC', pins: 8, width: 4, labels: '' },
    props: [
      { key: 'label', label: 'Label', type: 'text' },
      { key: 'pins', label: 'Legs', type: 'number', min: 2, max: 64 },
      { key: 'width', label: 'Width in holes', type: 'number', min: 2, max: 12 },
      { key: 'labels', label: 'Pin labels', type: 'text' },
    ],
    pinLabel: listLabels('labels'),
    pins: dipPins,
    pinNames: (p) => dipPins(p).map((_, i) => pinLabelName(splitLabels(p.labels)[i], i)),
    bounds: (p) => ({ x: edge, y: edge, ...size(p) }),
    render: (p, view) => {
      const { w, h } = size(p)
      const span = gapOf(p) * PITCH
      const inset = socket ? 0.15 : Math.min(1, span / 4)
      const x0 = edge + inset
      const x1 = edge + w - inset
      const y0 = edge + 0.15
      const y1 = edge + h - 0.15
      const cx = span / 2
      const notch = Math.min(1.1, span / 4)
      const labels = splitLabels(p.labels)
      const n = perSide(p)
      const room = span >= 7 && !socket
      return (
        <>
          <path
            className="body dark"
            d={`M ${x0} ${y0} H ${cx - notch} A ${notch} ${notch} 0 0 0 ${cx + notch} ${y0} H ${x1} V ${y1} H ${x0} Z`}
          />
          {socket ? (
            <rect className="hole-dark" x={x0 + 1.5} y={y0 + 1.5} width={x1 - x0 - 3} height={y1 - y0 - 3} rx={0.3} />
          ) : (
            <circle className="ink light" cx={1.1} cy={1.1} r={0.45} opacity={0.5} />
          )}
          {dipPins(p).map(([c, r], i) =>
            socket ? (
              <rect key={i} className="socket" x={c * PITCH - 0.7} y={r * PITCH - 0.7} width={1.4} height={1.4} rx={0.2} />
            ) : (
              <rect key={i} className="metal" x={c * PITCH - (c ? 0.2 : 1)} y={r * PITCH - 0.45} width={1.2} height={0.9} rx={0.2} />
            ),
          )}
          {p.label !== '' && (
            <Upright
              className={socket ? 'silk' : 'ink light'}
              x={cx + 0.4}
              y={edge + h / 2}
              rotate={span >= 16 ? 0 : 90}
              anchor="middle"
              fontSize={socket ? 1.1 : span >= 16 ? 1.6 : 1.2}
              view={view}
            >
              {String(p.label)}
            </Upright>
          )}
          {room &&
            labels.slice(0, n).map((l, i) => (
              <Upright key={`l${i}`} className="ink light" x={1.4} y={i * PITCH + 0.35} fontSize={0.9} view={view}>{l}</Upright>
            ))}
          {room &&
            labels.slice(n, 2 * n).map((l, i) => (
              <Upright key={`r${i}`} className="ink light" x={span - 1.4} y={(n - 1 - i) * PITCH + 0.35} anchor="end" fontSize={0.9} view={view}>
                {l}
              </Upright>
            ))}
        </>
      )
    },
  }
}

export const dipIc = dip('dip-ic', 'IC (DIP)', false)
export const dipSocket = dip('dip-socket', 'IC socket (DIP)', true)
