import { emptyDoc, newId, parseDoc } from './model/doc'
import type { Doc } from './model/types'

export interface FileMeta {
  id: string
  name: string
  updated: number
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

export function saveFile(id: string, doc: Doc) {
  localStorage.setItem(docKey(id), JSON.stringify(doc))
  localStorage.setItem(CURRENT, id)
  const others = read<FileMeta[]>(INDEX, []).filter((f) => f.id !== id)
  localStorage.setItem(INDEX, JSON.stringify([...others, { id, name: doc.name, updated: Date.now() }]))
}

export function removeFile(id: string) {
  localStorage.removeItem(docKey(id))
  localStorage.setItem(INDEX, JSON.stringify(read<FileMeta[]>(INDEX, []).filter((f) => f.id !== id)))
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
