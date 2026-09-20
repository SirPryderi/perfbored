import type { BoardDef, Doc, Hole } from './types'

// Perfboards are usually printed with letters down one edge and numbers along
// the other, but the corner they count from varies board to board; a board with
// no printing at all is easier to talk about as C<col>R<row>. Holes stay
// [col, row] from the top-left everywhere in the model — this is display only.
export type Naming = 'letters' | 'grid'
export type Origin = 'bottom-left' | 'top-left' | 'bottom-right' | 'top-right'

export const ORIGINS: Origin[] = ['bottom-left', 'top-left', 'bottom-right', 'top-right']

const letters = (i: number): string => (i < 26 ? '' : letters(Math.floor(i / 26) - 1)) + String.fromCharCode(65 + (i % 26))

export const namingOf = (doc: Doc): Naming => doc.naming ?? 'letters'
export const originOf = (doc: Doc): Origin => doc.origin ?? 'bottom-left'

export function coords(doc: Doc, board: BoardDef) {
  const naming = namingOf(doc)
  const origin = originOf(doc)
  const colIndex = (c: number) => (origin.endsWith('right') ? board.cols - 1 - c : c)
  const rowIndex = (r: number) => (origin.startsWith('bottom') ? board.rows - 1 - r : r)
  const col = (c: number) => (naming === 'letters' ? letters(colIndex(c)) : `C${colIndex(c) + 1}`)
  const row = (r: number) => (naming === 'letters' ? `${rowIndex(r) + 1}` : `R${rowIndex(r) + 1}`)
  // A hole off the board has no printed name, so it falls back to the C/R form
  // where a zero or negative index still reads sensibly.
  const inside = ([c, r]: Hole) =>
    colIndex(c) >= 0 && colIndex(c) < board.cols && rowIndex(r) >= 0 && rowIndex(r) < board.rows
  const hole = (h: Hole) => (inside(h) ? col(h[0]) + row(h[1]) : `C${colIndex(h[0]) + 1}R${rowIndex(h[1]) + 1}`)
  return { naming, origin, colIndex, rowIndex, col, row, hole }
}

export type Coords = ReturnType<typeof coords>

export const originLabel = (o: Origin) => `${o.startsWith('bottom') ? 'Bottom' : 'Top'} ${o.endsWith('right') ? 'right' : 'left'}`
