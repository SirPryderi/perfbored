import { MagnifyingGlassIcon } from '@radix-ui/react-icons'
import { useState } from 'react'
import { placePart } from '../actions'
import { categories, parts } from '../library'
import { inflate } from '../model/geometry'
import type { PartDef } from '../model/types'
import { useEditor } from '../store'

function Preview({ def }: { def: PartDef }) {
  const props = { ...def.defaults }
  const view = { flipped: false, rot: 0 } as const
  const b = inflate(def.bounds(props, view), 1)
  return (
    <svg className="preview" viewBox={`${b.x} ${b.y} ${b.w} ${b.h}`}>
      <g className="part">{def.render(props, view)}</g>
    </svg>
  )
}

export function Library() {
  const [query, setQuery] = useState('')
  const placing = useEditor((s) => s.placing?.def)
  const q = query.trim().toLowerCase()
  const matches = parts.filter((p) => !q || p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q))

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
                <button key={def.id} className="item" data-active={placing === def.id} onClick={() => placePart(def)}>
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
