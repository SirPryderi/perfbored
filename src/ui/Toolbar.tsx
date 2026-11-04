import {
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
  const { label, keys, danger, run } = commands[command]
  return (
    <DropdownMenu.Item className={danger ? 'menu-item danger' : 'menu-item'} onSelect={() => run?.()}>
      {label}
      {keys.length > 0 && <Keys command={command} />}
    </DropdownMenu.Item>
  )
}

function SubTrigger({ command, children }: { command?: CommandId; children: React.ReactNode }) {
  return (
    <DropdownMenu.SubTrigger className="menu-item">
      {children}
      <span className="menu-end">
        {command && <Keys command={command} />}
        <ChevronRightIcon />
      </span>
    </DropdownMenu.SubTrigger>
  )
}

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

export function Toolbar() {
  const s = useEditor(
    useShallow((s) => ({
      name: s.doc.name,
      board: s.doc.board,
      naming: namingOf(s.doc),
      origin: originOf(s.doc),
      fileId: s.fileId,
      files: s.files,
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
          <DropdownMenu.Content className="menu" align="start" sideOffset={6}>
            <Item command="open" />
            <Item command="save" />
            <Item command="review" />
            <Item command="copyJson" />
            <DropdownMenu.Separator className="menu-sep" />
            <DropdownMenu.Sub>
              <SubTrigger>Board size</SubTrigger>
              <DropdownMenu.Portal>
                <DropdownMenu.SubContent className="menu" sideOffset={4}>
                  <BoardSizes value={s.board} onPick={changeBoard} />
                </DropdownMenu.SubContent>
              </DropdownMenu.Portal>
            </DropdownMenu.Sub>
            <DropdownMenu.Sub>
              <SubTrigger>Turn board</SubTrigger>
              <DropdownMenu.Portal>
                <DropdownMenu.SubContent className="menu" sideOffset={4}>
                  <Item command="rotateBoard" />
                  <Item command="rotateBoardBack" />
                  <Item command="rotateBoardHalf" />
                </DropdownMenu.SubContent>
              </DropdownMenu.Portal>
            </DropdownMenu.Sub>
            <DropdownMenu.Sub>
              <SubTrigger>Hole labels</SubTrigger>
              <DropdownMenu.Portal>
                <DropdownMenu.SubContent className="menu" sideOffset={4}>
                  <DropdownMenu.RadioGroup value={s.naming} onValueChange={(v) => setNaming(v as Naming)}>
                    {NAMINGS.map((n) => (
                      <DropdownMenu.RadioItem key={n.id} value={n.id} className="menu-item">
                        {n.label} <span className="menu-hint">{n.example}</span>
                      </DropdownMenu.RadioItem>
                    ))}
                  </DropdownMenu.RadioGroup>
                  <DropdownMenu.Separator className="menu-sep" />
                  <DropdownMenu.Label className="menu-label">Numbers from</DropdownMenu.Label>
                  <DropdownMenu.RadioGroup value={s.origin} onValueChange={(v) => setOrigin(v as Origin)}>
                    {ORIGINS.map((o) => (
                      <DropdownMenu.RadioItem key={o} value={o} className="menu-item">{originLabel(o)}</DropdownMenu.RadioItem>
                    ))}
                  </DropdownMenu.RadioGroup>
                </DropdownMenu.SubContent>
              </DropdownMenu.Portal>
            </DropdownMenu.Sub>
            <Item command="fit" />
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
            <DropdownMenu.Content className="menu files" align="start" sideOffset={6}>
              <DropdownMenu.Label className="menu-label">Boards</DropdownMenu.Label>
              <DropdownMenu.RadioGroup value={s.fileId} onValueChange={openFile}>
                {s.files.map((f) => (
                  <DropdownMenu.RadioItem key={f.id} value={f.id} className="menu-item">
                    <span className="file-name">{f.name || 'Untitled'}</span>
                    <span className="menu-hint">{ago(f.updated)}</span>
                  </DropdownMenu.RadioItem>
                ))}
              </DropdownMenu.RadioGroup>
              <DropdownMenu.Separator className="menu-sep" />
              <DropdownMenu.Sub>
                <SubTrigger command="newBoard">New board</SubTrigger>
                <DropdownMenu.Portal>
                  <DropdownMenu.SubContent className="menu" sideOffset={4}>
                    <BoardSizes onPick={newBoard} />
                  </DropdownMenu.SubContent>
                </DropdownMenu.Portal>
              </DropdownMenu.Sub>
              <Item command="duplicateBoard" />
              <Item command="deleteBoard" />
              <DropdownMenu.Separator className="menu-sep" />
              <Item command="exportAll" />
              <Item command="importAll" />
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
