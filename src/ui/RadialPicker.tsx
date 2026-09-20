import { useCallback, useEffect, useRef, useState } from 'react'
import { partById } from '../library'
import { updatePart, updateWire } from '../model/doc'
import { WIRE_COLORS } from '../model/routing'
import { useEditor } from '../store'
import { commands, matches } from '../keymap'
import { typing } from '../useShortcuts'

const RADIUS = 74
const DEAD_ZONE = 28
const STEP = (2 * Math.PI) / WIRE_COLORS.length
const angleOf = (i: number) => i * STEP - Math.PI / 2

// The colour prop of the selected part, if it has one.
function colourProp() {
  const s = useEditor.getState()
  const part = s.selection?.kind === 'part' ? s.doc.parts.find((p) => p.id === s.selection!.id) : undefined
  const def = part && partById(part.def)
  const key = def?.props?.find((spec) => spec.type === 'color')?.key
  return part && def && key ? { part, key, value: String(part.props[key] ?? def.defaults?.[key]) } : null
}

function pick(color: string) {
  const s = useEditor.getState()
  const wire = s.selection?.kind === 'wire' ? s.selection.id : null
  const prop = colourProp()
  if (wire) s.change((d) => updateWire(d, wire, { color }))
  else if (prop) s.change((d) => updatePart(d, prop.part.id, { props: { ...prop.part.props, [prop.key]: color } }))
  if (!prop) s.setWireColor(color)
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
  const current = useEditor((s) =>
    s.selection?.kind === 'wire'
      ? s.doc.wires.find((w) => w.id === s.selection!.id)?.color ?? s.wireColor
      : colourProp()?.value ?? s.wireColor,
  )

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
