# NexumForgia Architecture

Technical documentation for the web-based Doom map editor.

## Technology Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| UI Framework | React 19 + TypeScript | Components, dialogs, state |
| Rendering | PixiJS 8 | WebGL 2D canvas |
| State | Zustand | Global editor state |
| Spatial Index | rbush | Fast element queries |
| Triangulation | earcut | Sector polygon fill |
| Styling | Tailwind CSS 4 | UI components |
| Build | Vite 7 | Dev server, bundling |

## Project Structure

```
www/src/
├── components/
│   ├── editor/          # Viewport, Toolbar, StatusBar
│   └── dialogs/         # Properties, browsers, pickers
├── core/
│   ├── modes/           # Edit modes (Vertex, Linedef, Sector, Thing, Draw)
│   ├── geometry/        # Math utilities, sector detection
│   └── actions/         # Undo/redo action classes
├── renderer/
│   └── layers/          # PixiJS render layers
├── store/               # Zustand stores
├── io/                  # WAD parsing, map reading/writing
└── types/               # TypeScript definitions
```

## Data Model

```
MapData
├── vertices:  Map<id, Vertex>     # Points in 2D space
├── linedefs:  Map<id, Linedef>    # Lines between vertices
├── sidedefs:  Map<id, Sidedef>    # Texture assignments
├── sectors:   Map<id, Sector>     # Closed areas (floor/ceiling)
└── things:    Map<id, Thing>      # Objects (monsters, items)
```

## Render Pipeline

```
Grid Layer → Sector Layer → Linedef Layer → Vertex Layer → Thing Layer → Overlay Layer
```

Each layer is a PixiJS Container with independent update cycles.

## Supported Map Formats

| Format | Read | Write | Notes |
|--------|------|-------|-------|
| Doom | Yes | Yes | Standard binary format |
| Hexen | Yes | Yes | Extended linedefs with args |
| Boom | Yes | Yes | Generalized effects |
| ZDoom | Yes | Yes | Hexen with extended features |
| ZDaemon | Yes | Yes | ZDoom subset |
| UDMF | Planned | Planned | Text-based format |

## Key Algorithms

### Sector Detection
Closed loops of linedefs are detected using graph traversal. When a loop is found, earcut triangulates the polygon for rendering.

### Spatial Indexing
All map elements are indexed in rbush R-trees for O(log n) spatial queries during selection and hit testing.

### Undo/Redo
Action-based system where each edit creates a reversible action object stored in ActionStack.

## Memory Considerations

- WAD files are parsed on-demand, not held in memory
- Textures are decoded lazily and cached in IndexedDB
- Virtual scrolling in browsers prevents DOM bloat
- LRU cache limits texture memory usage

## Future: 3D Preview

Planned implementation using Three.js for visual mode editing, including slope support via Plane_Align (special 181).
