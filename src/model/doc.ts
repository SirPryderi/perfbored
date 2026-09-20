import type { Doc, PartInstance, Wire } from './types'

export const newId = () => crypto.randomUUID().slice(0, 8)

export const emptyDoc = (board = 'perf-5x7'): Doc => ({
  version: 1,
  name: 'Untitled board',
  board,
  parts: [],
  wires: [],
})

export function updatePart(doc: Doc, id: string, patch: Partial<PartInstance>): Doc {
  return { ...doc, parts: doc.parts.map((p) => (p.id === id ? { ...p, ...patch } : p)) }
}

export function updateWire(doc: Doc, id: string, patch: Partial<Wire>): Doc {
  return { ...doc, wires: doc.wires.map((w) => (w.id === id ? { ...w, ...patch } : w)) }
}

export function removeById(doc: Doc, id: string): Doc {
  return { ...doc, parts: doc.parts.filter((p) => p.id !== id), wires: doc.wires.filter((w) => w.id !== id) }
}

export function parseDoc(text: string): Doc {
  const doc = JSON.parse(text)
  if (doc?.version !== 1 || !Array.isArray(doc.parts) || !Array.isArray(doc.wires) || typeof doc.board !== 'string')
    throw new Error('Not a perfboard file')
  return { ...doc, wires: doc.wires.map((w: Wire) => ({ ...w, side: w.side ?? 'back' })) }
}
