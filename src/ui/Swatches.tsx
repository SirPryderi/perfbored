import { WIRE_COLORS } from '../model/routing'

export function Swatches({ value, onChange }: { value: string; onChange: (color: string) => void }) {
  return (
    <div className="swatches">
      {WIRE_COLORS.map((c) => (
        <button
          key={c.value}
          className="swatch"
          data-active={c.value === value}
          style={{ background: c.value }}
          title={c.name}
          aria-label={c.name}
          onClick={() => onChange(c.value)}
        />
      ))}
    </div>
  )
}
