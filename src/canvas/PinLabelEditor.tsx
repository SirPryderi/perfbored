import { Popover } from 'radix-ui'
import { useState } from 'react'
import { setPinLabel } from '../actions'
import { partById } from '../library'
import { useEditor, type PinEdit } from '../store'

// A small popup next to a pin for typing its label; closes and saves on Enter
// or clicking away, Esc discards.
export function PinLabelEditor({ edit, x, y }: { edit: PinEdit; x: number; y: number }) {
  const part = useEditor((s) => s.doc.parts.find((p) => p.id === edit.partId))
  const def = part && partById(part.def)
  const current = def?.pinLabel?.get({ ...def.defaults, ...part!.props }, edit.index) ?? ''
  const [value, setValue] = useState(current)
  if (!part || !def?.pinLabel) return null
  const close = (save: boolean) => {
    if (save && value !== current) setPinLabel(edit.partId, edit.index, value)
    useEditor.getState().setPinEdit(null)
  }
  return (
    <Popover.Root open onOpenChange={(open) => !open && close(true)}>
      <Popover.Anchor asChild>
        <div className="pin-anchor" style={{ left: x, top: y }} />
      </Popover.Anchor>
      <Popover.Portal>
        <Popover.Content className="popover pin-label" side="top" sideOffset={10} onEscapeKeyDown={() => close(false)}>
          <div className="popover-title">
            {def.name} · pin {edit.index + 1}
          </div>
          <input
            className="input"
            autoFocus
            placeholder="Pin label"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onFocus={(e) => e.target.select()}
            onKeyDown={(e) => e.key === 'Enter' && close(true)}
          />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
