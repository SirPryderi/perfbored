import { docBoard, partById } from './library'
import { about, centreOf, copies, mirrorShift, move, otherSide, pick, remove, turn, type Items } from './items'
import { emptyDoc, newId, parseDoc, updatePart } from './model/doc'
import { partPins, propsOf } from './model/geometry'
import type { Naming, Origin } from './model/naming'
import { simplify } from './model/routing'
import { listFiles, loadFile, removeFile, saveFile } from './files'
import type { Doc, Hole, Rotation } from './model/types'
import { describe } from './report'
import { only, useEditor, type Item } from './store'

const state = () => useEditor.getState()

const selectedIds = () => new Set(state().selection.map((i) => i.id))

const selectedPart = () => {
  const id = only(state().selection, 'part')
  return id ? state().doc.parts.find((p) => p.id === id) : undefined
}

const asSelection = (items: Items): Item[] => [
  ...items.parts.map((p) => ({ kind: 'part' as const, id: p.id })),
  ...items.wires.map((w) => ({ kind: 'wire' as const, id: w.id })),
]

// One part turns about its first pin, as it always has; anything more turns
// as a group about its middle, so wires stay on the legs they end on.
export function rotate(delta: 90 | -90) {
  const s = state()
  const spin = (rot: Rotation) => (((rot + delta + 360) % 360) as Rotation)
  if (s.placing) return s.setPlacing({ ...s.placing, rot: spin(s.placing.rot) })
  const part = selectedPart()
  if (part) return s.change((d) => updatePart(d, part.id, { rot: spin(part.rot) }))
  const ids = selectedIds()
  if (ids.size) s.change((d) => turn(d, ids, delta, about(centreOf(pick(d, ids)), delta)))
}

export function flipSide() {
  const ids = selectedIds()
  if (ids.size) state().change((d) => otherSide(d, ids))
}

// Turning a module upside down mirrors it; it shifts so its legs stay put.
export function upsideDown() {
  const s = state()
  const flippable = pick(s.doc, selectedIds()).parts.filter((p) => partById(p.def)?.flippable)
  if (!flippable.length) return
  const ids = new Set(flippable.map((p) => p.id))
  s.change((d) => ({
    ...d,
    parts: d.parts.map((p) => (ids.has(p.id) ? { ...p, flipped: !p.flipped, col: p.col + mirrorShift(p) } : p)),
  }))
}

// Selected parts keep their order among themselves.
function reorder(toFront: boolean) {
  const ids = selectedIds()
  if (!state().doc.parts.some((p) => ids.has(p.id))) return
  state().change((d) => {
    const chosen = d.parts.filter((p) => ids.has(p.id))
    const rest = d.parts.filter((p) => !ids.has(p.id))
    return { ...d, parts: toFront ? [...rest, ...chosen] : [...chosen, ...rest] }
  })
}

export const bringToFront = () => reorder(true)
export const sendToBack = () => reorder(false)

export function selectAll() {
  const { doc } = state()
  state().select(asSelection(doc))
}

export function nudge(dc: number, dr: number) {
  const ids = selectedIds()
  if (ids.size) state().change((d) => move(d, ids, dc, dr))
}

// The first pin at a hole whose label can be edited.
export function labellablePinAt(hole: Hole) {
  for (const part of [...state().doc.parts].reverse()) {
    const def = partById(part.def)
    if (!def?.pinLabel) continue
    const index = partPins(part, def).findIndex(([c, r]) => c === hole[0] && r === hole[1])
    if (index >= 0) return { partId: part.id, index }
  }
  return null
}

export function editPinLabel(hole = state().hover?.hole, side = state().hover?.side) {
  const pin = hole && side && labellablePinAt(hole)
  if (pin) state().setPinEdit({ ...pin, side })
}

export function setPinLabel(partId: string, index: number, label: string) {
  const part = state().doc.parts.find((p) => p.id === partId)
  const def = part && partById(part.def)
  if (!part || !def?.pinLabel) return
  const props = def.pinLabel.set(propsOf(part, def), index, label)
  state().change((d) => updatePart(d, partId, { props }))
}

export function deleteSelection() {
  const s = state()
  const ids = selectedIds()
  if (!ids.size) return
  s.change((d) => remove(d, ids))
  s.select([])
}

function add(items: Items) {
  const s = state()
  s.change((d) => ({ ...d, parts: [...d.parts, ...items.parts], wires: [...d.wires, ...items.wires] }))
  s.select(asSelection(items))
}

export function duplicate() {
  const items = pick(state().doc, selectedIds())
  if (items.parts.length || items.wires.length) add(copies(items, 1, 1))
}

// Copied items live here rather than on the system clipboard, so ⌘C still
// copies text anywhere else on the page. They survive switching boards.
let clipboard: Items | null = null

// Returns false when there is nothing selected, leaving the key to the page.
export function copy() {
  const items = pick(state().doc, selectedIds())
  if (!items.parts.length && !items.wires.length) return false
  clipboard = items
  const n = items.parts.length + items.wires.length
  state().notify(`Copied ${n} ${n === 1 ? 'item' : 'items'} — ⌘V pastes them under the pointer`)
}

export function cut() {
  if (copy() === false) return false
  deleteSelection()
}

// Pastes centred on the hole under the pointer, or next to the originals.
export function paste() {
  if (!clipboard) return false
  const hover = state().hover?.hole
  const [cc, cr] = centreOf(clipboard)
  const [dc, dr] = hover ? [hover[0] - cc, hover[1] - cr] : [2, 2]
  add(copies(clipboard, dc, dr))
}

export function finishDraft() {
  const s = state()
  if (!s.draft) return
  const points = simplify(s.draft.points)
  if (points.length >= 2) {
    const wire = { id: newId(), color: s.wireColor, side: s.draft.side, points }
    s.change((d) => ({ ...d, wires: [...d.wires, wire] }))
  }
  s.setDraft(null)
}

export function undoDraftPoint() {
  const s = state()
  if (!s.draft) return
  const points = s.draft.points.slice(0, -1)
  s.setDraft(points.length ? { ...s.draft, points } : null)
}

function openNew(doc: Doc) {
  const id = newId()
  saveFile(id, doc)
  state().open(id, doc)
}

export const newBoard = (board = state().doc.board) => openNew(emptyDoc(board))

export function openFile(id: string) {
  const doc = loadFile(id)
  if (doc) state().open(id, doc)
}

export const duplicateFile = () => openNew({ ...state().doc, name: `${state().doc.name} copy` })

export function deleteFile(id: string) {
  const s = state()
  const name = s.files.find((f) => f.id === id)?.name ?? 'this board'
  if (!confirm(`Delete “${name}”? This can't be undone.`)) return
  removeFile(id)
  useEditor.setState({ files: listFiles() })
  if (id !== s.fileId) return
  const next = listFiles()[0]
  if (next) openFile(next.id)
  else newBoard()
}

// Turning the board leaves every part where it physically is: holes rotate
// with the board, and so does everything on it.
export function rotateBoard(delta: 90 | -90 | 180) {
  const s = state()
  const { cols, rows } = docBoard(s.doc)
  const map = ([c, r]: Hole): Hole =>
    delta === 90 ? [rows - 1 - r, c] : delta === -90 ? [r, cols - 1 - c] : [cols - 1 - c, rows - 1 - r]
  s.change((d) => {
    const all = new Set([...d.parts, ...d.wires].map((i) => i.id))
    return { ...turn(d, all, delta, map), portrait: delta === 180 ? d.portrait : !d.portrait }
  })
  s.requestFit()
}

export const setNaming = (naming: Naming) => state().change((d) => ({ ...d, naming }))

export const setOrigin = (origin: Origin) => state().change((d) => ({ ...d, origin }))

export function changeBoard(board: string) {
  state().change((d) => ({ ...d, board }))
  state().requestFit()
}

export async function copyForReview() {
  await navigator.clipboard.writeText(describe(state().doc))
  state().notify('Copied a text description of this board — paste it into a chat to get it reviewed')
}

export async function copyJson() {
  await navigator.clipboard.writeText(JSON.stringify(state().doc, null, 2))
  state().notify('Copied this board as JSON — paste it into a chat, or into a file to open later')
}

export function exportJson() {
  const doc = state().doc
  const blob = new Blob([JSON.stringify(doc, null, 2)], { type: 'application/json' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `${doc.name.trim().replace(/[^\w-]+/g, '-') || 'board'}.perfbored.json`
  a.click()
  URL.revokeObjectURL(a.href)
}

export async function importJson(file: File) {
  try {
    openNew(parseDoc(await file.text()))
  } catch (e) {
    alert(`Couldn't open ${file.name}: ${(e as Error).message}`)
  }
}
