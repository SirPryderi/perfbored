import type { BoardDef, Doc } from '../model/types'

export const boards: BoardDef[] = [
  { id: 'perf-2x8', name: '2 × 8 cm', width: 80, height: 20, cols: 28, rows: 8 },
  { id: 'perf-3x7', name: '3 × 7 cm', width: 70, height: 30, cols: 24, rows: 10 },
  { id: 'perf-4x6', name: '4 × 6 cm', width: 60, height: 40, cols: 20, rows: 14 },
  { id: 'perf-5x7', name: '5 × 7 cm', width: 70, height: 50, cols: 24, rows: 18 },
  { id: 'perf-6x8', name: '6 × 8 cm', width: 80, height: 60, cols: 28, rows: 20 },
  { id: 'perf-7x9', name: '7 × 9 cm', width: 90, height: 70, cols: 30, rows: 24 },
]

export const boardById = (id: string) => boards.find((b) => b.id === id) ?? boards[3]

// Board sizes are listed landscape; a doc turned on its side uses the same
// board with its axes swapped. Variants are built once so the identity stays
// stable for effect dependencies.
const turn = (b: BoardDef): BoardDef => ({
  ...b,
  name: b.name.replace(/^(\d+) × (\d+)/, '$2 × $1'),
  width: b.height,
  height: b.width,
  cols: b.rows,
  rows: b.cols,
})
const portrait = new Map(boards.map((b) => [b.id, turn(b)]))

export const docBoard = (doc: Doc) =>
  doc.portrait ? portrait.get(doc.board) ?? turn(boardById(doc.board)) : boardById(doc.board)
