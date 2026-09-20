import type { PartDef } from '../../model/types'
import { Upright } from './Upright'

export const lightWindow: PartDef = {
  id: 'light-window',
  name: 'Light window',
  category: 'Annotations',
  annotation: true,
  defaults: { shape: 'pill', width: 13, height: 13 },
  props: [
    { key: 'shape', label: 'Shape', type: 'select', options: ['pill', 'rectangle'] },
    { key: 'width', label: 'Width (mm)', type: 'number', min: 2, max: 100 },
    { key: 'height', label: 'Height (mm)', type: 'number', min: 2, max: 100 },
  ],
  pins: () => [],
  bounds: (p) => ({ x: -Number(p.width) / 2, y: -Number(p.height) / 2, w: Number(p.width), h: Number(p.height) }),
  render: (p) => {
    const w = Number(p.width)
    const h = Number(p.height)
    return <rect className="window" x={-w / 2} y={-h / 2} width={w} height={h} rx={p.shape === 'pill' ? Math.min(w, h) / 2 : 1} />
  },
}

export const label: PartDef = {
  id: 'label',
  name: 'Text label',
  category: 'Annotations',
  annotation: true,
  defaults: { text: 'Label', size: 3 },
  props: [
    { key: 'text', label: 'Text', type: 'text' },
    { key: 'size', label: 'Size (mm)', type: 'number', min: 1, max: 12 },
  ],
  pins: () => [],
  bounds: (p) => {
    const s = Number(p.size)
    return { x: 0, y: -s * 0.85, w: Math.max(1, String(p.text).length) * s * 0.58, h: s * 1.1 }
  },
  render: (p, view) => (
    <Upright className="ink" x={0} y={0} fontSize={Number(p.size)} view={view}>{p.text}</Upright>
  ),
}
