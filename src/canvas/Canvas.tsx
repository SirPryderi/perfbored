import { ContextMenu } from 'radix-ui'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { docBoard, partById, pinsAt } from '../library'
import { newId, updateWire } from '../model/doc'
import { centreOffset, holeKey, holeToMm, mmToHole, partPins } from '../model/geometry'
import { editPinLabel, finishDraft } from '../actions'
import { corner, moveVertex, naturalBend, simplify } from '../model/routing'
import type { BoardDef, Doc, Hole, PartInstance, Side, Wire } from '../model/types'
import { holesOf, move } from '../items'
import { isSelected, only, useEditor, type Draft, type Item, type ViewKey } from '../store'
import { leaveFocus } from '../ui/menus'
import { useAnalysis } from '../useAnalysis'
import type { Net } from '../analysis'
import { coords } from '../model/naming'
import { BoardView } from './BoardView'
import { CanvasMenu } from './CanvasMenu'
import { layoutNames, NamesLayer } from './NamesLayer'
import { PartBody, PinsLayer, SelectionOutline, type Placed } from './PartView'
import { PinLabelEditor } from './PinLabelEditor'
import { WireHandles, WireView } from './WireView'

type Drag =
  | { kind: 'pan'; x: number; y: number; vx: number; vy: number }
  | { kind: 'items'; start: Hole; base: Doc; ids: Set<string>; moved: boolean; collapse?: Item }
  | { kind: 'box'; start: Hole }
  | { kind: 'vertex'; id: string; index: number; points: Hole[]; moved: boolean }

const FLIP_MS = 520

function draftRoute(draft: Draft, to: Hole | null, straight: boolean): Hole[] {
  const last = draft.points[draft.points.length - 1]
  if (!to) return draft.points
  const natural = naturalBend(draft.points)
  const bend = draft.flip ? (natural === 'horizontal' ? 'vertical' : 'horizontal') : natural
  return [...draft.points, ...(straight ? [] : corner(last, to, bend)), to]
}

// Flip animation: squash the board edge-on, swap sides, and open it back up.
function useFlip(facing: Side) {
  const [shown, setShown] = useState(facing)
  const [squash, setSquash] = useState(1)
  const previous = useRef(facing)
  useEffect(() => {
    if (previous.current === facing) return
    previous.current = facing
    const start = performance.now()
    let frame = 0
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / FLIP_MS)
      const eased = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2
      setSquash(Math.abs(Math.cos(eased * Math.PI)))
      if (eased >= 0.5) setShown(facing)
      if (t < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(frame)
      setShown(facing)
      setSquash(1)
    }
  }, [facing])
  return { shown, squash }
}

export function Canvas({ facing, viewKey }: { facing: Side; viewKey: ViewKey }) {
  const svgRef = useRef<SVGSVGElement>(null)
  const drag = useRef<Drag | null>(null)
  const [space, setSpace] = useState(false)
  const [straight, setStraight] = useState(false)
  const [box, setBox] = useState<[Hole, Hole] | null>(null)
  const [menuHole, setMenuHole] = useState<Hole | null>(null)
  const analysis = useAnalysis()
  const { doc, view, tool, placing, layers, selection, hover, draft, wireColor, fitNonce, highlight, pinEdit } = useEditor(
    useShallow((s) => ({
      doc: s.doc,
      view: s.views[viewKey],
      tool: s.tool,
      placing: s.placing,
      layers: s.layers,
      selection: s.selection,
      hover: s.hover,
      draft: s.draft,
      wireColor: s.wireColor,
      fitNonce: s.fitNonce,
      highlight: s.highlight,
      pinEdit: s.pinEdit,
    })),
  )
  const board = docBoard(doc)
  const { shown, squash } = useFlip(facing)
  const mirrored = shown === 'back'

  const placed = useMemo(
    () => doc.parts.flatMap((part): Placed[] => {
      const def = partById(part.def)
      return def ? [{ part, def }] : []
    }),
    [doc.parts],
  )

  const conflicts = useMemo(() => {
    const seen = new Map<string, number>()
    for (const { part, def } of placed)
      for (const pin of partPins(part, def)) seen.set(holeKey(pin), (seen.get(holeKey(pin)) ?? 0) + 1)
    return new Set([...seen].filter(([, n]) => n > 1).map(([k]) => k))
  }, [placed])

  const rings = useMemo(() => [...new Map((highlight ?? []).map((h) => [holeKey(h), h])).values()], [highlight])

  const names = useMemo(() => layoutNames(doc, board, shown), [doc, board, shown])

  const content = useRef({ x: 0, y: 0, w: board.width, h: board.height })
  content.current = layers.names && names.tags.length ? names.bounds : { x: 0, y: 0, w: board.width, h: board.height }

  const [ready, setReady] = useState(false)
  useEffect(() => {
    const svg = svgRef.current!
    const observer = new ResizeObserver(([entry]) => entry.contentRect.width > 0 && setReady(true))
    observer.observe(svg)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!ready) return
    const r = svgRef.current!.getBoundingClientRect()
    const c = content.current
    const scale = Math.min((r.width - 90) / c.w, (r.height - 90) / c.h)
    useEditor.getState().setView(viewKey, {
      scale,
      x: (r.width - c.w * scale) / 2 - c.x * scale,
      y: (r.height - c.h * scale) / 2 - c.y * scale,
    })
  }, [ready, fitNonce, board, viewKey])

  useEffect(() => {
    const svg = svgRef.current!
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const v = useEditor.getState().views[viewKey]
      if (e.ctrlKey || e.metaKey) {
        const r = svg.getBoundingClientRect()
        const px = e.clientX - r.left
        const py = e.clientY - r.top
        const scale = Math.min(80, Math.max(1.5, v.scale * Math.exp(-e.deltaY * 0.01)))
        const k = scale / v.scale
        useEditor.getState().setView(viewKey, { scale, x: px - (px - v.x) * k, y: py - (py - v.y) * k })
      } else {
        useEditor.getState().setView(viewKey, { ...v, x: v.x - e.deltaX, y: v.y - e.deltaY })
      }
    }
    svg.addEventListener('wheel', onWheel, { passive: false })
    return () => svg.removeEventListener('wheel', onWheel)
  }, [viewKey])

  useEffect(() => {
    const key = (down: boolean) => (e: KeyboardEvent) => {
      if (e.key === 'Shift') setStraight(down)
      if (e.code === 'Space' && !(e.target instanceof HTMLInputElement)) {
        e.preventDefault()
        setSpace(down)
      }
    }
    const onDown = key(true)
    const onUp = key(false)
    window.addEventListener('keydown', onDown)
    window.addEventListener('keyup', onUp)
    return () => {
      window.removeEventListener('keydown', onDown)
      window.removeEventListener('keyup', onUp)
    }
  }, [])

  const holeAt = (e: React.MouseEvent): Hole => {
    const r = svgRef.current!.getBoundingClientRect()
    let x = (e.clientX - r.left - view.x) / view.scale
    const y = (e.clientY - r.top - view.y) / view.scale
    if (mirrored) x = board.width - x
    return mmToHole(board, x, y)
  }

  const place = (part: PartInstance, hole: Hole, keepPlacing: boolean) => {
    const def = partById(part.def)!
    const [dc, dr] = centreOffset(def, { ...part, side: facing })
    const next = { ...part, id: newId(), side: facing, col: hole[0] - dc, row: hole[1] - dr }
    const s = useEditor.getState()
    s.change((d) => ({ ...d, parts: [...d.parts, next] }))
    if (!keepPlacing) s.setPlacing(null)
    s.select([{ kind: 'part', id: next.id }])
  }

  // What a box drag picks up: everything shown whose holes all lie inside it.
  const boxed = ([a, b]: [Hole, Hole]): Item[] => {
    const [c0, c1] = [Math.min(a[0], b[0]), Math.max(a[0], b[0])]
    const [r0, r1] = [Math.min(a[1], b[1]), Math.max(a[1], b[1])]
    const inside = (holes: Hole[]) => holes.every(([c, r]) => c >= c0 && c <= c1 && r >= r0 && r <= r1)
    const visible = (side: Side) => side === shown || layers.far
    return [
      ...(layers.bodies ? doc.parts : [])
        .filter((p) => visible(p.side) && inside(holesOf({ parts: [p], wires: [] })))
        .map((p) => ({ kind: 'part' as const, id: p.id })),
      ...(layers.wires ? doc.wires : [])
        .filter((w) => visible(w.side) && inside(w.points))
        .map((w) => ({ kind: 'wire' as const, id: w.id })),
    ]
  }

  const addWirePoint = (hole: Hole, isStraight: boolean) => {
    const s = useEditor.getState()
    const d = s.draft
    if (!d || d.side !== facing) return s.setDraft({ side: facing, points: [hole], flip: false })
    const last = d.points[d.points.length - 1]
    if (last[0] !== hole[0] || last[1] !== hole[1]) {
      return s.setDraft({ ...d, points: draftRoute(d, hole, isStraight), flip: false })
    }
    finishDraft()
  }

  const itemAt = (e: React.MouseEvent): Item | null => {
    const element = e.target as Element
    const wireId = element.closest('[data-vertex]') && only(useEditor.getState().selection, 'wire')
    if (wireId) return { kind: 'wire', id: wireId }
    const target = element.closest('[data-part],[data-wire]')
    const part = target?.getAttribute('data-part')
    const wire = target?.getAttribute('data-wire')
    return part ? { kind: 'part', id: part } : wire ? { kind: 'wire', id: wire } : null
  }

  // Selects what a click would, keeping a selection the click landed inside.
  // Mid-placement or mid-wire there is nothing to offer, and no browser menu.
  const onContextMenu = (e: React.MouseEvent) => {
    const s = useEditor.getState()
    if (s.placing || s.draft) return e.preventDefault()
    const item = itemAt(e)
    if (!item) s.select([])
    else if (!isSelected(s.selection, item.id)) s.select([item])
    setMenuHole(holeAt(e))
  }

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button === 2 || (e.button === 0 && e.ctrlKey)) return
    const s = useEditor.getState()
    svgRef.current!.setPointerCapture(e.pointerId)
    const hole = holeAt(e)
    const pan = () => (drag.current = { kind: 'pan', x: e.clientX, y: e.clientY, vx: view.x, vy: view.y })
    if (e.button === 1 || space || tool === 'pan' || tool === 'probe') return pan()
    if (e.button !== 0) return
    if (placing) return place(placing, hole, e.shiftKey)
    if (tool === 'wire') return addWirePoint(hole, e.shiftKey)
    const vertex = (e.target as Element).closest('[data-vertex]')
    const selectedWire = only(s.selection, 'wire')
    if (vertex && selectedWire) {
      const wire = s.doc.wires.find((w) => w.id === selectedWire)!
      drag.current = { kind: 'vertex', id: wire.id, index: Number(vertex.getAttribute('data-vertex')), points: wire.points, moved: false }
      return
    }
    const item = itemAt(e)
    if (!item) {
      // Shift-drag on empty board draws a selection box; a plain drag pans.
      if (e.shiftKey) {
        drag.current = { kind: 'box', start: hole }
        return setBox([hole, hole])
      }
      s.select([])
      return pan()
    }
    if (e.shiftKey) {
      const on = isSelected(s.selection, item.id)
      return s.select(on ? s.selection.filter((i) => i.id !== item.id) : [...s.selection, item])
    }
    // Pressing on something already selected drags the whole selection; a
    // click without moving then narrows it down to that one thing.
    const keep = isSelected(s.selection, item.id)
    const selection = keep ? s.selection : [item]
    if (!keep) s.select(selection)
    drag.current = {
      kind: 'items',
      start: hole,
      base: s.doc,
      ids: new Set(selection.map((i) => i.id)),
      moved: false,
      collapse: keep && s.selection.length > 1 ? item : undefined,
    }
  }

  const onPointerMove = (e: React.PointerEvent) => {
    const s = useEditor.getState()
    const hole = holeAt(e)
    if (s.highlight) s.setHighlight(null)
    const wire = tool === 'probe' ? ((e.target as Element).closest('[data-wire]')?.getAttribute('data-wire') ?? undefined) : undefined
    if (!s.hover || s.hover.side !== facing || s.hover.hole[0] !== hole[0] || s.hover.hole[1] !== hole[1] || s.hover.wire !== wire)
      s.setHover({ hole, side: facing, wire })
    const d = drag.current
    if (d?.kind === 'pan') {
      s.setView(viewKey, { ...view, x: d.vx + e.clientX - d.x, y: d.vy + e.clientY - d.y })
    } else if (d?.kind === 'items') {
      const [dc, dr] = [hole[0] - d.start[0], hole[1] - d.start[1]]
      if (!d.moved && !dc && !dr) return
      if (!d.moved) {
        s.checkpoint()
        d.moved = true
      }
      s.preview(() => move(d.base, d.ids, dc, dr))
    } else if (d?.kind === 'box') {
      setBox([d.start, hole])
    } else if (d?.kind === 'vertex') {
      const [c, r] = d.points[d.index]
      if (!d.moved && c === hole[0] && r === hole[1]) return
      if (!d.moved) {
        s.checkpoint()
        d.moved = true
      }
      s.preview((doc) => updateWire(doc, d.id, { points: moveVertex(d.points, d.index, hole, e.shiftKey) }))
    }
  }

  const onPointerUp = () => {
    const d = drag.current
    drag.current = null
    const s = useEditor.getState()
    if (d?.kind === 'items' && !d.moved && d.collapse) s.select([d.collapse])
    if (d?.kind === 'box' && box) {
      const add = boxed(box).filter((i) => !isSelected(s.selection, i.id))
      s.select([...s.selection, ...add])
      setBox(null)
    }
    if (d?.kind !== 'vertex' || !d.moved) return
    useEditor.getState().preview((doc) => {
      const wire = doc.wires.find((w) => w.id === d.id)
      return wire ? updateWire(doc, d.id, { points: simplify(wire.points) }) : doc
    })
  }

  const here = hover?.hole ?? null
  const near = placed.filter(({ part, def }) => part.side === shown && !def.annotation)
  const far = placed.filter(({ part, def }) => part.side !== shown && !def.annotation)
  const notes = placed.filter(({ part, def }) => part.side === shown && def.annotation)
  const handles = doc.wires.find((w) => w.id === only(selection, 'wire') && w.side === shown)
  const selectedParts = placed.filter(({ part }) => isSelected(selection, part.id))
  const ghost: Placed | null = (() => {
    if (!placing || !here) return null
    const def = partById(placing.def)!
    const side = hover?.side ?? facing
    const [dc, dr] = centreOffset(def, { ...placing, side })
    return { def, part: { ...placing, side, col: here[0] - dc, row: here[1] - dr } }
  })()
  const hoverPins = useMemo(() => (here ? pinsAt(doc.parts, here) : []), [doc.parts, here])
  // The probe follows the pointer in whichever view it is in, and lights the
  // net up in both, so the split view shows it front and back at once.
  const probed = tool === 'probe' && hover && !placing ? analysis.probe(hover.hole, hover.side, hover.wire) : undefined
  const liveWires = new Set(probed?.wireIds)
  const liveHoles = new Set(probed?.pins.map((p) => holeKey(p.hole)))
  const mode = placing ? 'place' : space || tool === 'pan' ? 'pan' : tool
  const cx = board.width / 2
  const world = `translate(${view.x} ${view.y}) scale(${view.scale}) translate(${cx} 0) scale(${squash} 1) translate(${-cx} 0)${mirrored ? ` translate(${board.width} 0) scale(-1 1)` : ''}`

  const toScreen = (h: Hole) => {
    const { x, y } = holeToMm(board, h)
    return { x: view.x + (mirrored ? board.width - x : x) * view.scale, y: view.y + y * view.scale }
  }
  const tip = here && hoverPins.length && !placing && !pinEdit && !probed ? toScreen(here) : null
  const probeTip = probed && here && hover?.side === facing ? toScreen(here) : null
  const editing = (() => {
    if (!pinEdit || pinEdit.side !== facing) return null
    const part = doc.parts.find((p) => p.id === pinEdit.partId)
    const def = part && partById(part.def)
    const hole = part && def && partPins(part, def)[pinEdit.index]
    return hole ? toScreen(hole) : null
  })()

  return (
    <div className="canvas-wrap">
      <ContextMenu.Root>
        <ContextMenu.Trigger asChild onContextMenu={onContextMenu}>
          <svg
            ref={svgRef}
            className={`canvas mode-${mode}${probed ? ' probing' : ''}`}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerLeave={() => useEditor.getState().setHover(null)}
            onDoubleClick={(e) => tool === 'select' && !placing && editPinLabel(holeAt(e), facing)}
          >
            <g transform={world}>
              <BoardView board={board} coords={coords(doc, board)} mirrored={mirrored} />
              {layers.far && layers.bodies && far.map((p) => <PartBody key={p.part.id} {...p} board={board} far />)}
              {layers.far && layers.wires &&
                doc.wires.filter((w) => w.side !== shown).map((w) => <WireView key={w.id} {...w} board={board} far live={liveWires.has(w.id)} />)}
              <PinsLayer items={placed} board={board} facing={shown} conflicts={conflicts} live={liveHoles} />
              {layers.wires &&
                doc.wires.filter((w) => w.side === shown).map((w) => (
                  <WireView key={w.id} {...w} board={board} selected={isSelected(selection, w.id)} live={liveWires.has(w.id)} />
                ))}
              {layers.wires &&
                analysis.junctions.map(({ hole: h, side, color, wire }) => {
                  const { x, y } = holeToMm(board, h)
                  const cls = ['junction', side !== shown && 'far', liveWires.has(wire) && 'live'].filter(Boolean).join(' ')
                  return <circle key={`${h}`} className={cls} cx={x} cy={y} r={0.52} style={{ fill: color }} />
                })}
              {layers.bodies && notes.map((p) => <PartBody key={p.part.id} {...p} board={board} />)}
              {layers.bodies && near.map((p) => <PartBody key={p.part.id} {...p} board={board} />)}
              {layers.names && <NamesLayer names={names} board={board} mirrored={mirrored} />}
              {probed && <ProbeOverlay net={probed} wires={doc.wires} board={board} shown={shown} />}
              {selectedParts.map((p) => <SelectionOutline key={p.part.id} {...p} board={board} />)}
              {handles && tool === 'select' && <WireHandles points={handles.points} board={board} />}
              {box && <SelectionBox box={box} board={board} />}
              {ghost && (
                <>
                  <PartBody {...ghost} board={board} ghost far={ghost.part.side !== shown} />
                  <PinsLayer items={[ghost]} board={board} facing={shown} ghost />
                </>
              )}
              {draft && (
                <WireView
                  points={draftRoute(draft, here, straight)}
                  color={wireColor}
                  board={board}
                  far={draft.side !== shown}
                  draft
                />
              )}
              {here && (tool === 'wire' || placing || hoverPins.length > 0) && <HoverRing board={board} hole={here} />}
              {rings.map((h) => {
                const { x, y } = holeToMm(board, h)
                return <circle key={holeKey(h)} className="check-ring" cx={x} cy={y} r={1.6} />
              })}
            </g>
          </svg>
        </ContextMenu.Trigger>
        <ContextMenu.Portal>
          <ContextMenu.Content className="menu" onCloseAutoFocus={leaveFocus}>
            {menuHole && <CanvasMenu hole={menuHole} facing={facing} />}
          </ContextMenu.Content>
        </ContextMenu.Portal>
      </ContextMenu.Root>
      {tip && <PinTip x={tip.x} y={tip.y} pins={hoverPins} />}
      {probed && probeTip && <ProbeTip x={probeTip.x} y={probeTip.y} net={probed} />}
      {pinEdit && editing && <PinLabelEditor key={`${pinEdit.partId}:${pinEdit.index}`} edit={pinEdit} x={editing.x} y={editing.y} />}
    </div>
  )
}

// Upright, text-sized label next to the hovered hole, drawn over the canvas.
function PinTip({ x, y, pins }: { x: number; y: number; pins: ReturnType<typeof pinsAt> }) {
  return (
    <div className="pin-tip" style={{ left: x, top: y }}>
      {pins.map((p, i) => (
        <div key={i} className="pin-tip-entry">
          <div className="pin-tip-name">{p.name}</div>
          {p.detail && <div className="pin-tip-detail">{p.detail}</div>}
          <div className="pin-tip-part">{p.part} · {p.side}</div>
        </div>
      ))}
    </div>
  )
}

// The probed net drawn over everything, bodies included, so a connection
// running under a module can still be followed.
function ProbeOverlay({ net, wires, board, shown }: { net: Net; wires: Wire[]; board: BoardDef; shown: Side }) {
  const ids = new Set(net.wireIds)
  const holes = new Map(net.pins.map((p) => [holeKey(p.hole), p.hole]))
  return (
    <g className="probe">
      {wires.filter((w) => ids.has(w.id)).map((w) => (
        <polyline
          key={w.id}
          className={w.side === shown ? 'probe-wire' : 'probe-wire far'}
          points={w.points.map((p) => holeToMm(board, p)).map(({ x, y }) => `${x},${y}`).join(' ')}
        />
      ))}
      {[...holes].map(([k, h]) => {
        const { x, y } = holeToMm(board, h)
        return <circle key={k} className="probe-ring" cx={x} cy={y} r={1.25} />
      })}
    </g>
  )
}

const TIP_ROWS = 10

// What the probe reaches, listed the way the report names pins.
function ProbeTip({ x, y, net }: { x: number; y: number; net: Net }) {
  const pins = [...new Map(net.pins.map((p) => [`${p.ref}.${p.name}`, p])).values()]
  const parts = new Set(pins.map((p) => p.partId)).size
  const title =
    parts <= 1 && !net.wires.length
      ? 'Not connected to anything'
      : pins.length
        ? `${pins.length} ${pins.length === 1 ? 'pin' : 'pins'} connected`
        : 'No pins on this wire'
  return (
    <div className="pin-tip probe-tip" style={{ left: x, top: y }}>
      <div className="pin-tip-name">{title}</div>
      {pins.slice(0, TIP_ROWS).map((p) => (
        <div key={`${p.ref}.${p.name}`} className="probe-pin">
          <span className="probe-ref">{p.ref}.{p.name}</span>
          {p.detail && <span className="pin-tip-detail">{p.detail}</span>}
        </div>
      ))}
      {pins.length > TIP_ROWS && <div className="pin-tip-part">and {pins.length - TIP_ROWS} more</div>}
      {net.wires.length > 0 && <div className="pin-tip-part">via {net.wires.join(', ')}</div>}
    </div>
  )
}

function SelectionBox({ box: [a, b], board }: { box: [Hole, Hole]; board: BoardDef }) {
  const p = holeToMm(board, [Math.min(a[0], b[0]), Math.min(a[1], b[1])])
  const q = holeToMm(board, [Math.max(a[0], b[0]), Math.max(a[1], b[1])])
  const pad = 1.27
  return <rect className="selection-box" x={p.x - pad} y={p.y - pad} width={q.x - p.x + 2 * pad} height={q.y - p.y + 2 * pad} />
}

function HoverRing({ board, hole }: { board: BoardDef; hole: Hole }) {
  const { x, y } = holeToMm(board, hole)
  return <circle className="hover-ring" cx={x} cy={y} r={1.1} />
}
