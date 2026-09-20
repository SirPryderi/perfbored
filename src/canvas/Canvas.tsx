import { useEffect, useMemo, useRef, useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { docBoard, partById, pinsAt } from '../library'
import { newId, updatePart, updateWire } from '../model/doc'
import { centreOffset, holeKey, holeToMm, mmToHole, partPins } from '../model/geometry'
import { editPinLabel, finishDraft } from '../actions'
import { corner, moveVertex, naturalBend, simplify } from '../model/routing'
import type { BoardDef, Hole, PartInstance, Side } from '../model/types'
import { useEditor, type Draft, type ViewKey } from '../store'
import { useAnalysis } from '../useAnalysis'
import { coords } from '../model/naming'
import { BoardView } from './BoardView'
import { PartBody, PinsLayer, SelectionOutline, type Placed } from './PartView'
import { PinLabelEditor } from './PinLabelEditor'
import { WireHandles, WireView } from './WireView'

type Drag =
  | { kind: 'pan'; x: number; y: number; vx: number; vy: number }
  | { kind: 'part'; id: string; start: Hole; col: number; row: number; moved: boolean }
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
    const scale = Math.min((r.width - 90) / board.width, (r.height - 90) / board.height)
    useEditor.getState().setView(viewKey, {
      scale,
      x: (r.width - board.width * scale) / 2,
      y: (r.height - board.height * scale) / 2,
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
    s.select({ kind: 'part', id: next.id })
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

  const onPointerDown = (e: React.PointerEvent) => {
    const s = useEditor.getState()
    svgRef.current!.setPointerCapture(e.pointerId)
    const hole = holeAt(e)
    const pan = () => (drag.current = { kind: 'pan', x: e.clientX, y: e.clientY, vx: view.x, vy: view.y })
    if (e.button === 1 || space || tool === 'pan') return pan()
    if (e.button !== 0) return
    if (placing) return place(placing, hole, e.shiftKey)
    if (tool === 'wire') return addWirePoint(hole, e.shiftKey)
    const vertex = (e.target as Element).closest('[data-vertex]')
    if (vertex && s.selection?.kind === 'wire') {
      const wire = s.doc.wires.find((w) => w.id === s.selection!.id)!
      drag.current = { kind: 'vertex', id: wire.id, index: Number(vertex.getAttribute('data-vertex')), points: wire.points, moved: false }
      return
    }
    const target = (e.target as Element).closest('[data-part],[data-wire]')
    const partId = target?.getAttribute('data-part')
    const wireId = target?.getAttribute('data-wire')
    if (partId) {
      const part = s.doc.parts.find((p) => p.id === partId)!
      s.select({ kind: 'part', id: partId })
      drag.current = { kind: 'part', id: partId, start: hole, col: part.col, row: part.row, moved: false }
    } else if (wireId) {
      s.select({ kind: 'wire', id: wireId })
    } else {
      s.select(null)
      pan()
    }
  }

  const onPointerMove = (e: React.PointerEvent) => {
    const s = useEditor.getState()
    const hole = holeAt(e)
    if (!s.hover || s.hover.side !== facing || s.hover.hole[0] !== hole[0] || s.hover.hole[1] !== hole[1])
      s.setHover({ hole, side: facing })
    const d = drag.current
    if (d?.kind === 'pan') {
      s.setView(viewKey, { ...view, x: d.vx + e.clientX - d.x, y: d.vy + e.clientY - d.y })
    } else if (d?.kind === 'part') {
      const col = d.col + hole[0] - d.start[0]
      const row = d.row + hole[1] - d.start[1]
      const part = s.doc.parts.find((p) => p.id === d.id)
      if (!part || (part.col === col && part.row === row)) return
      if (!d.moved) {
        s.checkpoint()
        d.moved = true
      }
      s.preview((doc) => updatePart(doc, d.id, { col, row }))
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
  const selectedWire = selection?.kind === 'wire' ? doc.wires.find((w) => w.id === selection.id && w.side === shown) : undefined
  const selectedPart = selection?.kind === 'part' ? placed.find(({ part }) => part.id === selection.id) : undefined
  const ghost: Placed | null = (() => {
    if (!placing || !here) return null
    const def = partById(placing.def)!
    const side = hover?.side ?? facing
    const [dc, dr] = centreOffset(def, { ...placing, side })
    return { def, part: { ...placing, side, col: here[0] - dc, row: here[1] - dr } }
  })()
  const hoverPins = useMemo(() => (here ? pinsAt(doc.parts, here) : []), [doc.parts, here])
  const mode = placing ? 'place' : space || tool === 'pan' ? 'pan' : tool
  const cx = board.width / 2
  const world = `translate(${view.x} ${view.y}) scale(${view.scale}) translate(${cx} 0) scale(${squash} 1) translate(${-cx} 0)${mirrored ? ` translate(${board.width} 0) scale(-1 1)` : ''}`

  const toScreen = (h: Hole) => {
    const { x, y } = holeToMm(board, h)
    return { x: view.x + (mirrored ? board.width - x : x) * view.scale, y: view.y + y * view.scale }
  }
  const tip = here && hoverPins.length && !placing && !pinEdit ? toScreen(here) : null
  const editing = (() => {
    if (!pinEdit || pinEdit.side !== facing) return null
    const part = doc.parts.find((p) => p.id === pinEdit.partId)
    const def = part && partById(part.def)
    const hole = part && def && partPins(part, def)[pinEdit.index]
    return hole ? toScreen(hole) : null
  })()

  return (
    <div className="canvas-wrap">
      <svg
        ref={svgRef}
        className={`canvas mode-${mode}`}
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
            doc.wires.filter((w) => w.side !== shown).map((w) => <WireView key={w.id} {...w} board={board} far />)}
          <PinsLayer items={placed} board={board} facing={shown} conflicts={conflicts} />
          {layers.wires &&
            doc.wires.filter((w) => w.side === shown).map((w) => (
              <WireView key={w.id} {...w} board={board} selected={selection?.id === w.id} />
            ))}
          {layers.wires &&
            analysis.junctions.map(({ hole: h, side, color }) => {
              const { x, y } = holeToMm(board, h)
              return (
                <circle key={`${h}`} className={side === shown ? 'junction' : 'junction far'} cx={x} cy={y} r={0.52} style={{ fill: color }} />
              )
            })}
          {layers.bodies && notes.map((p) => <PartBody key={p.part.id} {...p} board={board} />)}
          {layers.bodies && near.map((p) => <PartBody key={p.part.id} {...p} board={board} />)}
          {selectedPart && <SelectionOutline {...selectedPart} board={board} />}
          {selectedWire && tool === 'select' && <WireHandles points={selectedWire.points} board={board} />}
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
          {highlight?.map((h) => {
            const { x, y } = holeToMm(board, h)
            return <circle key={`hl${h}`} className="check-ring" cx={x} cy={y} r={1.6} />
          })}
        </g>
      </svg>
      {tip && <PinTip x={tip.x} y={tip.y} pins={hoverPins} />}
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

function HoverRing({ board, hole }: { board: BoardDef; hole: Hole }) {
  const { x, y } = holeToMm(board, hole)
  return <circle className="hover-ring" cx={x} cy={y} r={1.1} />
}
