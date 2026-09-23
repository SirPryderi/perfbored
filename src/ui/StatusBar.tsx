import { useShallow } from 'zustand/react/shallow'
import { docBoard, pinsAt } from '../library'
import { coords } from '../model/naming'
import { useEditor } from '../store'
import { useAnalysis } from '../useAnalysis'

function hint(s: { placing: boolean; tool: string; drafting: boolean }) {
  if (s.placing) return 'Click to place · R rotates · Shift-click to place several · Esc stops'
  if (s.tool === 'wire' && s.drafting)
    return 'Click to bend · click the last hole again or Enter to finish · / flips the corner · Shift for a straight run · Esc cancels'
  if (s.tool === 'wire') return 'Click a hole to start a wire on this side'
  if (s.tool === 'probe') return 'Hover a pin or wire to light up everything connected to it · wires join only at their ends · drag to pan'
  if (s.tool === 'pan') return 'Drag to pan · ⌘ + scroll to zoom · 0 fits the board'
  return 'Drag to move · Shift-click or Shift-drag to select more · ⌘C ⌘V copy and paste · R rotates · T moves to the other side · hold F for wire colours'
}

export function StatusBar() {
  const s = useEditor(
    useShallow((s) => ({
      hover: s.hover,
      placing: !!s.placing,
      tool: s.tool,
      drafting: !!s.draft,
      notice: s.notice,
      parts: s.doc.parts,
      doc: s.doc,
    })),
  )
  const at = coords(s.doc, docBoard(s.doc)).hole
  const faults = useAnalysis().checks.filter((c) => c.level === 'fault').length
  const pins = s.hover ? pinsAt(s.parts, s.hover.hole) : []

  return (
    <footer className="status">
      <span className="coords">
        {s.hover ? `${at(s.hover.hole)} · ${s.hover.side}` : '—'}
      </span>
      {pins.length > 0 && (
        <span className="pin-name">{pins.map((p) => [p.name, p.detail].filter(Boolean).join(' · ') + ` (${p.part})`).join(' / ')}</span>
      )}
      <span className={s.notice ? 'hint notice' : 'hint'}>{s.notice ?? hint(s)}</span>
      {faults > 0 && (
        <button className="warning" onClick={() => useEditor.getState().setPanel('checks')}>
          {faults} {faults === 1 ? 'problem' : 'problems'}
        </button>
      )}
    </footer>
  )
}
