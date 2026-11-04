import { useEffect } from 'react'
import { finishDraft, undoDraftPoint } from './actions'
import { commands, matches } from './keymap'
import { useEditor } from './store'

// Text fields, and open menus and dropdowns, use the keys themselves.
export const ownsKeys = (t: EventTarget | null) =>
  t instanceof HTMLElement &&
  (t.isContentEditable ||
    ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName) ||
    !!t.closest('[role="menu"], [role="listbox"], [role="combobox"]'))

export function useShortcuts() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat) return
      const s = useEditor.getState()
      if (commands.palette.keys.some((k) => matches(k, e))) {
        e.preventDefault()
        return s.setPalette(!s.palette)
      }
      if (s.palette || ownsKeys(e.target)) return
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
        s.select([])
        return
      }
      const command = Object.values(commands).find((c) => c.run && c.keys.some((k) => matches(k, e)))
      if (command && command.run!(e) !== false) e.preventDefault()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
}
