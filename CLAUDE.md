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

`analyze(doc)` is the single source of truth for what is connected, and both the in-editor Checks panel and the text report render it. Adding a rule to one without the other is a bug. The rules model hand soldering, not PCB traces:

- a wire is one conductor along its whole path;
- a wire connects to any pin whose hole it passes through (soldering across a pin is normal practice);
- a wire ending anywhere on another wire is a junction; wires that merely cross are insulated;
- pins in the same hole are connected, and same-named pins on one part are joined inside it (two GNDs, a button's paired legs);
- `stacks` parts (pin headers) sharing holes with a module are sockets, not shorts.

Checks are split into `fault` (certainly wrong) and `note` (worth seeing, often intentional). Keep that line honest: a note that is usually fine should never become a fault, and vice versa. `describe(doc)` in `report.ts` is written to be pasted into a chat for review, so it states its own conventions in the header and never leaves a connection implicit.

## The part library

A part is one `PartDef` in `src/library/parts/`, registered in `src/library/index.ts`. Adding parts should stay this cheap; when something is needed by two parts, factor it (`breakouts.tsx` builds the motor drivers and the generic breakout from one function; `labels.ts` handles editable pin-label lists).

Flags carry meaning used across the app, so set them deliberately: `ref` (designator prefix in reports), `pads` (draw pads over the body — modules whose PCB would hide their pins), `stacks`, `overlay` (label-only, skip overlap checks), `flippable`, `annotation`, `pinLabel` (enables double-click/L labelling), and `suggestions` on a text prop (common values with a one-line "what it's for", aimed at a beginner).

Pin order follows the part, not the drawing: a DIP IC or socket counts anticlockwise from the notch, a breakout runs down one column then the other, so pin N is index N-1 in `pins`, `pinNames` and the label list everywhere.

Footprints come from real parts and the exact numbers matter. Where clones differ, expose the variation as a prop (OLED pin order, TO-92 pinout, XT30 polarity, breakout pin labels) rather than guessing, and say so in the reply.

## State, keys, canvas

- **Store** (`store.ts`, zustand): `change` commits with undo history, `preview` mutates without it, `checkpoint` opens an undo step before a drag. Drags use `checkpoint` once on first movement then `preview`. Multi-board storage is in `files.ts`; the localStorage prefix has migrated once already, so add migrations rather than renaming keys.
- **Keymap** (`keymap.ts`) is one table driving the key handler, every tooltip and the shortcuts panel. Never write a shortcut string in a component. Bindings match physical keys (`KeyboardEvent.code`) so the home-row/number-row layout survives other keyboard layouts, with ⌥ mnemonics alongside.
- **Canvas layering is a feature.** Board → far-side ghosts → far wires → pins → near wires → junctions → annotations → near bodies → selection and overlays. Hiding the Parts layer is how the user inspects connections, so nothing electrical may be drawn above part bodies. Overlays that must stay reachable (wire vertex handles, pin tooltips, the pin-label popup) are drawn after bodies or in HTML above the SVG.
- **Radix for UI chrome**, plain SVG for the board. One trap: Radix `Tooltip.Trigger` overwrites a child's `data-state`, so toggle styling keys off `aria-checked`/`aria-pressed`. Another: SVG classes and UI classes share one stylesheet and user units are millimetres, so a stray `font-size` in a UI rule renders as 12 mm on the board. Keep the two naming sets distinct.

## Direction

The app is deliberately lenient about what real hand soldering allows, and strict about telling the user what it assumed. When a new capability blurs that line, prefer surfacing it in Checks over silently deciding.

Known gaps, roughly in the order they have come up: dragging a whole wire segment sideways; inserting or deleting a wire vertex; multi-select; a 1:1 print or SVG export for drilling and layout; more part variants as the user's parts bin grows.
