import { useEditor } from '../store'
import { useAnalysis } from '../useAnalysis'

// Problems found on the board; hovering one rings the holes involved.
export function Checks() {
  const { checks } = useAnalysis()
  const setHighlight = useEditor((s) => s.setHighlight)
  if (!checks.length) return <p className="checks-empty">No problems found.</p>
  return (
    <ul className="checks" onMouseLeave={() => setHighlight(null)}>
      {checks.map((c, i) => (
        <li key={i} className={c.level} onMouseEnter={() => setHighlight(c.holes)}>
          {c.message}
        </li>
      ))}
    </ul>
  )
}
