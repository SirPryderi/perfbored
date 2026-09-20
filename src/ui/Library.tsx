import { MagnifyingGlassIcon } from '@radix-ui/react-icons'
import { useState } from 'react'
import { categories, parts } from '../library'
import { inflate } from '../model/geometry'
import type { PartDef } from '../model/types'
import { useEditor } from '../store'

function Preview({ def }: { def: PartDef }) {
  const props = { ...def.defaults }
  const b = inflate(def.bounds(props), 1)
  return (
    <svg className="preview" viewBox={`${b.x} ${b.y} ${b.w} ${b.h}`}>
      <g className="part">{def.render(props, { flipped: false, rot: 0 })}</g>
    </svg>
  )
}

export function Library() {
  const [query, setQuery] = useState('')
  const placing = useEditor((s) => s.placing?.def)
  const q = query.trim().toLowerCase()
  const matches = parts.filter((p) => !q || p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q))

  const pick = (def: PartDef) =>
    useEditor.getState().setPlacing(
      placing === def.id ? null : { id: '', def: def.id, col: 0, row: 0, rot: 0, side: 'front', props: { ...def.defaults } },
    )

  return (
    <aside className="library">
      <label className="search">
        <MagnifyingGlassIcon />
        <input placeholder="Search parts" value={query} onChange={(e) => setQuery(e.target.value)} />
      </label>
      {categories.map((cat) => {
        const items = matches.filter((p) => p.category === cat)
        if (!items.length) return null
        return (
          <section key={cat}>
            <h3>{cat}</h3>
            <div className="items">
              {items.map((def) => (
                <button key={def.id} className="item" data-active={placing === def.id} onClick={() => pick(def)}>
                  <Preview def={def} />
                  <span>{def.name}</span>
                </button>
              ))}
            </div>
          </section>
        )
      })}
    </aside>
  )
}
