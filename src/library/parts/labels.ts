import type { PinLabel, Props } from '../../model/types'

// Pin label lists are stored as text: comma separated, or space separated for
// older boards. Labels may contain spaces once commas are in use.
export function splitLabels(text: unknown): string[] {
  const s = String(text ?? '').trim()
  if (!s) return []
  return (s.includes(',') ? s.split(',') : s.split(/\s+/)).map((t) => t.trim())
}

export const joinLabels = (labels: string[]) => labels.join(', ')

function setAt(list: string[], index: number, label: string) {
  const out = [...list]
  while (out.length <= index) out.push('')
  out[index] = label.trim().replaceAll(',', ' ')
  while (out.length && !out[out.length - 1]) out.pop()
  return out
}

// A label per pin, kept in one list prop.
export const listLabels = (key: string): PinLabel => ({
  get: (p, i) => splitLabels(p[key])[i] ?? '',
  set: (p, i, label) => ({ ...p, [key]: joinLabels(setAt(splitLabels(p[key]), i, label)) }),
})

// Two list props back to back, e.g. the two columns of a breakout. `split` is
// how many pins the first column has, which may be more than it has labels.
export const columnLabels = (first: string, second: string, split: (p: Props) => number): PinLabel => ({
  get: (p, i) => {
    const n = split(p)
    return (i < n ? splitLabels(p[first])[i] : splitLabels(p[second])[i - n]) ?? ''
  },
  set: (p, i, label) => {
    const n = split(p)
    return i < n
      ? { ...p, [first]: joinLabels(setAt(splitLabels(p[first]), i, label)) }
      : { ...p, [second]: joinLabels(setAt(splitLabels(p[second]), i - n, label)) }
  },
})

export const pinLabelName = (label: string, index: number, fallback = 'Pin') =>
  label ? `${label} · ${fallback.toLowerCase()} ${index + 1}` : `${fallback} ${index + 1}`
