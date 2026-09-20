import type { ReactNode } from 'react'
import { Tooltip } from 'radix-ui'
import { commands, shortcut, type CommandId } from '../keymap'

export function Keys({ command }: { command: CommandId }) {
  return (
    <span className="keys">
      {shortcut(command).map((k) => (
        <kbd key={k}>{k}</kbd>
      ))}
    </span>
  )
}

export function Tip({ command, label, children }: { command?: CommandId; label?: string; children: ReactNode }) {
  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>{children}</Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content className="tooltip" sideOffset={6}>
          {label ?? (command && commands[command].label)}
          {command && <Keys command={command} />}
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  )
}
