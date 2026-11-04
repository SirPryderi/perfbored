import { emptyDoc, newId, parseDoc } from './model/doc'
import type { Doc } from './model/types'

export interface FileMeta {
  id: string
  name: string
  updated: number
}

export function ago(time: number) {
  const minutes = Math.round((Date.now() - time) / 60000)
  if (minutes < 1) return 'now'
  if (minutes < 60) return `${minutes}m`
  if (minutes < 60 * 24) return `${Math.round(minutes / 60)}h`
  return `${Math.round(minutes / 60 / 24)}d`
}

const INDEX = 'perfbored:files'
const CURRENT = 'perfbored:current'
const docKey = (id: string) => `perfbored:doc:${id}`

// Boards saved before the rename, and before multiple boards existed.
const OLD = { index: 'perfboard:files', current: 'perfboard:current', doc: 'perfboard:doc' }

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

export const listFiles = (): FileMeta[] => read<FileMeta[]>(INDEX, []).sort((a, b) => b.updated - a.updated)

export function loadFile(id: string): Doc | null {
  try {
    const raw = localStorage.getItem(docKey(id))
    return raw ? parseDoc(raw) : null
  } catch {
    return null
  }
}

function writeFile(id: string, doc: Doc, updated: number) {
  localStorage.setItem(docKey(id), JSON.stringify(doc))
  const others = read<FileMeta[]>(INDEX, []).filter((f) => f.id !== id)
  localStorage.setItem(INDEX, JSON.stringify([...others, { id, name: doc.name, updated }]))
}

export function saveFile(id: string, doc: Doc) {
  writeFile(id, doc, Date.now())
  localStorage.setItem(CURRENT, id)
}

export function removeFile(id: string) {
  localStorage.removeItem(docKey(id))
  localStorage.setItem(INDEX, JSON.stringify(read<FileMeta[]>(INDEX, []).filter((f) => f.id !== id)))
}

export const exportBoards = () => ({
  version: 1,
  boards: listFiles().flatMap((f) => {
    const doc = loadFile(f.id)
    return doc ? [{ updated: f.updated, doc }] : []
  }),
})

// Adds to the boards already here and never replaces one: a board identical to
// an existing one is skipped, so importing the same file twice changes nothing.
// Returns null when the text is not an export of all boards.
export function importBoards(text: string): { added: number; skipped: number } | null {
  const data = JSON.parse(text)
  if (!Array.isArray(data?.boards)) return null
  const incoming = data.boards.map((b: { updated?: number; doc: unknown }) => ({
    updated: b.updated ?? Date.now(),
    doc: parseDoc(JSON.stringify(b.doc)),
  }))
  const existing = new Set(listFiles().map((f) => JSON.stringify(loadFile(f.id))))
  const fresh = incoming.filter((b: { doc: Doc }) => !existing.has(JSON.stringify(b.doc)))
  for (const b of fresh) writeFile(newId(), b.doc, b.updated)
  return { added: fresh.length, skipped: incoming.length - fresh.length }
}

function migrate() {
  if (!localStorage.getItem(INDEX)) {
    const old = read<FileMeta[]>(OLD.index, [])
    for (const f of old) {
      const raw = localStorage.getItem(`${OLD.doc}:${f.id}`)
      if (raw) localStorage.setItem(docKey(f.id), raw)
    }
    if (old.length) {
      localStorage.setItem(INDEX, JSON.stringify(old))
      const current = localStorage.getItem(OLD.current)
      if (current) localStorage.setItem(CURRENT, current)
    }
  }
  const single = localStorage.getItem(OLD.doc)
  if (!single) return
  const id = newId()
  try {
    saveFile(id, parseDoc(single))
  } catch {
    saveFile(id, emptyDoc())
  }
  localStorage.removeItem(OLD.doc)
}

// The board to open on start: the last one used, migrating older saves.
export function initialFile(): { id: string; doc: Doc } {
  migrate()
  const current = localStorage.getItem(CURRENT)
  for (const id of [current, ...listFiles().map((f) => f.id)]) {
    const doc = id && loadFile(id)
    if (id && doc) return { id, doc }
  }
  const id = newId()
  const doc = emptyDoc()
  saveFile(id, doc)
  return { id, doc }
}
