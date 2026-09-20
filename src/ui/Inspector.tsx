import { CheckIcon, ChevronDownIcon, CopyIcon, PinBottomIcon, PinTopIcon, ResetIcon, TrashIcon } from '@radix-ui/react-icons'
import { DropdownMenu, Select, Tabs, ToggleGroup } from 'radix-ui'
import { useShallow } from 'zustand/react/shallow'
import { bringToFront, deleteSelection, duplicate, flipSide, rotate, sendToBack, upsideDown } from '../actions'
import { boardById, partById } from '../library'
import { updatePart, updateWire } from '../model/doc'
import { PITCH } from '../model/geometry'
import type { PartInstance, PropSpec, PropValue, Side, Wire } from '../model/types'
import { useEditor, type Panel } from '../store'
import { useAnalysis } from '../useAnalysis'
import { commands, type CommandId } from '../keymap'
import { Checks } from './Checks'
import { Swatches } from './Swatches'
import { Keys, Tip } from './Tip'

const e = useEditor.getState

function SideToggle({ value, onChange }: { value: Side; onChange: (side: Side) => void }) {
  return (
    <ToggleGroup.Root type="single" className="segmented" value={value} onValueChange={(v) => v && onChange(v as Side)}>
      <ToggleGroup.Item value="front" className="segment">Front</ToggleGroup.Item>
      <ToggleGroup.Item value="back" className="segment">Back</ToggleGroup.Item>
    </ToggleGroup.Root>
  )
}

function Field({ spec, value, onChange }: { spec: PropSpec; value: PropValue; onChange: (v: PropValue) => void }) {
  if (spec.type === 'select')
    return (
      <Select.Root value={String(value)} onValueChange={(v) => { e().checkpoint(); onChange(v) }}>
        <Select.Trigger className="input select-trigger" aria-label={spec.label}>
          <Select.Value />
          <Select.Icon><ChevronDownIcon /></Select.Icon>
        </Select.Trigger>
        <Select.Portal>
          <Select.Content className="menu" position="popper" sideOffset={4}>
            <Select.Viewport>
              {spec.options.map((o) => (
                <Select.Item key={o} value={o} className="menu-item">
                  <Select.ItemText>{o}</Select.ItemText>
                  <Select.ItemIndicator className="menu-hint"><CheckIcon /></Select.ItemIndicator>
                </Select.Item>
              ))}
            </Select.Viewport>
          </Select.Content>
        </Select.Portal>
      </Select.Root>
    )
  if (spec.type === 'color') return <Swatches value={String(value)} onChange={(c) => { e().checkpoint(); onChange(c) }} />
  if (spec.type === 'text' && spec.suggestions)
    return (
      <div className="combo">
        <input
          className="input"
          value={value}
          onFocus={() => e().checkpoint()}
          onChange={(ev) => onChange(ev.target.value)}
          aria-label={spec.label}
        />
        <DropdownMenu.Root>
          <DropdownMenu.Trigger className="combo-button" aria-label="Common values"><ChevronDownIcon /></DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content className="menu" align="end" sideOffset={4}>
              <DropdownMenu.Label className="menu-label">Common values</DropdownMenu.Label>
              {spec.suggestions.map((s) => (
                <DropdownMenu.Item key={s.value} className="menu-item" onSelect={() => { e().checkpoint(); onChange(s.value) }}>
                  <span className="suggestion">{s.value}</span>
                  <span className="menu-hint">{s.hint}</span>
                </DropdownMenu.Item>
              ))}
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>
    )
  return (
    <input
      className="input"
      type={spec.type}
      value={value}
      min={spec.type === 'number' ? spec.min : undefined}
      max={spec.type === 'number' ? spec.max : undefined}
      onFocus={() => e().checkpoint()}
      onChange={(ev) => {
        if (spec.type !== 'number') return onChange(ev.target.value)
        const n = Number(ev.target.value)
        if (Number.isFinite(n)) onChange(Math.min(spec.max, Math.max(spec.min, n)))
      }}
    />
  )
}

function PartPanel({ part }: { part: PartInstance }) {
  const def = partById(part.def)
  if (!def) return null
  const props = { ...def.defaults, ...part.props }
  return (
    <>
      <h2>{def.name}</h2>
      {!def.annotation && (
        <div className="row">
          <label>Side</label>
          <SideToggle value={part.side} onChange={(side) => side !== part.side && flipSide()} />
        </div>
      )}
      {def.flippable && (
        <div className="row">
          <label>Mounted</label>
          <ToggleGroup.Root
            type="single"
            className="segmented"
            value={part.flipped ? 'down' : 'up'}
            onValueChange={(v) => v && (v === 'down') !== !!part.flipped && upsideDown()}
          >
            <ToggleGroup.Item value="up" className="segment">Normal</ToggleGroup.Item>
            <ToggleGroup.Item value="down" className="segment">Upside down</ToggleGroup.Item>
          </ToggleGroup.Root>
        </div>
      )}
      <div className="row">
        <label>Rotation</label>
        <div className="inline">
          <button className="icon-button" onClick={() => rotate(-90)} aria-label="Rotate left"><ResetIcon /></button>
          <button className="icon-button mirror" onClick={() => rotate(90)} aria-label="Rotate right"><ResetIcon /></button>
          <span className="meta">{part.rot}°</span>
        </div>
      </div>
      <div className="row">
        <label>Hole</label>
        <span className="meta">col {part.col + 1} · row {part.row + 1}</span>
      </div>
      {def.props?.map((spec) => (
        <div className={spec.type === 'color' ? 'row column' : 'row'} key={spec.key}>
          <label>{spec.label}</label>
          <Field
            spec={spec}
            value={props[spec.key]}
            onChange={(v) => e().preview((d) => updatePart(d, part.id, { props: { ...part.props, [spec.key]: v } }))}
          />
        </div>
      ))}
      <div className="row">
        <label>Order</label>
        <div className="inline">
          <Tip command="front">
            <button className="icon-button" onClick={bringToFront} aria-label="Bring to front"><PinTopIcon /></button>
          </Tip>
          <Tip command="back">
            <button className="icon-button" onClick={sendToBack} aria-label="Send to back"><PinBottomIcon /></button>
          </Tip>
        </div>
      </div>
      <div className="actions">
        <button className="button" onClick={duplicate}><CopyIcon /> Duplicate</button>
        <button className="button danger" onClick={deleteSelection}><TrashIcon /> Delete</button>
      </div>
    </>
  )
}

function WirePanel({ wire }: { wire: Wire }) {
  const set = (patch: Partial<Wire>) => e().change((d) => updateWire(d, wire.id, patch))
  const holes = wire.points.slice(1).reduce(
    (n, p, i) => n + Math.hypot(p[0] - wire.points[i][0], p[1] - wire.points[i][1]),
    0,
  )
  return (
    <>
      <h2>Wire</h2>
      <div className="row">
        <label>Side</label>
        <SideToggle value={wire.side} onChange={(side) => set({ side })} />
      </div>
      <div className="row column">
        <label>Colour</label>
        <Swatches value={wire.color} onChange={(color) => set({ color })} />
      </div>
      <div className="row">
        <label>Length</label>
        <span className="meta">{(holes * PITCH).toFixed(1)} mm</span>
      </div>
      <div className="actions">
        <button className="button danger" onClick={deleteSelection}><TrashIcon /> Delete</button>
      </div>
    </>
  )
}

function BoardPanel() {
  const { doc } = useEditor(useShallow((s) => ({ doc: s.doc })))
  const board = boardById(doc.board)
  return (
    <>
      <h2>{board.name} board</h2>
      <div className="row"><label>Holes</label><span className="meta">{board.cols} × {board.rows}</span></div>
      <div className="row"><label>Parts</label><span className="meta">{doc.parts.length}</span></div>
      <div className="row"><label>Wires</label><span className="meta">{doc.wires.length}</span></div>
    </>
  )
}

function Shortcuts() {
  return (
    <dl className="shortcuts">
      {(Object.keys(commands) as CommandId[]).map((id) => (
        <div key={id}>
          <dt>{commands[id].label}</dt>
          <dd><Keys command={id} /></dd>
        </div>
      ))}
    </dl>
  )
}

export function Inspector() {
  const { selection, doc, panel } = useEditor(useShallow((s) => ({ selection: s.selection, doc: s.doc, panel: s.panel })))
  const faults = useAnalysis().checks.filter((c) => c.level === 'fault').length
  const part = selection?.kind === 'part' ? doc.parts.find((p) => p.id === selection.id) : undefined
  const wire = selection?.kind === 'wire' ? doc.wires.find((w) => w.id === selection.id) : undefined
  return (
    <Tabs.Root className="inspector" value={panel} onValueChange={(v) => e().setPanel(v as Panel)}>
      <Tabs.List className="tabs" aria-label="Panels">
        <Tabs.Trigger value="properties" className="tab">Properties</Tabs.Trigger>
        <Tabs.Trigger value="checks" className="tab">
          Checks {faults > 0 && <span className="badge">{faults}</span>}
        </Tabs.Trigger>
        <Tabs.Trigger value="keys" className="tab">Keys</Tabs.Trigger>
      </Tabs.List>
      <Tabs.Content value="properties" className="tab-body">
        {part ? <PartPanel part={part} /> : wire ? <WirePanel wire={wire} /> : <BoardPanel />}
      </Tabs.Content>
      <Tabs.Content value="checks" className="tab-body">
        <Checks />
      </Tabs.Content>
      <Tabs.Content value="keys" className="tab-body">
        <Shortcuts />
      </Tabs.Content>
    </Tabs.Root>
  )
}
