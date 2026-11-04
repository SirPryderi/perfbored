# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Perfbored is a layout editor for hand-wired perfboard: parts and wires snapped to a 2.54 mm grid, on both sides of the board. It is used to plan real boards before soldering, by a hobbyist rather than an EE, so parts carry plain-language hints and the app should state facts rather than make the user infer them.

## Commands

```bash
bun install
bun run dev          # vite, port from .claude/launch.json when driven by the harness
bun run build        # tsc && vite build — the only gate; there is no test runner or linter
bunx tsc             # typecheck alone, use this while iterating
```

There are no unit tests. Two things stand in for them, and both are worth using before claiming something works:

- **Run pure modules with bun.** `analysis.ts`, `report.ts`, `model/routing.ts` and every `PartDef` import cleanly outside React. A throwaway script in the scratchpad that builds a `Doc` literal and prints `describe(doc)` checks connectivity and part geometry in seconds.
- **Drive the running app.** Load a scratch board via `saveFile`/`open` from `/src/files.ts` and `/src/store.ts` in the browser console, look at it, then delete it. Never leave scratch boards in the user's board list, and never modify their boards.

Deployment is GitHub Pages via `.github/workflows/deploy.yml` on push to `main`.

## Geometry, the part everything else depends on

- **Holes are the unit.** `Hole = [col, row]`, 0-based in the model and 1-based everywhere a human reads it (`C5R3`). Part positions are holes; part drawings are millimetres relative to the part's first pin.
- **Board coordinates are always as seen from the front.** A part on the back, or mounted upside down, is mirrored: `isMirrored(part) = (side === 'back') !== flipped`. `orient()` and `partTransform()` are the only places that know this; everything else goes through them, including the analysis and the report.
- **Viewing the back mirrors the canvas**, which cancels the part's own mirror, so a back part reads correctly from the back. Text needs the opposite treatment: all part text goes through `Upright`, which un-mirrors and un-inverts using the `PartView` passed to `render`. Never use a bare `<text>` in a part.
- **Hole names are display only.** Holes stay `[col, row]` from the top-left in the model, whatever the board is printed with; `coords(doc, board)` in `model/naming.ts` turns one into the name the user sees, and every message, axis and report goes through it. A doc also carries `portrait`, and `docBoard(doc)` is the board with its axes swapped — use it, never `boardById`, wherever real dimensions matter. Turning the board rewrites part and wire coordinates once (`rotateBoard`), so nothing downstream has to know.
- **Mirroring a part around its origin moves it**, so `mirrorInPlace` in `actions.ts` shifts it back so its legs keep the same holes. Any new transform that mirrors must do the same.

## Connectivity lives in `analysis.ts`

`analyze(doc)` is the single source of truth for what is connected, and the Checks panel, the continuity probe (`probe`) and the text report all render it. Adding a rule to one without the other is a bug. The rules model hand soldering, not PCB traces:

- a wire is one insulated conductor that connects only at its two ends; bends and holes it runs through connect to nothing, so every junction is explicit;
- a wire end connects to the pin in its hole, or where there is no pin, to any wire running through that hole (a junction); running over a pin is a note, not a connection;
- pins in the same hole are connected, and same-named pins on one part are joined inside it (two GNDs, a button's paired legs);
- `stacks` parts (pin headers) sharing holes with a module are sockets, not shorts.

Checks are split into `fault` (certainly wrong) and `note` (worth seeing, often intentional). Keep that line honest: a note that is usually fine should never become a fault, and vice versa. `describe(doc)` in `report.ts` is written to be pasted into a chat for review, so it states its own conventions in the header and never leaves a connection implicit.

## The part library

A part is one `PartDef` in `src/library/parts/`, registered in `src/library/index.ts`. Adding parts should stay this cheap; when something is needed by two parts, factor it (`breakouts.tsx` builds the motor drivers and the generic breakout from one function; `labels.ts` handles editable pin-label lists).

Flags carry meaning used across the app, so set them deliberately: `ref` (designator prefix in reports), `pads` (draw pads over the body — modules whose PCB would hide their pins), `stacks`, `overlay` (label-only, skip overlap checks), `flippable`, `annotation`, `pinLabel` (enables double-click/L labelling), `suggestions` on a text prop (common values with a one-line "what it's for", aimed at a beginner), and `caption` on a text prop that varies board to board (pin labels, an instance's name) so the part tally groups by what you would actually buy. Every part except annotations and `overlay` parts gets the `NAME` prop from `labels.ts` in the registry, so don't add it to a def: naming an instance is a caption, drawn off-board on a leader line by the Names layer rather than on the part, to keep the board itself free of text.

Keep props consistent across parts: a part number is `label` / "Part number" with `suggestions`; a pin count is "Pins"; a bendable two-leg part takes `legSpan()` from `legs.ts` (the `span` prop, holes from leg to leg inclusive); number props carry a `unit` (`holes` also shows the mm between the outer holes) and a `step` where only some values make sense. Read a part's props with `propsOf`/`partBounds` from `model/geometry.ts`, never by merging defaults by hand. `Upright` centres text on its (x, y), so a pin label goes at the pin's own coordinate.

Pin order follows the part, not the drawing: a DIP IC or socket counts anticlockwise from the notch, a breakout runs down one column then the other, so pin N is index N-1 in `pins`, `pinNames` and the label list everywhere.

Footprints come from real parts and the exact numbers matter. Where clones differ, expose the variation as a prop (OLED pin order, TO-92 pinout, XT30 polarity, breakout pin labels) rather than guessing, and say so in the reply.

## State, keys, canvas

- **Store** (`store.ts`, zustand): `change` commits with undo history, `preview` mutates without it, `checkpoint` opens an undo step before a drag. Drags use `checkpoint` once on first movement then `preview`.
- **Selection** is a list of parts and wires (`Item[]`); `only(selection, kind)` is the single-item case the Properties panels use. Every edit on the selection (move, turn, swap sides, copy, delete) is a pure function in `items.ts`, and so is turning the whole board, so a new group edit belongs there. One part still rotates about its first pin; anything more turns as a group about its middle hole. Multi-board storage is in `files.ts`; the localStorage prefix has migrated once already, so add migrations rather than renaming keys.
- **Commands** (`keymap.ts`) are one table driving the key handler, tooltips, menus, the shortcuts panel and the command palette (`ui/CommandPalette.tsx`), so a new action belongs there, with `when` if it only sometimes applies and `unlisted` if it needs the pointer or a held key. Choices that come from data (boards, sizes, colours, parts) are built in the palette from the same lists and actions the menus use. The hamburger menu is a menu bar (File, Edit, View, Board) of those commands; the board name dropdown only switches boards and starts new ones; right-clicking the canvas (`canvas/CanvasMenu.tsx`) selects as a click would and lists the commands for the pins, selection or board under it. `ui/menus.tsx` builds their shared parts for both Radix menu types. Never write a shortcut string in a component. Bindings match physical keys (`KeyboardEvent.code`) so the home-row/number-row layout survives other keyboard layouts, with ⌥ mnemonics alongside.
- **Canvas layering is a feature.** Board → far-side ghosts → far wires → pins → near wires → junctions → annotations → near bodies → names → selection and overlays. Hiding the Parts layer is how the user inspects connections, so nothing electrical may be drawn above part bodies. Overlays that must stay reachable (wire vertex handles, pin tooltips, the pin-label popup) are drawn after bodies or in HTML above the SVG.
- **Radix for UI chrome**, plain SVG for the board. One trap: Radix `Tooltip.Trigger` overwrites a child's `data-state`, so toggle styling keys off `aria-checked`/`aria-pressed`. Another: SVG classes and UI classes share one stylesheet and user units are millimetres, so a stray `font-size` in a UI rule renders as 12 mm on the board. Keep the two naming sets distinct.

## Direction

The app is deliberately lenient about what real hand soldering allows, and strict about telling the user what it assumed. When a new capability blurs that line, prefer surfacing it in Checks over silently deciding.

Known gaps, roughly in the order they have come up: dragging a whole wire segment sideways; inserting or deleting a wire vertex; a 1:1 print or SVG export for drilling and layout; more part variants as the user's parts bin grows.
