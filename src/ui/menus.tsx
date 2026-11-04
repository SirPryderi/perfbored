import { CheckIcon, ChevronRightIcon } from '@radix-ui/react-icons'
import { ContextMenu, DropdownMenu } from 'radix-ui'
import { useShallow } from 'zustand/react/shallow'
import { changeBoard, setNaming, setOrigin } from '../actions'
import { commands, type CommandId } from '../keymap'
import { boards } from '../library'
import { NAMINGS, namingOf, originLabel, originOf, ORIGINS, type Naming, type Origin } from '../model/naming'
import { useEditor } from '../store'
import { Keys } from './Tip'

// A closed menu hands the keyboard back to the board. Left on its trigger, the
// arrows that nudge the selection would open the menu again.
export const leaveFocus = (e: Event) => e.preventDefault()

interface ItemProps {
  command: CommandId
  label?: string
  run?: () => unknown
}

// Radix's dropdown and context menus are the same parts under two names, so the
// hamburger and the right-click menu share one set built on either. A menu bar
// greys out what doesn't apply; a context menu leaves it out.
function menuKit(M: typeof DropdownMenu, { hideUnavailable = false } = {}) {
  function Item({ command, label, run }: ItemProps) {
    const c = commands[command]
    const available = c.when?.() !== false
    if (hideUnavailable && !available) return null
    return (
      <M.Item className={c.danger ? 'menu-item danger' : 'menu-item'} disabled={!available} onSelect={() => (run ?? c.run)?.()}>
        {label ?? c.label}
        <span className="menu-end">
          {c.on?.() && <CheckIcon />}
          {c.keys.length > 0 && <Keys command={command} />}
        </span>
      </M.Item>
    )
  }

  function Sub({ label, command, children }: { label: string; command?: CommandId; children: React.ReactNode }) {
    return (
      <M.Sub>
        <M.SubTrigger className="menu-item">
          {label}
          <span className="menu-end">
            {command && <Keys command={command} />}
            <ChevronRightIcon />
          </span>
        </M.SubTrigger>
        <M.Portal>
          <M.SubContent className="menu" sideOffset={4}>{children}</M.SubContent>
        </M.Portal>
      </M.Sub>
    )
  }

  const Separator = () => <M.Separator className="menu-sep" />

  function BoardSizes({ value, onPick }: { value?: string; onPick: (id: string) => void }) {
    return (
      <M.RadioGroup value={value} onValueChange={onPick}>
        {boards.map((b) => (
          <M.RadioItem key={b.id} value={b.id} className="menu-item">
            {b.name} <span className="menu-hint">{b.cols} × {b.rows}</span>
          </M.RadioItem>
        ))}
      </M.RadioGroup>
    )
  }

  function BoardItems() {
    const s = useEditor(useShallow((s) => ({ board: s.doc.board, naming: namingOf(s.doc), origin: originOf(s.doc) })))
    return (
      <>
        <Sub label="Board size">
          <BoardSizes value={s.board} onPick={changeBoard} />
        </Sub>
        <Sub label="Turn board">
          <Item command="rotateBoard" />
          <Item command="rotateBoardBack" />
          <Item command="rotateBoardHalf" />
        </Sub>
        <Sub label="Hole labels">
          <M.RadioGroup value={s.naming} onValueChange={(v) => setNaming(v as Naming)}>
            {NAMINGS.map((n) => (
              <M.RadioItem key={n.id} value={n.id} className="menu-item">
                {n.label} <span className="menu-hint">{n.example}</span>
              </M.RadioItem>
            ))}
          </M.RadioGroup>
          <Separator />
          <M.Label className="menu-label">Numbers from</M.Label>
          <M.RadioGroup value={s.origin} onValueChange={(v) => setOrigin(v as Origin)}>
            {ORIGINS.map((o) => (
              <M.RadioItem key={o} value={o} className="menu-item">{originLabel(o)}</M.RadioItem>
            ))}
          </M.RadioGroup>
        </Sub>
      </>
    )
  }

  return { Item, Sub, Separator, BoardSizes, BoardItems, Label: M.Label, RadioGroup: M.RadioGroup, RadioItem: M.RadioItem }
}

export const dropdown = menuKit(DropdownMenu)
export const context = menuKit(ContextMenu as unknown as typeof DropdownMenu, { hideUnavailable: true })
