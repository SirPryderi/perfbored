import { useEffect } from 'react'
import { finishDraft, undoDraftPoint } from './actions'
import { commands, matches, type Command } from './keymap'
import { useEditor } from './store'

export const typing = (t: EventTarget | null) =>
  t instanceof HTMLElement && (t.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName))

export function useShortcuts() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (typing(e.target) || e.repeat) return
      const s = useEditor.getState()
      if (s.draft) {
        const draftKeys: Record<string, () => void> = {
          Enter: finishDraft,
          Escape: () => s.setDraft(null),
          Backspace: undoDraftPoint,
          Slash: () => s.setDraft({ ...s.draft!, flip: !s.draft!.flip }),
        }
        if (draftKeys[e.code]) {
          e.preventDefault()
          return draftKeys[e.code]()
        }
      }
      if (e.code === 'Escape') {
        s.setPlacing(null)
        s.select(null)
        return
      }
      const command = Object.values(commands as Record<string, Command>).find(
        (c) => c.run && c.keys.some((k) => matches(k, e)),
      )
      if (!command) return
      e.preventDefault()
      command.run!(e)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
}
