import { CheckIcon, MagnifyingGlassIcon } from '@radix-ui/react-icons'
import { Command, defaultFilter } from 'cmdk'
import { Dialog, VisuallyHidden } from 'radix-ui'
import { useState } from 'react'
import { flushSync } from 'react-dom'
import { applyColour, changeBoard, currentColour, newBoard, openFile, placePart, setNaming, setOrigin } from '../actions'
import { ago } from '../files'
import { commandIds, commands, GROUPS, type CommandId } from '../keymap'
import { boards, parts } from '../library'
import { NAMINGS, namingOf, originLabel, originOf, ORIGINS } from '../model/naming'
import { WIRE_COLORS } from '../model/routing'
import { useEditor } from '../store'
import { Keys } from './Tip'

interface Entry {
  id: string
  label: string
  run: () => unknown
  hint?: string
  keywords?: string[]
  command?: CommandId
  swatch?: string
  on?: boolean
  danger?: boolean
}

interface Section {
  heading: string
  entries: Entry[]
  // Long lists of choices stay out of the way until there is something to match.
  searchOnly?: boolean
}

const fromCommands = (group: (typeof GROUPS)[number]): Section => ({
  heading: group,
  entries: commandIds.flatMap((id) => {
    const c = commands[id]
    if (c.group !== group || !c.run || c.unlisted || c.when?.() === false) return []
    return [{ id, command: id, label: c.label, hint: c.hint, keywords: c.keywords, danger: c.danger, on: c.on?.(), run: () => c.run?.() }]
  }),
})

function sections(): Section[] {
  const s = useEditor.getState()
  const colour = currentColour(s)
  const naming = namingOf(s.doc)
  const origin = originOf(s.doc)
  const [tools, edit, view, board, file] = GROUPS.map(fromCommands)
  return [
    tools,
    edit,
    view,
    board,
    {
      heading: 'Switch board',
      entries: s.files.map((f) => ({
        id: `open:${f.id}`,
        label: f.name || 'Untitled',
        hint: ago(f.updated),
        keywords: ['open', 'switch'],
        on: f.id === s.fileId,
        run: () => openFile(f.id),
      })),
    },
    file,
    {
      heading: 'Add part',
      searchOnly: true,
      entries: parts.map((def) => ({
        id: `part:${def.id}`,
        label: `Add ${def.name}`,
        hint: def.category,
        keywords: ['place', def.category],
        run: () => placePart(def),
      })),
    },
    {
      heading: 'Wire colour',
      searchOnly: true,
      entries: WIRE_COLORS.map((c) => ({
        id: `colour:${c.value}`,
        label: `Wire colour: ${c.name}`,
        swatch: c.value,
        on: c.value === colour,
        run: () => applyColour(c.value),
      })),
    },
    {
      heading: 'Board settings',
      searchOnly: true,
      entries: [
        ...boards.map((b) => ({
          id: `size:${b.id}`,
          label: `Board size: ${b.name}`,
          hint: `${b.cols} × ${b.rows} holes`,
          on: b.id === s.doc.board,
          run: () => changeBoard(b.id),
        })),
        ...boards.map((b) => ({
          id: `new:${b.id}`,
          label: `New board: ${b.name}`,
          hint: `${b.cols} × ${b.rows} holes`,
          run: () => newBoard(b.id),
        })),
        ...NAMINGS.map((n) => ({
          id: `naming:${n.id}`,
          label: `Hole labels: ${n.label}`,
          hint: n.example,
          on: n.id === naming,
          run: () => setNaming(n.id),
        })),
        ...ORIGINS.map((o) => ({
          id: `origin:${o}`,
          label: `Hole numbers from: ${originLabel(o)}`,
          keywords: ['hole labels'],
          on: o === origin,
          run: () => setOrigin(o),
        })),
      ],
    },
  ]
}

// Scattered letters that only just match are noise.
const WEAK_MATCH = 0.05

// cmdk's own filtering only sorts the rows still on the page, so rows that come
// back as a query changes land out of order. Ranking here keeps them right.
function ranked(list: Section[], search: string) {
  return list
    .flatMap((section) => section.entries)
    .map((entry) => ({ entry, score: defaultFilter([entry.label, ...(entry.keywords ?? [])].join(' '), search) }))
    .filter(({ score }) => score >= WEAK_MATCH)
    .sort((a, b) => b.score - a.score)
    .map(({ entry }) => entry)
}

function Row({ entry, onChoose }: { entry: Entry; onChoose: (entry: Entry) => void }) {
  return (
    <Command.Item
      value={entry.id}
      className={entry.danger ? 'palette-item danger' : 'palette-item'}
      onSelect={() => onChoose(entry)}
    >
      {entry.swatch && <span className="swatch small" style={{ background: entry.swatch }} />}
      <span className="palette-label">{entry.label}</span>
      <span className="palette-hint">{entry.hint}</span>
      {entry.on && <span className="palette-on" aria-label="on"><CheckIcon /></span>}
      {entry.command && commands[entry.command].keys.length > 0 && <Keys command={entry.command} />}
    </Command.Item>
  )
}

function Palette() {
  const [query, setQuery] = useState('')
  const [list] = useState(sections)
  const search = query.trim()

  // The palette closes first, so a confirm or file dialog opens over the board.
  const choose = (entry: Entry) => {
    flushSync(() => useEditor.getState().setPalette(false))
    entry.run()
  }

  return (
    <Command label="Command palette" shouldFilter={false} loop>
      <div className="palette-search">
        <MagnifyingGlassIcon />
        <Command.Input className="palette-input" placeholder="Search actions, boards and parts" value={query} onValueChange={setQuery} />
      </div>
      <Command.List className="palette-list">
        <Command.Empty className="palette-empty">Nothing matches “{search}”</Command.Empty>
        {search
          ? ranked(list, search).map((entry) => <Row key={entry.id} entry={entry} onChoose={choose} />)
          : list
              .filter((section) => section.entries.length && !section.searchOnly)
              .map((section) => (
                <Command.Group key={section.heading} heading={section.heading}>
                  {section.entries.map((entry) => <Row key={entry.id} entry={entry} onChoose={choose} />)}
                </Command.Group>
              ))}
      </Command.List>
      <div className="palette-foot">
        <span>↑↓ to move</span>
        <span>↵ to run</span>
        <span>esc to close</span>
      </div>
    </Command>
  )
}

export function CommandPalette() {
  const open = useEditor((s) => s.palette)
  return (
    <Dialog.Root open={open} onOpenChange={(o) => useEditor.getState().setPalette(o)}>
      <Dialog.Portal>
        <Dialog.Overlay className="palette-overlay" />
        <Dialog.Content className="palette" aria-describedby={undefined}>
          <VisuallyHidden.Root>
            <Dialog.Title>Command palette</Dialog.Title>
          </VisuallyHidden.Root>
          <Palette />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
