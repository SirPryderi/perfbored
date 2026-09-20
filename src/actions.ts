import { docBoard, partById } from './library'
import { emptyDoc, newId, parseDoc, removeById, updatePart } from './model/doc'
import { isMirrored, partPins } from './model/geometry'
import type { Naming, Origin } from './model/naming'
import { simplify } from './model/routing'
import { listFiles, loadFile, removeFile, saveFile } from './files'
import type { Doc, Hole, PartDef, PartInstance, Rotation } from './model/types'
import { describe } from './report'
import { useEditor } from './store'

const state = () => useEditor.getState()

const selectedPart = () => {
  const s = state()
  return s.selection?.kind === 'part' ? s.doc.parts.find((p) => p.id === s.selection!.id) : undefined
}

export function rotate(delta: 90 | -90) {
  const s = state()
  const turn = (rot: Rotation) => (((rot + delta + 360) % 360) as Rotation)
  if (s.placing) return s.setPlacing({ ...s.placing, rot: turn(s.placing.rot) })
  const part = selectedPart()
  if (part) s.change((d) => updatePart(d, part.id, { rot: turn(part.rot) }))
}

// Moving a part through the board, or turning it upside down, mirrors it;
// shift it so its legs stay in the same holes.
function mirrorInPlace(part: PartInstance, def: PartDef, patch: Partial<PartInstance>) {
  const cols = partPins(part, def).map(([c]) => c)
  const shift = cols.length ? Math.min(...cols) + Math.max(...cols) - 2 * part.col : 0
  state().change((d) => updatePart(d, part.id, { ...patch, col: part.col + shift }))
}

export function flipSide() {
  const part = selectedPart()
  const def = part && partById(part.def)
  if (!part || !def || def.annotation) return
  mirrorInPlace(part, def, { side: part.side === 'front' ? 'back' : 'front' })
}

export function upsideDown() {
  const part = selectedPart()
  const def = part && partById(part.def)
  if (!part || !def?.flippable) return
  mirrorInPlace(part, def, { flipped: !part.flipped })
}

function reorder(toFront: boolean) {
  const part = selectedPart()
  if (!part) return
  state().change((d) => {
    const rest = d.parts.filter((p) => p.id !== part.id)
    return { ...d, parts: toFront ? [...rest, part] : [part, ...rest] }
  })
}

export const bringToFront = () => reorder(true)
export const sendToBack = () => reorder(false)

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
  const props = def.pinLabel.set({ ...def.defaults, ...part.props }, index, label)
  state().change((d) => updatePart(d, partId, { props }))
}

export function deleteSelection() {
  const s = state()
  if (!s.selection) return
  const id = s.selection.id
  s.change((d) => removeById(d, id))
  s.select(null)
}

export function duplicate() {
  const part = selectedPart()
  if (!part) return
  const copy = { ...part, id: newId(), col: part.col + 1, row: part.row + 1 }
  state().change((d) => ({ ...d, parts: [...d.parts, copy] }))
  state().select({ kind: 'part', id: copy.id })
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
// with the board, and a mirrored part turns the other way, since its mirror is
// applied after its own rotation.
export function rotateBoard(delta: 90 | -90 | 180) {
  const s = state()
  const { cols, rows } = docBoard(s.doc)
  const map = ([c, r]: Hole): Hole =>
    delta === 90 ? [rows - 1 - r, c] : delta === -90 ? [r, cols - 1 - c] : [cols - 1 - c, rows - 1 - r]
  s.change((d) => ({
    ...d,
    portrait: delta === 180 ? d.portrait : !d.portrait,
    parts: d.parts.map((p) => {
      const [col, row] = map([p.col, p.row])
      const spin = isMirrored(p) ? -delta : delta
      return { ...p, col, row, rot: (((p.rot + spin + 360) % 360) as Rotation) }
    }),
    wires: d.wires.map((w) => ({ ...w, points: w.points.map(map) })),
  }))
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
