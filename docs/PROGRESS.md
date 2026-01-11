# UDMF Doom Map Editor - Progress Tracker

## Workflow

```
1. Implementation → 2. Browser Test → 3. Commit → 4. Deploy (make deploy-dev)
```

### Daily Workflow
1. Check PROGRESS.md - see what's in progress
2. Implement next feature/fix
3. Test locally (`npm run dev`)
4. Commit changes
5. Deploy to https://nexumforgia.org (`make deploy-dev`)

### Git Workflow
- `main` branch = stable version
- Feature branches for larger changes
- Commit messages: `feat:`, `fix:`, `refactor:`, `docs:`

---

## Phase 1: Basics

| Task | Status | Notes |
|------|--------|-------|
| Project setup (Vite + React + TS) | ✅ | |
| Install dependencies | ✅ | PixiJS 8, Zustand, rbush, earcut, Tailwind |
| Core types (types.ts) | ✅ | Vertex, Linedef, Sidedef, Sector, Thing |
| MapData class | ✅ | |
| PixiJS Renderer | ✅ | |
| Camera system | ✅ | Pan, zoom, coordinate transforms |
| Grid layer | ✅ | |
| WAD parser (read) | ✅ | Doom + Hexen format auto-detection |
| Hexen map reader | ✅ | |
| Basic UI layout | ✅ | Viewport, Toolbar, StatusBar |
| Display loaded map | ✅ | Vertices, linedefs, things |

## Phase 2: Interaction

| Task | Status | Notes |
|------|--------|-------|
| Selection system | ✅ | SelectionManager with box selection |
| Vertex mode | ✅ | Select, move, create, delete, merge, join |
| Linedef mode | ✅ | Select, move, flip, delete |
| Sector mode | ✅ | Select, highlight (basic) |
| Undo/redo system | ✅ | ActionStack with Ctrl+Z/Y |
| Keyboard shortcuts | ✅ | V/L/S/T for modes, G for grid, Ctrl+Z/Y undo/redo |

## Phase 3: Editing

| Task | Status | Notes |
|------|--------|-------|
| Draw mode (Lines) | ✅ | RMB starts, LMB continues, RMB/Escape ends |
| Sector detection | ✅ | Shift+B or toolbar button, SectorBuilder |
| Thing mode | ✅ | RMB insert+drag, Delete key, hover drag |
| Sector mode | ✅ | Box selection, Delete key, hover drag |
| Vertex mode | ✅ | Merge (Shift+M), Join (J), hover drag |
| Linedef mode | ✅ | Split (Shift+S), Curve (Shift+C), hover drag |
| Properties panels | ✅ | Vertex, Linedef, Sector, Thing dialogs |
| Map format selection | ✅ | Boom Doom/Doom2, Hexen, ZDoom, ZDaemon |
| Session management | ✅ | Save/Load sessions, clear all data |

## Phase 4: Advanced

| Task | Status | Notes |
|------|--------|-------|
| Texture browser | ✅ | Virtual scrolling, categories, search |
| Texture selector | ✅ | Inline preview, click/right-click |
| FLAT texture display | ✅ | Floor/ceiling view mode displays textures |
| Thing type picker | ✅ | Categorized selection of thing types |
| ScrubInput component | ✅ | Photoshop-style drag-to-change values |
| Auto texture alignment | ✅ | Shift+A, auto-align along connected walls |
| Copy/paste | ✅ | Ctrl+C/X/V, Delete, with ID remapping |
| WAD export (Hexen) | ✅ | Toolbar + Ctrl+Shift+S |
| BEHAVIOR lump | ✅ | Import/export preservation (passthrough) |
| SCRIPTS lump | ✅ | ACS source code preservation |
| 3D preview | 🔲 | |

## Phase 5: Export & Polish

| Task | Status | Notes |
|------|--------|-------|
| WAD Writer | ✅ | Export map to WAD (Doom/Hexen format) |
| UDMF export | 🔲 | Text format for ZDoom |
| Minimap | 🔲 | |
| Preferences | 🔲 | |
| Custom keybindings | 🔲 | |
| Performance optimization | 🔲 | |
| Error handling | 🔲 | |

## Known Issues / TODO

| Issue | Priority | Notes |
|-------|----------|-------|
| Sector drawing mode | Low | RMB on empty space in SectorMode - possibility to draw sectors |
| DrawMode in Toolbar | Low | Viewport has placeholder 'draw' mode |
| Wall texture display | Medium | Displaying wall textures on linedefs (3D preview) |

---

## Legend

- 🔲 Not started
- 🔄 In progress
- ✅ Complete
- ❌ Blocked

---

## Changelog

### 2026-01-10
- Initial project setup complete
- Implemented core data structures (types.ts, MapData.ts)
- Created PixiJS renderer with layers (Grid, Sector, Linedef, Vertex, Thing, Overlay)
- Implemented Camera system (pan, zoom, coordinate transforms)
- WAD parser with Doom/Hexen format auto-detection
- Basic UI: Toolbar, Viewport, StatusBar
- Keyboard shortcuts for mode switching
- Selection store ready

**Evening update:**
- Implemented complete editing system based on INSTRUCTIONS_EDITING.md
- Core Infrastructure:
  - EditModeContext, ModeManager, SelectionManager
  - SnapSystem (grid/vertices/lines)
  - ActionStack (undo/redo with merge support)
  - KeyboardState, EditorController
- Edit Modes:
  - VertexMode: select, move, create, delete, merge (Shift+M), join (J)
  - LinedefMode: select, move, flip (F), delete
  - SectorMode: basic selection
  - ThingMode: select, move
- Actions with Undo/Redo:
  - MoveVerticesAction, CreateVertexAction, DeleteVerticesAction
  - CreateLinedefAction, SplitLinedefAction, MergeVerticesAction
  - FlipLinedefAction, DeleteLinedefsAction
- Integrated EditorController into Viewport
- Keyboard shortcuts: V/L/S/T (modes), Ctrl+Z/Y (undo/redo)
- Successfully deployed to https://nexumforgia.org

### 2026-01-10 (Session 2)

**Map Format & Selection:**
- New `MapFormat.ts` - format definitions (doom, boom_doom, boom_doom2, hexen, zdoom_hexen, zdaemon)
- `MapSelectionDialog.tsx` - map selection from WAD with format auto-detection
- `NewMapDialog.tsx` - new map creation with format selection
- Fix: WAD reader correctly reads only lumps for selected map (not just the last one)

**Edit Modes - UX fixes:**
- `LinedefMode.ts`:
  - Right-click on empty space starts drawing a new line
  - Left-click continues drawing
  - Right-click again or Escape cancels drawing
  - Methods: `startDrawing()`, `continueDrawing()`, `cancelDrawing()`
- `ThingMode.ts`:
  - Right-click inserts a new thing
  - Delete/Backspace deletes selected things
  - Drag with undo/redo support (`MoveThingsAction`)
  - Methods: `insertThing()`, `deleteSelected()`
- `SectorMode.ts`:
  - Box selection (click + drag on empty space)
  - Delete/Backspace deletes selected sectors
  - Methods: `startBoxSelect()`, `finishBoxSelect()`, `deleteSelected()`

**Actions:**
- `ThingActions.ts` - CreateThingAction, DeleteThingsAction, MoveThingsAction
- `SectorActions.ts` - DeleteSectorsAction (with cascading sidedef/linedef deletion)

**UI/UX:**
- Toolbar with DoomBuilderX icons (`/public/icons/`)
- `Icon.tsx`, `IconButton.tsx` components
- Toggle buttons for Grid, Vertices, Things display
- Clear All Data button (clears everything from localStorage)
- PIXI rendering fix - explicit `app.render()` call

**Fixes:**
- `WadReader.findMapLumps()` - correctly detects end of map (checking MAP/ExMx patterns)
- Renderer toggle visibility - added `app.render()` for PIXI refresh

**Known Issues:**
- ~~🔄 Line drawing right-click - requires further tuning~~ ✅ Fixed

### 2026-01-10 (Session 3)

**Overlay System - Visual feedback:**
- `OverlayState` interface in `interfaces.ts` - defines selectionBox and drawingLine
- `OverlayLayer.ts` - renders:
  - Selection box (blue rectangle with transparent fill)
  - Drawing line preview (green line with circles at endpoints)
- All modes implement `getOverlayState()`:
  - VertexMode, LinedefMode, SectorMode, ThingMode
- `ModeManager.getOverlayState()` - aggregates overlay state from the current mode
- `EditorController.getOverlayState()` - exposes for Viewport
- `Viewport.tsx` - passes overlay state to renderer

**Mode changes:**
- Added `currentMousePos` tracking in all modes
- LinedefMode has special `getDrawingLineState()` for drawing preview

**Renderer:**
- `RenderOptions` extended with `drawingLine`
- `render()` passes both overlay types to `OverlayLayer`
- Added `app.render()` for PIXI refresh

### 2026-01-10 (Session 4) - UX Improvements

**Implementation according to UX.md:**

**TextureBrowserDialog - complete redesign:**
- Virtual scrolling using `react-window` - renders only visible textures
- Category filter dropdown - All/Flats/Textures/Used in Map/Unused
- Keyboard arrow navigation in grid
- Item counter and dimensions of the selected texture
- New dependencies: `react-window`, `@types/react-window`

**SectorPropertiesDialog improvements:**
- Swapped floor/ceiling positions (ceiling on top, floor on bottom - logical layout)
- New `ScrubInput` component with Photoshop-style scrubbing
- Drag on label to change value (Shift: fine, Ctrl: fast)
- Scroll wheel on inputs for fine control
- Sector height display (ceiling - floor)

**StatusBar improvements:**
- Cursor position display (X/Y)
- Displays snapped position when grid snap is active
- New `cursorPosition` state in `editorStore`

**LinedefLayer improvements:**
- Direction ticks on ALL linedefs (not just single-sided)
- Shorter tick (4px) for two-sided linedefs
- Longer tick (8px) for one-sided linedefs

**New keyboard shortcuts in LinedefMode:**
- `Shift+S` - Split Linedef (split in the middle)
- `Shift+C` - Curve Linedef (create Bezier curve with 8 segments)
- Both actions available in context menu

**New Actions:**
- `CurveLinedefAction` - creates curved line using quadratic Bezier curve
- Fully reversible (undo/redo support)

**New components:**
- `ScrubInput.tsx` - numeric input with drag-to-change and wheel support
- `NumericInput.tsx` - simpler version without label scrubbing

**Files changed:**
- `www/src/components/dialogs/TextureBrowserDialog.tsx`
- `www/src/components/dialogs/SectorPropertiesDialog.tsx`
- `www/src/components/common/ScrubInput.tsx` (new)
- `www/src/components/editor/StatusBar.tsx`
- `www/src/components/editor/Viewport.tsx`
- `www/src/store/editorStore.ts`
- `www/src/renderer/layers/LinedefLayer.ts`
- `www/src/core/editing/modes/LinedefMode.ts`
- `www/src/core/editing/actions/VertexActions.ts`
- `www/package.json` (new dependencies)

### 2026-01-10 (Session 5) - Sector Detection

**Sector Detection implementation:**
- `SectorBuilder.ts` - detection of closed loops from linedefs
- `DetectSectorsAction` - action for undo/redo (in SectorActions.ts)
- Toolbar button "Detect Sectors from Closed Lines"
- Keyboard shortcut `Shift+B`

**How it works:**
- Iterates through all vertices to find closed polygons
- Determines winding (clockwise/counter-clockwise) for front/back side
- Automatically creates sidedefs and assigns them to linedefs
- Sets TWOSIDED flag for two-sided linedefs

**react-window v2 migration:**
- Fixed imports for react-window v2 (FixedSizeGrid → Grid)
- New API: `cellComponent`, `cellProps`, `gridRef`, `defaultWidth/Height`
- `CellComponentProps` instead of `GridChildComponentProps`

**Files changed:**
- `www/src/core/editing/actions/SectorActions.ts` (DetectSectorsAction)
- `www/src/components/editor/Toolbar.tsx` (handleDetectSectors)
- `www/src/App.tsx` (Shift+B shortcut)
- `www/src/components/dialogs/TextureBrowserDialog.tsx` (react-window v2)

### 2026-01-10 (Session 5 - continued)

**Auto sector detection during drawing:**
- After closing a loop (connecting to an existing vertex), sectors are automatically detected
- `LinedefMode.continueDrawing()` - checks if connecting to an existing vertex
- `tryCreateSectorsFromNewLinedef()` - starts detection if there are linedefs without sidedefs

**SectorBuilder improvements:**
- `createSectorFromLoop()` - skips loops that already have sectors assigned
- `allSidesAssigned` check - does not re-detect existing sectors
- Skip linedefs that already have the respective sidedef

**Files changed:**
- `www/src/core/editing/modes/LinedefMode.ts` (auto sector detection)
- `www/src/core/geometry/SectorBuilder.ts` (skip existing sectors)

### 2026-01-10 (Session 6) - RMB Hover Drag & FLAT Textures

**RMB Hover+Drag UX (inspired by DoomBuilder/original):**
- New behavior: RMB + hover without selection = temporarily select, drag, deselect on release
- Implemented in all 4 modes:
  - `VertexMode.ts` - `rmbHoverDragVertexId`
  - `LinedefMode.ts` - `rmbHoverDragLinedefId`
  - `SectorMode.ts` - `rmbHoverDragSectorId`
  - `ThingMode.ts` - `rmbHoverDragThingId`
- After `finishDrag()` or `cancelDrag()`, the hover-drag element is deselected
- RMB click (without movement) still opens properties dialog

**ThingMode - RMB Insert + Drag:**
- RMB on empty space = creates thing AND starts dragging it
- `insertThingAndDrag()` method - combines creation with immediate drag
- After release, the thing is deselected (hover drag behavior)
- Uses `lastThingType` from editor state (or default 1 = Player 1 start)

**FLAT textures in viewport:**
- `SectorLayer.ts` - async loading of textures for PIXI v8:
  - `pendingTextures` set for load tracking
  - `setTextureLoadedCallback()` to trigger re-render after loading
  - Image → Canvas → PIXI.Texture (compatible with PIXI v8)
- `Renderer.ts` - link callback for re-render
- `invalidateTextureCache()` method for WAD change
- Textures are displayed in floor/ceiling view mode

**TextureBrowserDialog - scrolling fix:**
- Fixed explicit `height: gridHeight` on container
- `overflow: auto` on Grid component
- Fix for react-window v2 virtualization

**Files changed:**
- `www/src/core/editing/modes/VertexMode.ts`
- `www/src/core/editing/modes/LinedefMode.ts`
- `www/src/core/editing/modes/SectorMode.ts`
- `www/src/core/editing/modes/ThingMode.ts`
- `www/src/renderer/layers/SectorLayer.ts`
- `www/src/renderer/Renderer.ts`
- `www/src/components/dialogs/TextureBrowserDialog.tsx`

### 2026-01-10 (Session 7) - WAD Export

**WAD Writer implementation:**
- `WadWriter.ts` - creates PWAD files from lumps
  - Header (PWAD magic, lump count, directory offset)
  - Lump data + directory
  - `download()` method for in-browser download
- `MapWriter.ts` - converts MapData to binary WAD lumps
  - Supports Doom and Hexen format
  - Correct ID remapping (vertices, sidedefs, sectors)
  - Generates empty BEHAVIOR lump for Hexen

**UI/UX:**
- Toolbar button "Export to WAD" (Test icon)
- Keyboard shortcut `Ctrl+Shift+S`
- Export downloads a `mapname.wad` file

**New files:**
- `www/src/io/wad/WadWriter.ts`
- `www/src/io/map/MapWriter.ts`

**Files changed:**
- `www/src/store/mapStore.ts` - `exportToWad()` method
- `www/src/components/editor/Toolbar.tsx` - export button
- `www/src/App.tsx` - Ctrl+Shift+S shortcut

### 2026-01-10 (Session 8) - Copy/Paste

**Copy/Paste implementation:**
- `clipboardStore.ts` - Zustand store for clipboard data
- `CopyPasteManager.ts` - central logic for copy/paste operations:
  - `copy()` - copies selected elements including related ones
    - Vertices → copies only vertices
    - Linedefs → copies linedefs + their vertices + sidedefs
    - Sectors → copies sectors + linedefs + sidedefs + vertices
    - Things → copies things
  - `paste()` - pastes at cursor position with ID remapping
  - `cut()` - copy + delete
  - `deleteSelection()` - deletes selected elements with cascading

**Keyboard shortcuts:**
- `Ctrl+C` - Copy
- `Ctrl+X` - Cut
- `Ctrl+V` - Paste (at cursor position)
- `Delete` / `Backspace` - Delete selection

**Nové soubory:**
- `www/src/store/clipboardStore.ts`
- `www/src/core/editing/CopyPasteManager.ts`

**Soubory změněné:**
- `www/src/App.tsx` - keyboard shortcuts pro copy/paste/delete

### 2026-01-10 (Session 8 - pokračování) - Effect Browser

**Effect Browser implementace:**
- `sectorEffects.ts` - definice sector effects pro různé formáty:
  - Vanilla Doom (18 základních efektů)
  - Boom generalized sectors (kombinovatelné: lighting, damage, secret, friction, wind)
  - ZDoom/Hexen extended (100+ efektů: wind, scroll, carry, phased lighting...)
- `EffectBrowserDialog.tsx` - dialog pro výběr sector efektů:
  - Predefined tab: seznam s vyhledáváním a filtrováním podle kategorie
  - Generalized tab (pouze Boom): výběr kombinovatelných efektů
  - Klávesová navigace (šipky, Enter, Escape)
  - Double-click pro rychlý výběr

**Integrace do SectorPropertiesDialog:**
- Special pole nahrazeno tlačítkem s preview názvu efektu
- Klik otevře Effect Browser
- Zobrazuje `getEffectName()` pro překlad ID na text

**Nové soubory:**
- `www/src/data/sectorEffects.ts`
- `www/src/components/dialogs/EffectBrowserDialog.tsx`

**Soubory změněné:**
- `www/src/components/dialogs/SectorPropertiesDialog.tsx`
