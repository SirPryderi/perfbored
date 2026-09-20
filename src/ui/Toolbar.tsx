import {
  ChevronDownIcon,
  ColumnsIcon,
  CursorArrowIcon,
  HamburgerMenuIcon,
  HandIcon,
  LoopIcon,
  Pencil1Icon,
  ResetIcon,
  SquareIcon,
} from '@radix-ui/react-icons'
import { DropdownMenu, Toolbar as Bar } from 'radix-ui'
import { useShallow } from 'zustand/react/shallow'
import { changeBoard, copyForReview, deleteFile, duplicateFile, exportJson, importJson, newBoard, openFile } from '../actions'
import { commands, type CommandId } from '../keymap'
import { boards } from '../library'
import { useEditor, type Layer, type Layout, type Tool } from '../store'
import { Keys, Tip } from './Tip'

const TOOLS: { id: Tool; icon: React.ReactNode }[] = [
  { id: 'select', icon: <CursorArrowIcon /> },
  { id: 'wire', icon: <Pencil1Icon /> },
  { id: 'pan', icon: <HandIcon /> },
]

const LAYERS: { id: Layer; label: string; command: CommandId }[] = [
  { id: 'bodies', label: 'Parts', command: 'parts' },
  { id: 'wires', label: 'Wires', command: 'wires' },
  { id: 'far', label: 'Other side', command: 'far' },
]

function ago(time: number) {
  const minutes = Math.round((Date.now() - time) / 60000)
  if (minutes < 1) return 'now'
  if (minutes < 60) return `${minutes}m`
  if (minutes < 60 * 24) return `${Math.round(minutes / 60)}h`
  return `${Math.round(minutes / 60 / 24)}d`
}

function Item({ command, onSelect, children }: { command?: CommandId; onSelect: () => void; children: React.ReactNode }) {
  return (
    <DropdownMenu.Item className="menu-item" onSelect={onSelect}>
      {children}
      {command && <Keys command={command} />}
    </DropdownMenu.Item>
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
            <Item command="open" onSelect={() => document.getElementById('open-file')?.click()}>Open from disk…</Item>
            <Item command="save" onSelect={exportJson}>Save to disk</Item>
            <Item command="review" onSelect={copyForReview}>Copy for review</Item>
            <DropdownMenu.Separator className="menu-sep" />
            <DropdownMenu.Sub>
              <DropdownMenu.SubTrigger className="menu-item">Board size</DropdownMenu.SubTrigger>
              <DropdownMenu.Portal>
                <DropdownMenu.SubContent className="menu" sideOffset={4}>
                  <BoardSizes value={s.board} onPick={changeBoard} />
                </DropdownMenu.SubContent>
              </DropdownMenu.Portal>
            </DropdownMenu.Sub>
            <Item command="fit" onSelect={() => e().requestFit()}>Fit to screen</Item>
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
                <DropdownMenu.SubTrigger className="menu-item">
                  New board <Keys command="newBoard" />
                </DropdownMenu.SubTrigger>
                <DropdownMenu.Portal>
                  <DropdownMenu.SubContent className="menu" sideOffset={4}>
                    <BoardSizes onPick={newBoard} />
                  </DropdownMenu.SubContent>
                </DropdownMenu.Portal>
              </DropdownMenu.Sub>
              <Item onSelect={duplicateFile}>Duplicate board</Item>
              <DropdownMenu.Item className="menu-item danger" onSelect={() => deleteFile(s.fileId)}>
                Delete board
              </DropdownMenu.Item>
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
