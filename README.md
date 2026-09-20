# Perfbored

A small editor for laying out parts and wires on perfboard, snapped to the 2.54 mm grid, on both sides of the board.

```bash
bun install
bun run dev
```

Boards are saved to localStorage as you work; **Menu → Save to disk** (⌘S) exports the JSON, **Open…** loads it back.

## Deploying

Pushing to `main` builds and publishes to GitHub Pages via `.github/workflows/deploy.yml`. In the repo settings, set **Pages → Source** to **GitHub Actions** once.

## Adding parts and boards

- **Boards** are plain data in `src/library/boards.ts`: size in mm and hole count.
- **Parts** are `PartDef`s in `src/library/parts/`, registered in `src/library/index.ts`. A part declares:
  - `pins(props)`: holes relative to its first pin, in hole units;
  - `bounds(props)`: its outline in mm, for hit-testing and selection;
  - `render(props)`: SVG in mm, using the shared classes in `styles.css` (`body`, `dark`, `metal`, `screen`, `ink`…);
  - optional `props` to edit in the inspector, with `defaults`.

Geometry is always stored as seen from the front: a part on the back is mirrored, so it reads the right way round when you flip the board.
