import { namedPins } from '../model/geometry'
import type { Hole, PartDef, PartInstance } from '../model/types'
import { label, lightWindow } from './parts/annotations'
import { ceramicCap, diode, electrolyticCap, led, piezo, resistor, transistor } from './parts/basics'
import { header, jstXh, offBoard, screwTerminal, xt30 } from './parts/connectors'
import { drv8833, genericBreakout, tb6612 } from './parts/breakouts'
import { esp32DevKit30, esp32DevKitC38, oled096, oled15 } from './parts/modules'
import { barrelJack, fuseHolder } from './parts/power'
import { button12, button6, pushLatch, slideSwitch } from './parts/switches'

export const parts: PartDef[] = [
  esp32DevKit30,
  esp32DevKitC38,
  oled15,
  oled096,
  tb6612,
  drv8833,
  genericBreakout,
  led,
  resistor,
  ceramicCap,
  electrolyticCap,
  diode,
  transistor,
  piezo,
  button6,
  button12,
  pushLatch,
  slideSwitch,
  header,
  jstXh,
  xt30,
  barrelJack,
  fuseHolder,
  offBoard,
  screwTerminal,
  lightWindow,
  label,
]

const byId = new Map(parts.map((p) => [p.id, p]))

export const partById = (id: string) => byId.get(id)

export function pinsAt(parts: PartInstance[], [c, r]: Hole) {
  return parts.flatMap((part) => {
    const def = byId.get(part.def)
    if (!def) return []
    return namedPins(part, def)
      .filter(({ hole }) => hole[0] === c && hole[1] === r)
      .map(({ name }) => {
        const [pin, ...details] = name.split(' · ')
        return { name: pin, detail: details.join(' · '), part: def.name, side: part.side }
      })
  })
}

export const categories = [...new Set(parts.map((p) => p.category))]

export { boards, boardById } from './boards'
