import {
  CheckIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  ColumnsIcon,
  CursorArrowIcon,
  GitHubLogoIcon,
  HamburgerMenuIcon,
  HandIcon,
  LightningBoltIcon,
  LoopIcon,
  MagnifyingGlassIcon,
  Pencil1Icon,
  ResetIcon,
  SquareIcon,
} from '@radix-ui/react-icons'
import { DropdownMenu, Toolbar as Bar } from 'radix-ui'
import { useShallow } from 'zustand/react/shallow'
import { changeBoard, importJson, newBoard, openFile, setNaming, setOrigin } from '../actions'
import { ago } from '../files'
import { commands, type CommandId } from '../keymap'
import { boards } from '../library'
import { NAMINGS, namingOf, originLabel, originOf, ORIGINS, type Naming, type Origin } from '../model/naming'
import { useEditor, type Layer, type Layout, type Tool } from '../store'
import { Keys, Tip } from './Tip'

export const REPO = 'https://github.com/SirPryderi/perfbored'

const TOOLS: { id: Tool; icon: React.ReactNode }[] = [
  { id: 'select', icon: <CursorArrowIcon /> },
  { id: 'wire', icon: <Pencil1Icon /> },
  { id: 'probe', icon: <LightningBoltIcon /> },
  { id: 'pan', icon: <HandIcon /> },
]

const LAYERS: { id: Layer; label: string; command: CommandId }[] = [
  { id: 'bodies', label: 'Parts', command: 'parts' },
  { id: 'wires', label: 'Wires', command: 'wires' },
  { id: 'far', label: 'Other side', command: 'far' },
  { id: 'names', label: 'Names', command: 'names' },
]

function Item({ command }: { command: CommandId }) {
  const { label, keys, danger, run, when, on } = commands[command]
  return (
    <DropdownMenu.Item className={danger ? 'menu-item danger' : 'menu-item'} disabled={when?.() === false} onSelect={() => run?.()}>
      {label}
      <span className="menu-end">
        {on?.() && <CheckIcon />}
        {keys.length > 0 && <Keys command={command} />}
      </span>
    </DropdownMenu.Item>
  )
}

function Sub({ label, command, children }: { label: string; command?: CommandId; children: React.ReactNode }) {
  return (
    <DropdownMenu.Sub>
      <DropdownMenu.SubTrigger className="menu-item">
        {label}
        <span className="menu-end">
          {command && <Keys command={command} />}
          <ChevronRightIcon />
        </span>
      </DropdownMenu.SubTrigger>
      <DropdownMenu.Portal>
        <DropdownMenu.SubContent className="menu" sideOffset={4}>{children}</DropdownMenu.SubContent>
      </DropdownMenu.Portal>
    </DropdownMenu.Sub>
  )
}

// A closed menu hands the keyboard back to the board. Left on its trigger, the
// arrows that nudge the selection would open the menu again.
const leaveFocus = (e: Event) => e.preventDefault()

const Separator = () => <DropdownMenu.Separator className="menu-sep" />

function BoardSizes({ value, onPick }: { value?: string; onPick: (id: string) => void }) {
  return (
    <DropdownMenu.RadioGroup value={value} onValueChange={onPick}>
      {boards.map((b) => (
        <DropdownMenu.RadioItem key={b.id} value={b.id} className="menu-item">
          {b.name} <span className="menu-hint">{b.cols} × {b.rows}</span>
        </DropdownMenu.RadioItem>
      ))}
    </DropdownMenu.RadioGroup>
  )
}

function BoardList() {
  const files = useEditor((s) => s.files)
  const fileId = useEditor((s) => s.fileId)
  return (
    <DropdownMenu.RadioGroup value={fileId} onValueChange={openFile}>
      {files.map((f) => (
        <DropdownMenu.RadioItem key={f.id} value={f.id} className="menu-item">
          <span className="file-name">{f.name || 'Untitled'}</span>
          <span className="menu-hint">{ago(f.updated)}</span>
        </DropdownMenu.RadioItem>
      ))}
    </DropdownMenu.RadioGroup>
  )
}

const NewBoard = () => (
  <Sub label={commands.newBoard.label} command="newBoard">
    <BoardSizes onPick={newBoard} />
  </Sub>
)

export function Toolbar() {
  const s = useEditor(
    useShallow((s) => ({
      name: s.doc.name,
      board: s.doc.board,
      naming: namingOf(s.doc),
      origin: originOf(s.doc),
      menu: s.menu,
      tool: s.tool,
      wireColor: s.wireColor,
      layers: s.layers,
      layout: s.layout,
      facing: s.facing,
      canUndo: s.past.length > 0,
      canRedo: s.future.length > 0,
    })),
  )
  const e = useEditor.getState
  const menu = (id: 'main' | 'files') => ({ open: s.menu === id, onOpenChange: (o: boolean) => e().setMenu(o ? id : null) })

  return (
    <Bar.Root className="toolbar" aria-label="Editor">
      <DropdownMenu.Root {...menu('main')}>
        <Tip command="menu">
          <DropdownMenu.Trigger asChild>
            <Bar.Button className="tool" aria-label="Menu"><HamburgerMenuIcon /></Bar.Button>
          </DropdownMenu.Trigger>
        </Tip>
        <DropdownMenu.Portal>
          <DropdownMenu.Content className="menu" align="start" sideOffset={6} onCloseAutoFocus={leaveFocus}>
            <Sub label="File">
              <NewBoard />
              <Sub label="Open board">
                <BoardList />
              </Sub>
              <Item command="duplicateBoard" />
              <Separator />
              <Item command="open" />
              <Item command="save" />
              <Separator />
              <Item command="importAll" />
              <Item command="exportAll" />
              <Separator />
              <Item command="review" />
              <Item command="copyJson" />
              <Separator />
              <Item command="deleteBoard" />
            </Sub>
            <Sub label="Edit">
              <Item command="undo" />
              <Item command="redo" />
              <Separator />
              <Item command="cut" />
              <Item command="copy" />
              <Item command="paste" />
              <Item command="duplicate" />
              <Item command="delete" />
              <Item command="selectAll" />
              <Separator />
              <Item command="rotate" />
              <Item command="rotateBack" />
              <Item command="otherSide" />
              <Item command="upsideDown" />
              <Item command="front" />
              <Item command="back" />
            </Sub>
            <Sub label="View">
              <Item command="parts" />
              <Item command="wires" />
              <Item command="far" />
              <Item command="names" />
              <Separator />
              <Item command="single" />
              <Item command="split" />
              <Item command="flip" />
              <Item command="fit" />
              <Separator />
              <Item command="properties" />
              <Item command="partList" />
              <Item command="checks" />
              <Item command="keys" />
              <Separator />
              <Item command="palette" />
            </Sub>
            <Sub label="Board">
              <Sub label="Board size">
                <BoardSizes value={s.board} onPick={changeBoard} />
              </Sub>
              <Sub label="Turn board">
                <Item command="rotateBoard" />
                <Item command="rotateBoardBack" />
                <Item command="rotateBoardHalf" />
              </Sub>
              <Sub label="Hole labels">
                <DropdownMenu.RadioGroup value={s.naming} onValueChange={(v) => setNaming(v as Naming)}>
                  {NAMINGS.map((n) => (
                    <DropdownMenu.RadioItem key={n.id} value={n.id} className="menu-item">
                      {n.label} <span className="menu-hint">{n.example}</span>
                    </DropdownMenu.RadioItem>
                  ))}
                </DropdownMenu.RadioGroup>
                <Separator />
                <DropdownMenu.Label className="menu-label">Numbers from</DropdownMenu.Label>
                <DropdownMenu.RadioGroup value={s.origin} onValueChange={(v) => setOrigin(v as Origin)}>
                  {ORIGINS.map((o) => (
                    <DropdownMenu.RadioItem key={o} value={o} className="menu-item">{originLabel(o)}</DropdownMenu.RadioItem>
                  ))}
                </DropdownMenu.RadioGroup>
              </Sub>
            </Sub>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>

      <div className="brand">
        <input
          className="doc-name"
          value={s.name}
          onFocus={() => e().checkpoint()}
          onChange={(ev) => e().preview((d) => ({ ...d, name: ev.target.value }))}
          aria-label="Board name"
        />
        <DropdownMenu.Root {...menu('files')}>
          <Tip command="files">
            <DropdownMenu.Trigger asChild>
              <Bar.Button className="tool narrow" aria-label="Switch board"><ChevronDownIcon /></Bar.Button>
            </DropdownMenu.Trigger>
          </Tip>
          <DropdownMenu.Portal>
            <DropdownMenu.Content className="menu files" align="start" sideOffset={6} onCloseAutoFocus={leaveFocus}>
              <DropdownMenu.Label className="menu-label">Boards</DropdownMenu.Label>
              <BoardList />
              <Separator />
              <NewBoard />
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>

      <Tip command="undo">
        <Bar.Button className="tool" onClick={() => e().undo()} disabled={!s.canUndo} aria-label="Undo"><ResetIcon /></Bar.Button>
      </Tip>
      <Tip command="redo">
        <Bar.Button className="tool mirror" onClick={() => e().redo()} disabled={!s.canRedo} aria-label="Redo"><ResetIcon /></Bar.Button>
      </Tip>

      <Bar.Separator className="sep" />

      <Bar.ToggleGroup type="single" value={s.tool} onValueChange={(v) => v && e().setTool(v as Tool)} className="group tools">
        {TOOLS.map((t) => (
          <Tip key={t.id} command={t.id}>
            <Bar.ToggleItem value={t.id} className="tool" aria-label={commands[t.id].label}>{t.icon}</Bar.ToggleItem>
          </Tip>
        ))}
      </Bar.ToggleGroup>
      <Tip command="colour">
        <Bar.Button className="tool" aria-label="Wire colour" onClick={(ev) => {
          const r = ev.currentTarget.getBoundingClientRect()
          window.dispatchEvent(new CustomEvent('open-colour-ring', { detail: { x: r.left + r.width / 2, y: r.bottom + 110 } }))
        }}>
          <span className="swatch small" style={{ background: s.wireColor }} />
        </Bar.Button>
      </Tip>

      <Bar.Separator className="sep" />

      <Bar.ToggleGroup
        type="multiple"
        className="group"
        value={LAYERS.filter((l) => s.layers[l.id]).map((l) => l.id)}
        onValueChange={(on) => LAYERS.forEach((l) => on.includes(l.id) !== s.layers[l.id] && e().toggleLayer(l.id))}
      >
        {LAYERS.map((l) => (
          <Tip key={l.id} command={l.command}>
            <Bar.ToggleItem value={l.id} className="chip">{l.label}</Bar.ToggleItem>
          </Tip>
        ))}
      </Bar.ToggleGroup>

      <Bar.Separator className="sep" />

      <Bar.ToggleGroup type="single" value={s.layout} onValueChange={(v) => v && e().setLayout(v as Layout)} className="group tools">
        <Tip command="single">
          <Bar.ToggleItem value="single" className="tool" aria-label="Single view"><SquareIcon /></Bar.ToggleItem>
        </Tip>
        <Tip command="split">
          <Bar.ToggleItem value="split" className="tool" aria-label="Split view"><ColumnsIcon /></Bar.ToggleItem>
        </Tip>
      </Bar.ToggleGroup>
      <Tip command="flip">
        <Bar.Button className="chip" onClick={() => e().flip()} disabled={s.layout === 'split'}>
          <LoopIcon /> {s.facing === 'front' ? 'Front' : 'Back'}
        </Bar.Button>
      </Tip>

      <div className="spacer" />

      <Tip command="palette">
        <Bar.Button className="tool" onClick={() => e().setPalette(true)} aria-label={commands.palette.label}><MagnifyingGlassIcon /></Bar.Button>
      </Tip>
      <Tip label="Source on GitHub">
        <Bar.Link className="tool" href={REPO} target="_blank" rel="noreferrer" aria-label="Source on GitHub">
          <GitHubLogoIcon />
        </Bar.Link>
      </Tip>

      <input
        id="open-file"
        type="file"
        accept=".json,application/json"
        hidden
        onChange={(ev) => {
          const file = ev.target.files?.[0]
          if (file) importJson(file)
          ev.target.value = ''
        }}
      />
    </Bar.Root>
  )
}
