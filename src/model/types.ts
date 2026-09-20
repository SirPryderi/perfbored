import type { ReactNode } from 'react'
import type { Naming, Origin } from './naming'

export type Side = 'front' | 'back'
export type Rotation = 0 | 90 | 180 | 270
export type Hole = [col: number, row: number]
export type PropValue = string | number
export type Props = Record<string, PropValue>

export interface PartInstance {
  id: string
  def: string
  col: number
  row: number
  rot: Rotation
  side: Side
  flipped?: boolean
  props: Props
}

export interface Wire {
  id: string
  color: string
  side: Side
  points: Hole[]
}

export interface Doc {
  version: 1
  name: string
  board: string
  portrait?: boolean
  naming?: Naming
  origin?: Origin
  parts: PartInstance[]
  wires: Wire[]
}

export interface BoardDef {
  id: string
  name: string
  width: number
  height: number
  cols: number
  rows: number
}

export interface Bounds {
  x: number
  y: number
  w: number
  h: number
}

export interface Suggestion {
  value: string
  hint: string
}

export type PropSpec =
  | { key: string; label: string; type: 'select'; options: string[] }
  | { key: string; label: string; type: 'text'; suggestions?: Suggestion[] }
  | { key: string; label: string; type: 'number'; min: number; max: number }
  | { key: string; label: string; type: 'color' }

export interface PartView {
  flipped: boolean
  rot: Rotation
}

export interface PinLabel {
  get: (props: Props, index: number) => string
  set: (props: Props, index: number, label: string) => Props
}

export interface PartDef {
  id: string
  name: string
  category: string
  ref?: string
  defaults?: Props
  props?: PropSpec[]
  annotation?: boolean
  flippable?: boolean
  stacks?: boolean
  overlay?: boolean
  pads?: boolean
  pins: (props: Props) => Hole[]
  pinNames?: (props: Props) => string[]
  bounds: (props: Props) => Bounds
  pinLabel?: PinLabel
  render: (props: Props, view: PartView) => ReactNode
}
