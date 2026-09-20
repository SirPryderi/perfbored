import {
  bringToFront,
  copyForReview,
  deleteSelection,
  duplicate,
  editPinLabel,
  exportJson,
  flipSide,
  newBoard,
  rotate,
  rotateBoard,
  sendToBack,
  upsideDown,
} from './actions'
import { useEditor, type Layer } from './store'

// Keys match on physical position (KeyboardEvent.code), so the home-row and
// number-row bindings stay put on any layout.
export interface Key {
  code: string
  mod?: boolean
  alt?: boolean
  shift?: boolean
  anyShift?: boolean
}

export interface Command {
  label: string
  keys: Key[]
  run?: (e: KeyboardEvent) => void
}

const s = () => useEditor.getState()
const layer = (l: Layer) => () => s().toggleLayer(l)

export const commands = {
  select: { label: 'Select', keys: [{ code: 'KeyA' }, { code: 'KeyV', alt: true }], run: () => s().setTool('select') },
  wire: { label: 'Wire', keys: [{ code: 'KeyS' }, { code: 'KeyW', alt: true }], run: () => s().setTool('wire') },
  pan: { label: 'Pan (or hold Space)', keys: [{ code: 'KeyD' }, { code: 'KeyH', alt: true }], run: () => s().setTool('pan') },
  colour: { label: 'Wire colour (hold, flick, release)', keys: [{ code: 'KeyF' }, { code: 'KeyC' }, { code: 'KeyC', alt: true }] },
  parts: { label: 'Show parts', keys: [{ code: 'KeyQ' }], run: layer('bodies') },
  wires: { label: 'Show wires', keys: [{ code: 'KeyW' }], run: layer('wires') },
  far: { label: 'Show the other side', keys: [{ code: 'KeyE' }], run: layer('far') },
  labelPin: { label: 'Label the pin under the cursor (or double-click it)', keys: [{ code: 'KeyL' }], run: () => editPinLabel() },
  rotate: { label: 'Rotate (⇧ for the other way)', keys: [{ code: 'KeyR', anyShift: true }], run: (e) => rotate(e.shiftKey ? -90 : 90) },
  rotateBoard: {
    label: 'Turn the whole board (⇧ for the other way)',
    keys: [{ code: 'KeyR', alt: true, anyShift: true }],
    run: (e) => rotateBoard(e.shiftKey ? -90 : 90),
  },
  otherSide: { label: 'Move part to the other side', keys: [{ code: 'KeyT' }, { code: 'KeyF', alt: true }], run: flipSide },
  upsideDown: { label: 'Mount module upside down', keys: [{ code: 'KeyY' }, { code: 'KeyU', alt: true }], run: upsideDown },
  front: { label: 'Bring to front', keys: [{ code: 'BracketRight', mod: true }], run: bringToFront },
  back: { label: 'Send to back', keys: [{ code: 'BracketLeft', mod: true }], run: sendToBack },
  single: { label: 'Single view', keys: [{ code: 'Digit1' }], run: () => s().setLayout('single') },
  split: { label: 'Front and back side by side', keys: [{ code: 'Digit2' }], run: () => s().setLayout('split') },
  flip: { label: 'Flip the board', keys: [{ code: 'Digit3' }, { code: 'KeyF', shift: true }], run: () => s().flip() },
  fit: { label: 'Fit to screen', keys: [{ code: 'Digit0' }], run: () => s().requestFit() },
  properties: { label: 'Properties panel', keys: [{ code: 'Digit1', alt: true }], run: () => s().setPanel('properties') },
  checks: { label: 'Checks panel', keys: [{ code: 'Digit2', alt: true }], run: () => s().setPanel('checks') },
  keys: { label: 'Keyboard shortcuts panel', keys: [{ code: 'Digit3', alt: true }], run: () => s().setPanel('keys') },
  undo: { label: 'Undo', keys: [{ code: 'KeyZ', mod: true }], run: () => s().undo() },
  redo: { label: 'Redo', keys: [{ code: 'KeyZ', mod: true, shift: true }, { code: 'KeyY', mod: true }], run: () => s().redo() },
  duplicate: { label: 'Duplicate', keys: [{ code: 'KeyD', mod: true }], run: duplicate },
  delete: { label: 'Delete', keys: [{ code: 'Backspace' }, { code: 'Delete' }], run: deleteSelection },
  files: { label: 'Switch board', keys: [{ code: 'KeyP', mod: true }], run: () => s().setMenu('files') },
  newBoard: { label: 'New board', keys: [{ code: 'KeyN', alt: true }], run: () => newBoard() },
  menu: { label: 'Menu', keys: [{ code: 'KeyM', alt: true }], run: () => s().setMenu('main') },
  open: { label: 'Open from disk', keys: [{ code: 'KeyO', mod: true }], run: () => document.getElementById('open-file')?.click() },
  save: { label: 'Save to disk', keys: [{ code: 'KeyS', mod: true }], run: exportJson },
  review: { label: 'Copy for review', keys: [{ code: 'KeyC', mod: true, shift: true }], run: copyForReview },
} satisfies Record<string, Command>

export type CommandId = keyof typeof commands

export const matches = (key: Key, e: KeyboardEvent) =>
  e.code === key.code &&
  (e.metaKey || e.ctrlKey) === !!key.mod &&
  e.altKey === !!key.alt &&
  (!!key.anyShift || e.shiftKey === !!key.shift)

const isMac = /Mac|iPhone|iPad/.test(navigator.platform)
const NAMES: Record<string, string> = {
  Backspace: '⌫',
  Delete: '⌦',
  Escape: 'Esc',
  Slash: '/',
  Space: 'Space',
  BracketLeft: '[',
  BracketRight: ']',
}

export function keyLabel(key: Key) {
  const name = NAMES[key.code] ?? key.code.replace(/^Key|^Digit/, '')
  return [key.mod && (isMac ? '⌘' : 'Ctrl+'), key.alt && (isMac ? '⌥' : 'Alt+'), key.shift && '⇧', name].filter(Boolean).join('')
}

export const shortcut = (id: CommandId) => (commands[id] as Command).keys.map(keyLabel)
