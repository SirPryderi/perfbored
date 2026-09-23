import { useCallback, useEffect, useRef, useState } from 'react'
import { partById } from '../library'
import { propsOf } from '../model/geometry'
import type { PartInstance } from '../model/types'
import { WIRE_COLORS } from '../model/routing'
import { isSelected, useEditor } from '../store'
import { commands, matches } from '../keymap'
import { typing } from '../useShortcuts'

const RADIUS = 74
const DEAD_ZONE = 28
const STEP = (2 * Math.PI) / WIRE_COLORS.length
const angleOf = (i: number) => i * STEP - Math.PI / 2

const colourKey = (part: PartInstance) => partById(part.def)?.props?.find((spec) => spec.type === 'color')?.key

// What a colour applies to: the selected wires, and selected parts that have a
// colour of their own, such as a header's plastic.
function coloured(s = useEditor.getState()) {
  const wires = s.doc.wires.filter((w) => isSelected(s.selection, w.id))
  const parts = s.doc.parts.filter((p) => isSelected(s.selection, p.id) && colourKey(p))
  return { wires, parts }
}

function currentColour(s = useEditor.getState()) {
  const { wires, parts } = coloured(s)
  if (wires.length) return wires[0].color
  const part = parts[0]
  return part ? String(propsOf(part, partById(part.def)!)[colourKey(part)!]) : s.wireColor
}

function pick(color: string) {
  const s = useEditor.getState()
  const { wires, parts } = coloured(s)
  const ids = new Set([...wires, ...parts].map((i) => i.id))
  if (ids.size)
    s.change((d) => ({
      ...d,
      wires: d.wires.map((w) => (ids.has(w.id) ? { ...w, color } : w)),
      parts: d.parts.map((p) => (ids.has(p.id) ? { ...p, props: { ...p.props, [colourKey(p)!]: color } } : p)),
    }))
  if (!parts.length || wires.length) s.setWireColor(color)
}

type Point = { x: number; y: number }

function hoverAt({ x, y }: Point, centre: Point | null) {
  if (!centre) return null
  const dx = x - centre.x
  const dy = y - centre.y
  if (Math.hypot(dx, dy) < DEAD_ZONE) return null
  const a = Math.atan2(dy, dx) + Math.PI / 2
  return ((Math.round(a / STEP) % WIRE_COLORS.length) + WIRE_COLORS.length) % WIRE_COLORS.length
}

// Hold the colour key to open a ring at the cursor and release over a colour to
// pick it; or tap it and click.
export function RadialPicker() {
  const pointer = useRef<Point>({ x: innerWidth / 2, y: innerHeight / 2 })
  const openAt = useRef<Point | null>(null)
  const hovered = useRef<number | null>(null)
  const [centre, setCentre] = useState<Point | null>(null)
  const [hover, setHover] = useState<number | null>(null)
  const current = useEditor(currentColour)

  const close = useCallback(() => {
    openAt.current = null
    hovered.current = null
    setCentre(null)
    setHover(null)
  }, [])

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      pointer.current = { x: e.clientX, y: e.clientY }
      hovered.current = hoverAt(pointer.current, openAt.current)
      setHover(hovered.current)
    }
    const onDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && openAt.current) return close()
      if (e.repeat || typing(e.target) || !commands.colour.keys.some((k) => matches(k, e))) return
      e.preventDefault()
      if (openAt.current) return close()
      openAt.current = { ...pointer.current }
      setCentre(openAt.current)
    }
    const onUp = (e: KeyboardEvent) => {
      if (!commands.colour.keys.some((k) => k.code === e.code) || hovered.current === null) return
      pick(WIRE_COLORS[hovered.current].value)
      close()
    }
    const onOpen = (e: Event) => {
      openAt.current = (e as CustomEvent<Point>).detail
      setCentre(openAt.current)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('keydown', onDown)
    window.addEventListener('keyup', onUp)
    window.addEventListener('open-colour-ring', onOpen)
    return () => {
      window.removeEventListener('open-colour-ring', onOpen)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('keydown', onDown)
      window.removeEventListener('keyup', onUp)
    }
  }, [close])

  if (!centre) return null
  const label = WIRE_COLORS[hover ?? -1]?.name ?? WIRE_COLORS.find((c) => c.value === current)?.name ?? ''

  return (
    <div className="radial-backdrop" onPointerDown={close}>
      <div className="radial" style={{ left: centre.x, top: centre.y }}>
        <div className="radial-hub" style={{ background: WIRE_COLORS[hover ?? -1]?.value ?? current }} />
        <div className="radial-label">{label}</div>
        {WIRE_COLORS.map((c, i) => (
          <button
            key={c.value}
            className="radial-swatch"
            data-hover={hover === i}
            data-current={c.value === current}
            aria-label={c.name}
            style={{
              background: c.value,
              left: Math.cos(angleOf(i)) * RADIUS,
              top: Math.sin(angleOf(i)) * RADIUS,
            }}
            onPointerDown={(e) => {
              e.stopPropagation()
              pick(c.value)
              close()
            }}
          />
        ))}
      </div>
    </div>
  )
}
