import { useMemo } from 'react'
import { analyze } from './analysis'
import { useEditor } from './store'

export function useAnalysis() {
  const doc = useEditor((s) => s.doc)
  return useMemo(() => analyze(doc), [doc])
}
