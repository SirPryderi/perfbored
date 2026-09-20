import { Tooltip } from 'radix-ui'
import { useShallow } from 'zustand/react/shallow'
import { Canvas } from './canvas/Canvas'
import { useEditor } from './store'
import { Inspector } from './ui/Inspector'
import { Library } from './ui/Library'
import { RadialPicker } from './ui/RadialPicker'
import { StatusBar } from './ui/StatusBar'
import { Toolbar } from './ui/Toolbar'
import { useShortcuts } from './useShortcuts'

export function App() {
  useShortcuts()
  const { layout, facing } = useEditor(useShallow((s) => ({ layout: s.layout, facing: s.facing })))
  return (
    <Tooltip.Provider delayDuration={400}>
      <div className="app">
        <Toolbar />
        <div className="main">
          <Library />
          <div className={`stage ${layout}`}>
            {layout === 'single' ? (
              <Canvas facing={facing} viewKey="single" />
            ) : (
              <>
                <div className="pane">
                  <span className="pane-label">Front</span>
                  <Canvas facing="front" viewKey="split" />
                </div>
                <div className="pane">
                  <span className="pane-label">Back</span>
                  <Canvas facing="back" viewKey="split" />
                </div>
              </>
            )}
          </div>
          <Inspector />
        </div>
        <StatusBar />
      </div>
      <RadialPicker />
    </Tooltip.Provider>
  )
}
