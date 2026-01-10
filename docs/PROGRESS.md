# UDMF Doom Map Editor - Progress Tracker

## Workflow

```
1. Implementace → 2. Test v prohlížeči → 3. Commit → 4. Deploy (make deploy-dev)
```

### Denní workflow
1. Zkontrolovat PROGRESS.md - co je rozpracované
2. Implementovat další feature/fix
3. Otestovat lokálně (`npm run dev`)
4. Commit změn
5. Deploy na https://udmf.yrx.cz (`make deploy-dev`)

### Git workflow
- `main` branch = stabilní verze
- Feature branches pro větší změny
- Commit messages: `feat:`, `fix:`, `refactor:`, `docs:`

---

## Fáze 1: Základy

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

## Fáze 2: Interakce

| Task | Status | Notes |
|------|--------|-------|
| Selection system | ✅ | SelectionManager with box selection |
| Vertex mode | ✅ | Select, move, create, delete, merge, join |
| Linedef mode | ✅ | Select, move, flip, delete |
| Sector mode | ✅ | Select, highlight (basic) |
| Undo/redo system | ✅ | ActionStack with Ctrl+Z/Y |
| Keyboard shortcuts | ✅ | V/L/S/T for modes, G for grid, Ctrl+Z/Y undo/redo |

## Fáze 3: Editace

| Task | Status | Notes |
|------|--------|-------|
| Draw mode (Lines) | ✅ | RMB začne, LMB pokračuje, RMB/Escape ukončí |
| Sector detection | ✅ | Shift+B nebo toolbar button, SectorBuilder |
| Thing mode | ✅ | RMB insert+drag, Delete key, hover drag |
| Sector mode | ✅ | Box selection, Delete key, hover drag |
| Vertex mode | ✅ | Merge (Shift+M), Join (J), hover drag |
| Linedef mode | ✅ | Split (Shift+S), Curve (Shift+C), hover drag |
| Properties panels | ✅ | Vertex, Linedef, Sector, Thing dialogs |
| Map format selection | ✅ | Boom Doom/Doom2, Hexen, ZDoom, ZDaemon |
| Session management | ✅ | Save/Load sessions, clear all data |

## Fáze 4: Pokročilé

| Task | Status | Notes |
|------|--------|-------|
| Texture browser | ✅ | Virtuální scrolling, kategorie, vyhledávání |
| Texture selector | ✅ | Inline preview, click/right-click |
| FLAT texture display | ✅ | Floor/ceiling view mode zobrazuje textury |
| Thing type picker | ✅ | Kategorizovaný výběr thing typů |
| ScrubInput komponenta | ✅ | Photoshop-style drag-to-change hodnoty |
| Auto texture alignment | ✅ | Shift+A, auto-align along connected walls |
| Copy/paste | ✅ | Ctrl+C/X/V, Delete, s remapováním ID |
| WAD export (Hexen) | ✅ | Toolbar + Ctrl+Shift+S |
| BEHAVIOR lump | ✅ | Import/export preservation (passthrough) |
| SCRIPTS lump | ✅ | ACS source code preservation |
| 3D preview | 🔲 | |

## Fáze 5: Export & Polish

| Task | Status | Notes |
|------|--------|-------|
| WAD Writer | ✅ | Export mapy do WAD (Doom/Hexen format) |
| UDMF export | 🔲 | Textový formát pro ZDoom |
| Minimap | 🔲 | |
| Preferences | 🔲 | |
| Custom keybindings | 🔲 | |
| Performance optimization | 🔲 | |
| Error handling | 🔲 | |

## Known Issues / TODO

| Issue | Priority | Notes |
|-------|----------|-------|
| Sector drawing mode | Low | RMB na prázdno v SectorMode - možnost kreslit sektory |
| DrawMode v Toolbar | Low | Viewport má placeholder 'draw' mód |
| Wall texture display | Medium | Zobrazení wall textur na linedefech (3D preview) |

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

**Evening update (late night with kratom 😄):**
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
- Successfully deployed to https://udmf.yrx.cz

### 2026-01-10 (Session 2)

**Map Format & Selection:**
- Nový `MapFormat.ts` - definice formátů (doom, boom_doom, boom_doom2, hexen, zdoom_hexen, zdaemon)
- `MapSelectionDialog.tsx` - výběr mapy z WAD s autodetekce formátu
- `NewMapDialog.tsx` - vytvoření nové mapy s výběrem formátu
- Fix: WAD reader správně čte pouze lumpy pro vybranou mapu (ne až poslední)

**Edit Modes - UX opravy:**
- `LinedefMode.ts`:
  - Right-click na prázdné místo začne kreslení nové linie
  - Left-click pokračuje v kreslení
  - Right-click znovu nebo Escape zruší kreslení
  - Metody: `startDrawing()`, `continueDrawing()`, `cancelDrawing()`
- `ThingMode.ts`:
  - Right-click vloží nový thing
  - Delete/Backspace smaže vybrané things
  - Drag s undo/redo support (`MoveThingsAction`)
  - Metody: `insertThing()`, `deleteSelected()`
- `SectorMode.ts`:
  - Box selection (click + drag na prázdné místo)
  - Delete/Backspace smaže vybrané sektory
  - Metody: `startBoxSelect()`, `finishBoxSelect()`, `deleteSelected()`

**Actions:**
- `ThingActions.ts` - CreateThingAction, DeleteThingsAction, MoveThingsAction
- `SectorActions.ts` - DeleteSectorsAction (s kaskádovým mazáním sidedef/linedef)

**UI/UX:**
- Toolbar s DoomBuilderX ikonami (`/public/icons/`)
- `Icon.tsx`, `IconButton.tsx` komponenty
- Toggle tlačítka pro Grid, Vertices, Things display
- Clear All Data tlačítko (vymaže vše z localStorage)
- Oprava PIXI renderingu - explicitní `app.render()` volání

**Fixes:**
- `WadReader.findMapLumps()` - správně detekuje konec mapy (kontrola MAP/ExMx patternů)
- Renderer toggle visibility - přidán `app.render()` pro PIXI refresh

**Known Issues:**
- ~~🔄 Line drawing right-click - vyžaduje další ladění~~ ✅ Opraveno

### 2026-01-10 (Session 3)

**Overlay System - Vizuální feedback:**
- `OverlayState` interface v `interfaces.ts` - definuje selectionBox a drawingLine
- `OverlayLayer.ts` - vykresluje:
  - Selection box (modrý obdélník s průhlednou výplní)
  - Drawing line preview (zelená čára s kruhy na koncích)
- Všechny módy implementují `getOverlayState()`:
  - VertexMode, LinedefMode, SectorMode, ThingMode
- `ModeManager.getOverlayState()` - agreguje overlay state z aktuálního módu
- `EditorController.getOverlayState()` - exponuje pro Viewport
- `Viewport.tsx` - předává overlay state do rendereru

**Změny v módech:**
- Přidán `currentMousePos` tracking ve všech módech
- LinedefMode má speciální `getDrawingLineState()` pro drawing preview

**Renderer:**
- `RenderOptions` rozšířen o `drawingLine`
- `render()` předává oba overlay typy do `OverlayLayer`
- Přidán `app.render()` pro PIXI refresh

### 2026-01-10 (Session 4) - UX Vylepšení

**Implementace podle UX.md:**

**TextureBrowserDialog - kompletní redesign:**
- Virtuální scrolling pomocí `react-window` - renderuje jen viditelné textury
- Category filter dropdown - All/Flats/Textures/Used in Map/Unused
- Klávesová navigace šipkami v gridu
- Počítadlo položek a rozměry vybrané textury
- Nové závislosti: `react-window`, `@types/react-window`

**SectorPropertiesDialog vylepšení:**
- Prohozené pozice floor/ceiling (ceiling nahoře, floor dole - logické rozložení)
- Nová `ScrubInput` komponenta s Photoshop-style scrubbing
- Táhni na labelu pro změnu hodnoty (Shift: fine, Ctrl: fast)
- Scroll wheel na inputech pro jemnou kontrolu
- Zobrazení výšky sektoru (ceiling - floor)

**StatusBar vylepšení:**
- Zobrazení pozice kurzoru (X/Y)
- Zobrazuje snapped pozici když je grid snap aktivní
- Nový `cursorPosition` state v `editorStore`

**LinedefLayer vylepšení:**
- Direction ticks na VŠECH linedefs (ne jen single-sided)
- Kratší tick (4px) pro two-sided linedefs
- Delší tick (8px) pro one-sided linedefs

**Nové klávesové zkratky v LinedefMode:**
- `Shift+S` - Split Linedef (rozdělí uprostřed)
- `Shift+C` - Curve Linedef (vytvoří Bezier křivku s 8 segmenty)
- Obě akce dostupné i v kontextovém menu

**Nové Actions:**
- `CurveLinedefAction` - vytvoří zakřivenou linii pomocí kvadratické Bezier křivky
- Plně reversibilní (undo/redo support)

**Nové komponenty:**
- `ScrubInput.tsx` - číselný input s drag-to-change a wheel support
- `NumericInput.tsx` - jednodušší verze bez label scrubbing

**Soubory změněné:**
- `www/src/components/dialogs/TextureBrowserDialog.tsx`
- `www/src/components/dialogs/SectorPropertiesDialog.tsx`
- `www/src/components/common/ScrubInput.tsx` (nový)
- `www/src/components/editor/StatusBar.tsx`
- `www/src/components/editor/Viewport.tsx`
- `www/src/store/editorStore.ts`
- `www/src/renderer/layers/LinedefLayer.ts`
- `www/src/core/editing/modes/LinedefMode.ts`
- `www/src/core/editing/actions/VertexActions.ts`
- `www/package.json` (nové závislosti)

### 2026-01-10 (Session 5) - Sector Detection

**Sector Detection implementace:**
- `SectorBuilder.ts` - detekce uzavřených smyček z linedefs
- `DetectSectorsAction` - action pro undo/redo (v SectorActions.ts)
- Toolbar tlačítko "Detect Sectors from Closed Lines"
- Klávesová zkratka `Shift+B`

**Jak funguje:**
- Prochází všechny vertexy a hledá uzavřené polygony
- Určuje winding (clockwise/counter-clockwise) pro front/back side
- Automaticky vytváří sidedefs a přiřazuje k linedefům
- Nastavuje TWOSIDED flag pro two-sided linedefs

**react-window v2 migrace:**
- Opraveny importy pro react-window v2 (FixedSizeGrid → Grid)
- Nové API: `cellComponent`, `cellProps`, `gridRef`, `defaultWidth/Height`
- `CellComponentProps` místo `GridChildComponentProps`

**Soubory změněné:**
- `www/src/core/editing/actions/SectorActions.ts` (DetectSectorsAction)
- `www/src/components/editor/Toolbar.tsx` (handleDetectSectors)
- `www/src/App.tsx` (Shift+B shortcut)
- `www/src/components/dialogs/TextureBrowserDialog.tsx` (react-window v2)

### 2026-01-10 (Session 5 - pokračování)

**Auto sector detection při kreslení:**
- Po uzavření smyčky (připojení k existujícímu vertexu) se automaticky detekují sektory
- `LinedefMode.continueDrawing()` - kontroluje jestli se připojujeme k existujícímu vertexu
- `tryCreateSectorsFromNewLinedef()` - spustí detekci pokud existují linedefs bez sidedefů

**SectorBuilder vylepšení:**
- `createSectorFromLoop()` - přeskakuje smyčky které už mají sektory přiřazené
- Kontrola `allSidesAssigned` - nedetekuje znovu existující sektory
- Skip linedefs které už mají příslušný sidedef

**Soubory změněné:**
- `www/src/core/editing/modes/LinedefMode.ts` (auto sector detection)
- `www/src/core/geometry/SectorBuilder.ts` (skip existing sectors)

### 2026-01-10 (Session 6) - RMB Hover Drag & FLAT Textures

**RMB Hover+Drag UX (inspirováno DoomBuilder/origo):**
- Nové chování: RMB + hover bez výběru = dočasně vybrat, přetáhnout, po puštění odznačit
- Implementováno ve všech 4 módech:
  - `VertexMode.ts` - `rmbHoverDragVertexId`
  - `LinedefMode.ts` - `rmbHoverDragLinedefId`
  - `SectorMode.ts` - `rmbHoverDragSectorId`
  - `ThingMode.ts` - `rmbHoverDragThingId`
- Po `finishDrag()` nebo `cancelDrag()` se hover-drag element odznačí
- RMB click (bez pohybu) stále otevírá properties dialog

**ThingMode - RMB Insert + Drag:**
- RMB na prázdné místo = vytvoří thing AND začne ho táhnout
- Metoda `insertThingAndDrag()` - kombinuje vytvoření s okamžitým drag
- Po puštění se thing odznačí (hover drag behavior)
- Použije `lastThingType` z editor state (nebo default 1 = Player 1 start)

**FLAT textury ve viewportu:**
- `SectorLayer.ts` - async loading textur pro PIXI v8:
  - `pendingTextures` set pro tracking načítání
  - `setTextureLoadedCallback()` pro trigger re-render po načtení
  - Image → Canvas → PIXI.Texture (kompatibilní s PIXI v8)
- `Renderer.ts` - propojení callback pro re-render
- `invalidateTextureCache()` metoda pro změnu WAD
- Textury se zobrazují v floor/ceiling view mode

**TextureBrowserDialog - scrolling fix:**
- Přidán explicit `height: gridHeight` na container
- `overflow: auto` na Grid komponentu
- Oprava pro react-window v2 virtualizaci

**Soubory změněné:**
- `www/src/core/editing/modes/VertexMode.ts`
- `www/src/core/editing/modes/LinedefMode.ts`
- `www/src/core/editing/modes/SectorMode.ts`
- `www/src/core/editing/modes/ThingMode.ts`
- `www/src/renderer/layers/SectorLayer.ts`
- `www/src/renderer/Renderer.ts`
- `www/src/components/dialogs/TextureBrowserDialog.tsx`

### 2026-01-10 (Session 7) - WAD Export

**WAD Writer implementace:**
- `WadWriter.ts` - vytváří PWAD soubory z lumpů
  - Header (PWAD magic, počet lumpů, offset directory)
  - Lump data + directory
  - `download()` metoda pro stažení v prohlížeči
- `MapWriter.ts` - konvertuje MapData na binární WAD lumpy
  - Podporuje Doom i Hexen formát
  - Správné remapování ID (vertices, sidedefs, sectors)
  - Generuje prázdný BEHAVIOR lump pro Hexen

**UI/UX:**
- Toolbar tlačítko "Export to WAD" (ikona Test)
- Klávesová zkratka `Ctrl+Shift+S`
- Export stáhne `mapname.wad` soubor

**Nové soubory:**
- `www/src/io/wad/WadWriter.ts`
- `www/src/io/map/MapWriter.ts`

**Soubory změněné:**
- `www/src/store/mapStore.ts` - `exportToWad()` metoda
- `www/src/components/editor/Toolbar.tsx` - export tlačítko
- `www/src/App.tsx` - Ctrl+Shift+S zkratka

### 2026-01-10 (Session 8) - Copy/Paste

**Copy/Paste implementace:**
- `clipboardStore.ts` - Zustand store pro clipboard data
- `CopyPasteManager.ts` - centrální logika pro copy/paste operace:
  - `copy()` - kopíruje vybrané elementy včetně souvisejících
    - Vertices → kopíruje jen vertexy
    - Linedefs → kopíruje linedefs + jejich vertexy + sidedefs
    - Sectors → kopíruje sektory + linedefs + sidedefs + vertexy
    - Things → kopíruje things
  - `paste()` - vloží na pozici kurzoru s remapováním ID
  - `cut()` - copy + delete
  - `deleteSelection()` - smaže vybrané elementy s kaskádou

**Klávesové zkratky:**
- `Ctrl+C` - Copy
- `Ctrl+X` - Cut
- `Ctrl+V` - Paste (na pozici kurzoru)
- `Delete` / `Backspace` - Smazat výběr

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
