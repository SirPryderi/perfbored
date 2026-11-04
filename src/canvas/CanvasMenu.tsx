import { useShallow } from 'zustand/react/shallow'
import { applyColour, canColour, currentColour, editPinLabel, labellablePinAt, paste } from '../actions'
import { docBoard, partById, pinsAt } from '../library'
import { propsOf } from '../model/geometry'
import { coords } from '../model/naming'
import { WIRE_COLORS } from '../model/routing'
import type { Doc, Hole, Side } from '../model/types'
import { useEditor, type Item as Selected } from '../store'
import { context } from '../ui/menus'

const { Item, Sub, Separator, BoardItems, Label, RadioGroup, RadioItem } = context

function selectionTitle(doc: Doc, selection: Selected[]) {
  if (selection.length > 1) return `${selection.length} items selected`
  const part = doc.parts.find((p) => p.id === selection[0].id)
  const def = part && partById(part.def)
  if (part && def) {
    const name = String(propsOf(part, def).name ?? '').trim()
    return `${name ? `${def.name} · ${name}` : def.name} · ${part.side}`
  }
  const wire = doc.wires.find((w) => w.id === selection[0].id)
  const colour = WIRE_COLORS.find((c) => c.value === wire?.color)?.name
  return `${colour ? `${colour} wire` : 'Wire'} · ${wire?.side}`
}

function Colours() {
  const value = currentColour()
  return (
    <Sub label="Colour">
      <RadioGroup value={value} onValueChange={applyColour}>
        {WIRE_COLORS.map((c) => (
          <RadioItem key={c.value} value={c.value} className="menu-item">
            {c.name}
            <span className="swatch small" style={{ background: c.value }} />
          </RadioItem>
        ))}
      </RadioGroup>
    </Sub>
  )
}

// What a right-click offers: the pins in the hole under it, then whatever the
// click selected, or the board when it selected nothing.
export function CanvasMenu({ hole, facing }: { hole: Hole; facing: Side }) {
  const { doc, selection } = useEditor(useShallow((s) => ({ doc: s.doc, selection: s.selection })))
  const board = docBoard(doc)
  const pins = pinsAt(doc.parts, hole)
  const name = coords(doc, board).hole(hole)
  const onBoard = hole[0] >= 0 && hole[0] < board.cols && hole[1] >= 0 && hole[1] < board.rows
  const hasPart = selection.some((i) => i.kind === 'part')
  return (
    <>
      {pins.length > 0 && (
        <>
          {pins.map((p, i) => (
            <Label key={i} className="menu-label">{name} · {p.name}{p.detail ? ` · ${p.detail}` : ''}</Label>
          ))}
          {labellablePinAt(hole) && <Item command="labelPin" label="Label this pin" run={() => editPinLabel(hole, facing)} />}
          <Separator />
        </>
      )}
      {selection.length > 0 ? (
        <>
          <Label className="menu-label">{selectionTitle(doc, selection)}</Label>
          <Item command="rotate" />
          <Item command="rotateBack" />
          <Item command="otherSide" />
          <Item command="upsideDown" />
          {canColour() && <Colours />}
          {hasPart && (
            <>
              <Separator />
              <Item command="front" />
              <Item command="back" />
            </>
          )}
          <Separator />
          <Item command="cut" />
          <Item command="copy" />
          <Item command="paste" label="Paste here" run={() => paste(hole)} />
          <Item command="duplicate" />
          <Separator />
          <Item command="delete" />
        </>
      ) : (
        <>
          <Label className="menu-label">{board.name} board{onBoard ? ` · ${name}` : ''}</Label>
          <Item command="paste" label="Paste here" run={() => paste(hole)} />
          <Item command="selectAll" />
          <Separator />
          <Item command="fit" />
          <Item command="flip" />
          <Separator />
          <BoardItems />
        </>
      )}
    </>
  )
}
