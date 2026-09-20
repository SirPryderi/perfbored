import { create } from 'zustand'
import { initialFile, listFiles, saveFile, type FileMeta } from './files'
import { WIRE_COLORS } from './model/routing'
import type { Doc, Hole, PartInstance, Side } from './model/types'

export type Tool = 'select' | 'wire' | 'pan'
export type Selection = { kind: 'part' | 'wire'; id: string } | null
export type Layer = 'bodies' | 'far' | 'wires'
export type Layout = 'single' | 'split'
export type ViewKey = 'single' | 'split'
export type Menu = 'main' | 'files' | null
export type Panel = 'properties' | 'checks' | 'keys'

export interface Draft {
  side: Side
  points: Hole[]
  flip: boolean
}

export interface PinEdit {
  partId: string
  index: number
  side: Side
}

export interface Hover {
  hole: Hole
  side: Side
}

export interface View {
  x: number
  y: number
  scale: number
}

interface EditorState {
  fileId: string
  files: FileMeta[]
  menu: Menu
  panel: Panel
  pinEdit: PinEdit | null
  notice: string | null
  doc: Doc
  past: Doc[]
  future: Doc[]
  selection: Selection
  tool: Tool
  placing: PartInstance | null
  wireColor: string
  layers: Record<Layer, boolean>
  views: Record<ViewKey, View>
  layout: Layout
  facing: Side
  hover: Hover | null
  highlight: Hole[] | null
  draft: Draft | null
  fitNonce: number
  change: (fn: (doc: Doc) => Doc) => void
  preview: (fn: (doc: Doc) => Doc) => void
  checkpoint: () => void
  undo: () => void
  redo: () => void
  open: (fileId: string, doc: Doc) => void
  setMenu: (menu: Menu) => void
  setPanel: (panel: Panel) => void
  setPinEdit: (edit: PinEdit | null) => void
  notify: (notice: string) => void
  select: (selection: Selection) => void
  setTool: (tool: Tool) => void
  setPlacing: (part: PartInstance | null) => void
  setWireColor: (color: string) => void
  toggleLayer: (layer: Layer) => void
  setView: (key: ViewKey, view: View) => void
  setLayout: (layout: Layout) => void
  flip: () => void
  setHover: (hover: Hover | null) => void
  setHighlight: (holes: Hole[] | null) => void
  setDraft: (draft: Draft | null) => void
  requestFit: () => void
}

const DEFAULT_VIEW: View = { x: 40, y: 40, scale: 8 }
const HISTORY = 200
const first = initialFile()

export const useEditor = create<EditorState>((set) => ({
  fileId: first.id,
  files: listFiles(),
  menu: null,
  panel: 'properties',
  pinEdit: null,
  notice: null,
  doc: first.doc,
  past: [],
  future: [],
  selection: null,
  tool: 'select',
  placing: null,
  wireColor: WIRE_COLORS[0].value,
  layers: { bodies: true, far: true, wires: true },
  views: { single: DEFAULT_VIEW, split: DEFAULT_VIEW },
  layout: 'single',
  facing: 'front',
  hover: null,
  highlight: null,
  draft: null,
  fitNonce: 0,

  change: (fn) => set((s) => ({ doc: fn(s.doc), past: [...s.past, s.doc].slice(-HISTORY), future: [] })),
  preview: (fn) => set((s) => ({ doc: fn(s.doc) })),
  checkpoint: () => set((s) => ({ past: [...s.past, s.doc].slice(-HISTORY), future: [] })),
  undo: () =>
    set((s) =>
      s.past.length ? { doc: s.past[s.past.length - 1], past: s.past.slice(0, -1), future: [s.doc, ...s.future], selection: null } : s,
    ),
  redo: () =>
    set((s) => (s.future.length ? { doc: s.future[0], future: s.future.slice(1), past: [...s.past, s.doc], selection: null } : s)),
  open: (fileId, doc) =>
    set((s) => ({ fileId, doc, past: [], future: [], selection: null, placing: null, draft: null, fitNonce: s.fitNonce + 1 })),
  setMenu: (menu) => set({ menu }),
  setPanel: (panel) => set({ panel }),
  setPinEdit: (pinEdit) => set({ pinEdit }),
  notify: (notice) => {
    set({ notice })
    setTimeout(() => useEditor.getState().notice === notice && set({ notice: null }), 2500)
  },
  select: (selection) => set((s) => ({ selection, panel: selection ? 'properties' : s.panel })),
  setTool: (tool) => set({ tool, placing: null, draft: null }),
  setPlacing: (placing) => set({ placing, tool: 'select', selection: null }),
  setWireColor: (wireColor) => set({ wireColor }),
  toggleLayer: (layer) => set((s) => ({ layers: { ...s.layers, [layer]: !s.layers[layer] } })),
  setView: (key, view) => set((s) => ({ views: { ...s.views, [key]: view } })),
  setLayout: (layout) => set((s) => ({ layout, fitNonce: s.fitNonce + 1 })),
  flip: () => set((s) => ({ facing: s.facing === 'front' ? 'back' : 'front' })),
  setHover: (hover) => set({ hover }),
  setHighlight: (highlight) => set({ highlight }),
  setDraft: (draft) => set({ draft }),
  requestFit: () => set((s) => ({ fitNonce: s.fitNonce + 1 })),
}))

useEditor.subscribe((s, prev) => {
  if (s.doc === prev.doc && s.fileId === prev.fileId) return
  saveFile(s.fileId, s.doc)
  useEditor.setState({ files: listFiles() })
})
