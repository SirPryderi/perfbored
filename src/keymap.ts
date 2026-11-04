import {
  bringToFront,
  canUpsideDown,
  copyForReview,
  copy,
  copyJson,
  cut,
  deleteFile,
  deleteSelection,
  duplicate,
  duplicateFile,
  editPinLabel,
  exportAll,
  exportJson,
  flipSide,
  hasClipboard,
  newBoard,
  nudge,
  paste,
  rotate,
  rotateBoard,
  selectAll,
  sendToBack,
  upsideDown,
} from './actions'
import { useEditor, type Layer, type Layout, type Panel, type Tool } from './store'

// Keys match on physical position (KeyboardEvent.code), so the home-row and
// number-row bindings stay put on any layout.
export interface Key {
  code: string
  mod?: boolean
  alt?: boolean
  shift?: boolean
}

export const GROUPS = ['Tools', 'Edit', 'View', 'Board', 'File'] as const

// One entry per action: the key handler, tooltips, menus, the shortcuts panel
// and the command palette all read this table.
export interface Command {
  label: string
  hint?: string
  group: (typeof GROUPS)[number]
  keys: Key[]
  // Returning false leaves the key to the browser, e.g. ⌘C with nothing selected.
  run?: (e?: KeyboardEvent) => unknown
  keywords?: string[]
  danger?: boolean
  // The palette hides a command while this is false.
  when?: () => boolean
  // The current state of something the command toggles or picks.
  on?: () => boolean
  // Needs the pointer or a held key, so it means nothing from the palette.
  unlisted?: boolean
}

const s = () => useEditor.getState()
const NUDGE: Record<string, [number, number]> = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] }
const layer = (l: Layer) => ({ run: () => s().toggleLayer(l), on: () => s().layers[l] })
const tool = (t: Tool) => ({ run: () => s().setTool(t), on: () => s().tool === t })
const panel = (p: Panel) => ({ run: () => s().setPanel(p), on: () => s().panel === p })
const layout = (l: Layout) => ({ run: () => s().setLayout(l), on: () => s().layout === l })
const pickFile = () => document.getElementById('open-file')?.click()
const hasSelection = () => s().selection.length > 0
const hasPart = () => s().selection.some((i) => i.kind === 'part')

const table = {
  palette: { label: 'Command palette', hint: 'find any action by name', group: 'View', keys: [{ code: 'KeyK', mod: true }], unlisted: true },
  select: { label: 'Select', group: 'Tools', keys: [{ code: 'KeyA' }, { code: 'KeyV', alt: true }], ...tool('select') },
  wire: { label: 'Wire', group: 'Tools', keys: [{ code: 'KeyS' }, { code: 'KeyW', alt: true }], ...tool('wire') },
  probe: {
    label: 'Continuity',
    hint: 'hover to see everything connected',
    group: 'Tools',
    keys: [{ code: 'KeyD' }, { code: 'KeyB', alt: true }],
    keywords: ['wire checker', 'probe', 'multimeter', 'test'],
    ...tool('probe'),
  },
  pan: { label: 'Pan', hint: 'or hold Space', group: 'Tools', keys: [{ code: 'KeyF' }, { code: 'KeyH', alt: true }], ...tool('pan') },
  colour: { label: 'Wire colour', hint: 'hold, flick, release', group: 'Tools', keys: [{ code: 'KeyC' }, { code: 'KeyC', alt: true }], unlisted: true },
  parts: { label: 'Show parts', group: 'View', keys: [{ code: 'KeyQ' }], keywords: ['layer', 'hide'], ...layer('bodies') },
  wires: { label: 'Show wires', group: 'View', keys: [{ code: 'KeyW' }], keywords: ['layer', 'hide'], ...layer('wires') },
  far: { label: 'Show the other side', group: 'View', keys: [{ code: 'KeyE' }], keywords: ['layer', 'hide', 'ghost'], ...layer('far') },
  names: { label: 'Show connector names', group: 'View', keys: [{ code: 'KeyN' }], keywords: ['layer', 'hide'], ...layer('names') },
  labelPin: { label: 'Label the pin under the cursor', hint: 'or double-click it', group: 'Edit', keys: [{ code: 'KeyL' }], run: () => editPinLabel(), unlisted: true },
  nudge: {
    label: 'Move the selection one hole',
    group: 'Edit',
    keys: [{ code: 'ArrowUp' }, { code: 'ArrowDown' }, { code: 'ArrowLeft' }, { code: 'ArrowRight' }],
    run: (e) => e && nudge(...NUDGE[e.code]),
    unlisted: true,
  },
  rotate: { label: 'Rotate', group: 'Edit', keys: [{ code: 'KeyR' }], run: () => rotate(90), when: () => hasSelection() || !!s().placing },
  rotateBack: {
    label: 'Rotate the other way',
    group: 'Edit',
    keys: [{ code: 'KeyR', shift: true }],
    run: () => rotate(-90),
    when: () => hasSelection() || !!s().placing,
  },
  otherSide: { label: 'Move to the other side', group: 'Edit', keys: [{ code: 'KeyT' }, { code: 'KeyF', alt: true }], keywords: ['swap', 'front', 'back'], run: flipSide, when: hasSelection },
  upsideDown: { label: 'Mount module upside down', group: 'Edit', keys: [{ code: 'KeyY' }, { code: 'KeyU', alt: true }], keywords: ['flip'], run: upsideDown, when: canUpsideDown },
  front: { label: 'Bring to front', group: 'Edit', keys: [{ code: 'BracketRight', mod: true }], run: bringToFront, when: hasPart },
  back: { label: 'Send to back', group: 'Edit', keys: [{ code: 'BracketLeft', mod: true }], run: sendToBack, when: hasPart },
  single: { label: 'Single view', group: 'View', keys: [{ code: 'Digit1' }], ...layout('single') },
  split: { label: 'Front and back side by side', group: 'View', keys: [{ code: 'Digit2' }], keywords: ['split view'], ...layout('split') },
  flip: { label: 'Flip the board', group: 'View', keys: [{ code: 'Digit3' }, { code: 'KeyF', shift: true }], keywords: ['front', 'back'], run: () => s().flip(), when: () => s().layout === 'single' },
  fit: { label: 'Fit to screen', group: 'View', keys: [{ code: 'Digit0' }], keywords: ['zoom'], run: () => s().requestFit() },
  properties: { label: 'Properties panel', group: 'View', keys: [{ code: 'Digit1', alt: true }], ...panel('properties') },
  partList: { label: 'Part list panel', group: 'View', keys: [{ code: 'Digit2', alt: true }], ...panel('parts') },
  checks: { label: 'Checks panel', group: 'View', keys: [{ code: 'Digit3', alt: true }], keywords: ['faults', 'errors'], ...panel('checks') },
  keys: { label: 'Keyboard shortcuts panel', group: 'View', keys: [{ code: 'Digit4', alt: true }], ...panel('keys') },
  undo: { label: 'Undo', group: 'Edit', keys: [{ code: 'KeyZ', mod: true }], run: () => s().undo(), when: () => s().past.length > 0 },
  redo: { label: 'Redo', group: 'Edit', keys: [{ code: 'KeyZ', mod: true, shift: true }, { code: 'KeyY', mod: true }], run: () => s().redo(), when: () => s().future.length > 0 },
  selectAll: { label: 'Select everything', group: 'Edit', keys: [{ code: 'KeyA', mod: true }], run: selectAll },
  copy: { label: 'Copy', group: 'Edit', keys: [{ code: 'KeyC', mod: true }], run: copy, when: hasSelection },
  cut: { label: 'Cut', group: 'Edit', keys: [{ code: 'KeyX', mod: true }], run: cut, when: hasSelection },
  paste: { label: 'Paste', hint: 'under the pointer', group: 'Edit', keys: [{ code: 'KeyV', mod: true }], run: paste, when: hasClipboard },
  duplicate: { label: 'Duplicate', group: 'Edit', keys: [{ code: 'KeyD', mod: true }], run: duplicate, when: hasSelection },
  delete: { label: 'Delete', group: 'Edit', keys: [{ code: 'Backspace' }, { code: 'Delete' }], keywords: ['remove'], run: deleteSelection, when: hasSelection },
  files: { label: 'Switch board', group: 'Board', keys: [{ code: 'KeyP', mod: true }], run: () => s().setMenu('files'), unlisted: true },
  newBoard: { label: 'New board', group: 'Board', keys: [{ code: 'KeyN', alt: true }], run: () => newBoard() },
  duplicateBoard: { label: 'Duplicate board', group: 'Board', keys: [], run: duplicateFile },
  deleteBoard: { label: 'Delete board', group: 'Board', keys: [], danger: true, run: () => deleteFile(s().fileId) },
  rotateBoard: { label: 'Turn board right', group: 'Board', keys: [{ code: 'KeyR', alt: true }], keywords: ['rotate', 'quarter'], run: () => rotateBoard(90) },
  rotateBoardBack: { label: 'Turn board left', group: 'Board', keys: [{ code: 'KeyR', alt: true, shift: true }], keywords: ['rotate', 'quarter'], run: () => rotateBoard(-90) },
  rotateBoardHalf: { label: 'Turn board upside down', group: 'Board', keys: [], keywords: ['rotate', '180'], run: () => rotateBoard(180) },
  menu: { label: 'Menu', group: 'View', keys: [{ code: 'KeyM', alt: true }], run: () => s().setMenu('main'), unlisted: true },
  open: { label: 'Open from disk…', group: 'File', keys: [{ code: 'KeyO', mod: true }], keywords: ['load', 'import'], run: pickFile },
  save: { label: 'Save to disk', group: 'File', keys: [{ code: 'KeyS', mod: true }], keywords: ['download', 'export'], run: exportJson },
  exportAll: { label: 'Export all boards', group: 'File', keys: [], keywords: ['backup', 'download', 'save'], run: exportAll },
  importAll: { label: 'Import all boards…', group: 'File', keys: [], keywords: ['backup', 'restore', 'load'], run: pickFile },
  review: { label: 'Copy for review', group: 'File', keys: [{ code: 'KeyC', mod: true, shift: true }], keywords: ['chat', 'describe', 'report'], run: copyForReview },
  copyJson: { label: 'Copy as JSON', group: 'File', keys: [{ code: 'KeyC', mod: true, alt: true }], run: copyJson },
} satisfies Record<string, Command>

export type CommandId = keyof typeof table

export const commands: Record<CommandId, Command> = table

export const commandIds = Object.keys(commands) as CommandId[]

export const commandText = (id: CommandId) => {
  const { label, hint } = commands[id]
  return hint ? `${label} (${hint})` : label
}

export const matches = (key: Key, e: KeyboardEvent) =>
  e.code === key.code && (e.metaKey || e.ctrlKey) === !!key.mod && e.altKey === !!key.alt && e.shiftKey === !!key.shift

const isMac = /Mac|iPhone|iPad/.test(navigator.platform)
const NAMES: Record<string, string> = {
  Backspace: '⌫',
  Delete: '⌦',
  Escape: 'Esc',
  Slash: '/',
  Space: 'Space',
  BracketLeft: '[',
  BracketRight: ']',
  ArrowUp: '↑',
  ArrowDown: '↓',
  ArrowLeft: '←',
  ArrowRight: '→',
}

export function keyLabel(key: Key) {
  const name = NAMES[key.code] ?? key.code.replace(/^Key|^Digit/, '')
  return [key.mod && (isMac ? '⌘' : 'Ctrl+'), key.alt && (isMac ? '⌥' : 'Alt+'), key.shift && '⇧', name].filter(Boolean).join('')
}

export const shortcut = (id: CommandId) => commands[id].keys.map(keyLabel)
