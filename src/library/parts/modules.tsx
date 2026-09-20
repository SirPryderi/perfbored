import { PITCH } from '../../model/geometry'
import type { Hole, PartDef } from '../../model/types'
import { Upright } from './Upright'

type Pin = [silk: string, description: string]

interface DevKit {
  id: string
  name: string
  rowGap: number
  usbOverhang: number
  antennaOverhang: number
  top: Pin[]
  bottom: Pin[]
}

// Rows run from the antenna end to the USB end, component side up.
function devkit(k: DevKit): PartDef {
  const count = k.top.length
  const span = (count - 1) * PITCH
  const x0 = -k.antennaOverhang
  const x1 = span + k.usbOverhang
  const bottomY = k.rowGap * PITCH
  const cy = bottomY / 2
  const width = (k.rowGap + 1) * PITCH
  const y0 = cy - width / 2
  return {
    id: k.id,
    name: k.name,
    category: 'Microcontrollers',
    flippable: true,
    pads: true,
    ref: 'U',
    pins: () => {
      const out: Hole[] = []
      for (let i = 0; i < count; i++) out.push([i, 0], [i, k.rowGap])
      return out
    },
    pinNames: () => k.top.flatMap((t, i) => [`${t[0]} · ${t[1]}`, `${k.bottom[i][0]} · ${k.bottom[i][1]}`]),
    bounds: () => ({ x: x0, y: y0, w: x1 - x0, h: width }),
    render: (_, view) => (
      <>
        <rect className="body pcb" x={x0} y={y0} width={x1 - x0} height={width} rx={1} />
        <rect className="body metal" x={x0 + 6} y={cy - 8} width={17} height={16} rx={0.6} />
        <path className="edge" d={`M ${x0 + 1.2} ${cy - 6} h 2.5 v 3 h -2.5 v 3 h 2.5 v 3 h -2.5 v 3 h 2.5`} />
        <rect className="body metal" x={x1 - 5.5} y={cy - 4} width={6.3} height={8} rx={0.8} />
        <Upright className="ink" x={(x0 + 23 + x1 - 5.5) / 2} y={cy + 1} fontSize={2.8} anchor="middle" view={view}>
          ESP32
        </Upright>
        {k.top.map(([silk], i) => (
          <Upright key={`t${i}`} className="silk" x={i * PITCH + 0.4} y={1.6} rotate={90} view={view}>{silk}</Upright>
        ))}
        {k.bottom.map(([silk], i) => (
          <Upright key={`b${i}`} className="silk" x={i * PITCH + 0.4} y={bottomY - 1.6} rotate={90} anchor="end" view={view}>
            {silk}
          </Upright>
        ))}
      </>
    ),
  }
}

const FLASH = "flash, don't use"

export const esp32DevKit30 = devkit({
  id: 'esp32-devkit-30',
  name: 'ESP32 DevKit (30 pin)',
  rowGap: 10,
  usbOverhang: 9.5,
  antennaOverhang: 6.4,
  top: [
    ['D23', 'GPIO23 · SPI MOSI'], ['D22', 'GPIO22 · I²C SCL'], ['TX0', 'GPIO1 · USB serial TX'],
    ['RX0', 'GPIO3 · USB serial RX'], ['D21', 'GPIO21 · I²C SDA'], ['D19', 'GPIO19 · SPI MISO'],
    ['D18', 'GPIO18 · SPI SCK'], ['D5', 'GPIO5 · SPI SS · boot strap'], ['TX2', 'GPIO17 · UART2 TX'],
    ['RX2', 'GPIO16 · UART2 RX'], ['D4', 'GPIO4'], ['D2', 'GPIO2 · on-board LED · boot strap'],
    ['D15', 'GPIO15 · boot strap'], ['GND', 'Ground'], ['3V3', '3.3 V'],
  ],
  bottom: [
    ['EN', 'Enable / reset'], ['VP', 'GPIO36 · input only'], ['VN', 'GPIO39 · input only'],
    ['D34', 'GPIO34 · input only'], ['D35', 'GPIO35 · input only'], ['D32', 'GPIO32 · ADC1'],
    ['D33', 'GPIO33 · ADC1'], ['D25', 'GPIO25 · DAC1'], ['D26', 'GPIO26 · DAC2'], ['D27', 'GPIO27'],
    ['D14', 'GPIO14'], ['D12', 'GPIO12 · boot strap, keep low at boot'], ['D13', 'GPIO13'],
    ['GND', 'Ground'], ['VIN', '5 V in'],
  ],
})

export const esp32DevKitC38 = devkit({
  id: 'esp32-devkitc-38',
  name: 'ESP32 DevKitC (38 pin)',
  rowGap: 10,
  usbOverhang: 5.5,
  antennaOverhang: 3.2,
  top: [
    ['GND', 'Ground'], ['23', 'GPIO23 · SPI MOSI'], ['22', 'GPIO22 · I²C SCL'], ['TX', 'GPIO1 · USB serial TX'],
    ['RX', 'GPIO3 · USB serial RX'], ['21', 'GPIO21 · I²C SDA'], ['GND', 'Ground'], ['19', 'GPIO19 · SPI MISO'],
    ['18', 'GPIO18 · SPI SCK'], ['5', 'GPIO5 · SPI SS · boot strap'], ['17', 'GPIO17 · UART2 TX'],
    ['16', 'GPIO16 · UART2 RX'], ['4', 'GPIO4'], ['0', 'GPIO0 · BOOT button · boot strap'],
    ['2', 'GPIO2 · boot strap'], ['15', 'GPIO15 · boot strap'], ['SD1', `GPIO8 · ${FLASH}`],
    ['SD0', `GPIO7 · ${FLASH}`], ['CLK', `GPIO6 · ${FLASH}`],
  ],
  bottom: [
    ['3V3', '3.3 V'], ['EN', 'Enable / reset'], ['VP', 'GPIO36 · input only'], ['VN', 'GPIO39 · input only'],
    ['34', 'GPIO34 · input only'], ['35', 'GPIO35 · input only'], ['32', 'GPIO32 · ADC1'], ['33', 'GPIO33 · ADC1'],
    ['25', 'GPIO25 · DAC1'], ['26', 'GPIO26 · DAC2'], ['27', 'GPIO27'], ['14', 'GPIO14'],
    ['12', 'GPIO12 · boot strap, keep low at boot'], ['GND', 'Ground'], ['13', 'GPIO13'],
    ['SD2', `GPIO9 · ${FLASH}`], ['SD3', `GPIO10 · ${FLASH}`], ['CMD', `GPIO11 · ${FLASH}`], ['5V', '5 V in'],
  ],
})

interface Oled {
  id: string
  name: string
  width: number
  height: number
  headerInset: number
  mountInset: number
  glass: [w: number, h: number, top: number]
  active: [w: number, h: number, top: number]
  caption: string
}

const OLED_PINOUTS = ['GND VCC SCL SDA', 'VCC GND SCL SDA', 'SDA SCL GND VCC']
const OLED_PIN_INFO: Record<string, string> = {
  GND: 'GND · ground',
  VCC: 'VCC · 3.3–5 V',
  SCL: 'SCL · I²C clock',
  SDA: 'SDA · I²C data',
}

function oled(o: Oled): PartDef {
  const cx = 1.5 * PITCH
  const top = -o.headerInset
  const x = cx - o.width / 2
  const holes = [
    [o.mountInset, o.mountInset],
    [o.width - o.mountInset, o.mountInset],
    [o.mountInset, o.height - o.mountInset],
    [o.width - o.mountInset, o.height - o.mountInset],
  ]
  return {
    id: o.id,
    name: o.name,
    category: 'Displays',
    pads: true,
    ref: 'DS',
    defaults: { pinout: OLED_PINOUTS[0] },
    props: [{ key: 'pinout', label: 'Pin order', type: 'select', options: OLED_PINOUTS }],
    pins: () => [[0, 0], [1, 0], [2, 0], [3, 0]],
    pinNames: (p) => String(p.pinout).split(' ').map((n) => OLED_PIN_INFO[n]),
    bounds: () => ({ x, y: top, w: o.width, h: o.height }),
    render: (p, view) => (
      <>
        <rect className="body screen" x={x} y={top} width={o.width} height={o.height} rx={1} />
        {String(p.pinout).split(' ').map((n, i) => (
          <Upright key={i} className="silk" x={i * PITCH} y={2.1} fontSize={0.85} anchor="middle" view={view}>{n}</Upright>
        ))}
        {holes.map(([hx, hy], i) => (
          <circle key={i} className="mount" cx={x + hx} cy={top + hy} r={1.35} />
        ))}
        <rect className="glass" x={cx - o.glass[0] / 2} y={top + o.glass[2]} width={o.glass[0]} height={o.glass[1]} rx={0.5} />
        <rect className="active" x={cx - o.active[0] / 2} y={top + o.active[2]} width={o.active[0]} height={o.active[1]} />
        <Upright className="ink" x={cx} y={top + o.active[2] + o.active[1] / 2 + 1} fontSize={2.6} anchor="middle" view={view}>
          {o.caption}
        </Upright>
      </>
    ),
  }
}

export const oled15 = oled({
  id: 'oled-1.5-sh1107',
  name: 'OLED 1.5" 128×128',
  width: 35.5,
  height: 43,
  headerInset: 2.2,
  mountInset: 2.5,
  glass: [33.5, 35, 5],
  active: [27, 27, 8],
  caption: '128×128',
})

export const oled096 = oled({
  id: 'oled-0.96-ssd1306',
  name: 'OLED 0.96" 128×64',
  width: 27.3,
  height: 27.8,
  headerInset: 2,
  mountInset: 2,
  glass: [26.7, 19.3, 5.2],
  active: [21.7, 10.9, 9],
  caption: '128×64',
})
