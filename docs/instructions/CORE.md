# INSTRUCTIONS_CORE.md
# Doom Map Editor - Core Architecture & Implementation Guide

## Přehled projektu

Cílem je vytvořit webový editor Doom map na úrovni Ultimate Doom Builder (UDB). Editor bude podporovat Doom-in-Hexen formát pro ZDaemon a další ZDoom-family source porty.

---

## Technologický stack

| Vrstva | Technologie | Účel |
|--------|-------------|------|
| UI Framework | React 18+ | Toolbary, panely, dialogy |
| State Management | Zustand | Globální stav editoru |
| Rendering | PixiJS 8 | WebGL canvas rendering |
| Spatial Indexing | rbush | Rychlé vyhledávání objektů |
| Geometry | earcut + custom | Triangulace sektorů |
| File I/O | Custom binary parsers | WAD import/export |
| Styling | Tailwind CSS | UI komponenty |

---

## Architektura

```
┌─────────────────────────────────────────────────────────────────┐
│                         React Application                        │
│  ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────────────┐│
│  │  Toolbar  │ │  Sidebar  │ │ Properties│ │    Status Bar     ││
│  │           │ │ (layers,  │ │  Panel    │ │ (coords, grid,    ││
│  │           │ │  things)  │ │           │ │  zoom, mode)      ││
│  └───────────┘ └───────────┘ └───────────┘ └───────────────────┘│
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                     Viewport Component                       ││
│  │  ┌─────────────────────────────────────────────────────────┐││
│  │  │                    PixiJS Canvas                        │││
│  │  │                                                         │││
│  │  │   [Grid Layer] → [Sector Layer] → [Line Layer] →       │││
│  │  │   [Vertex Layer] → [Thing Layer] → [Overlay Layer]     │││
│  │  │                                                         │││
│  │  └─────────────────────────────────────────────────────────┘││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        Editor Core                               │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌────────────┐ │
│  │  MapStore   │ │ActionSystem │ │ Selection   │ │   Mode     │ │
│  │  (Zustand)  │ │(Undo/Redo)  │ │  Manager    │ │  Manager   │ │
│  └──────┬──────┘ └──────┬──────┘ └──────┬──────┘ └─────┬──────┘ │
│         │               │               │              │        │
│         ▼               ▼               ▼              ▼        │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                     Map Data Model                          ││
│  │  vertices: Map<id, Vertex>                                  ││
│  │  linedefs: Map<id, Linedef>                                 ││
│  │  sidedefs: Map<id, Sidedef>                                 ││
│  │  sectors:  Map<id, Sector>                                  ││
│  │  things:   Map<id, Thing>                                   ││
│  └─────────────────────────────────────────────────────────────┘│
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                    Spatial Index                            ││
│  │  vertexTree:  RBush<VertexBBox>                             ││
│  │  linedefTree: RBush<LinedefBBox>                            ││
│  │  sectorTree:  RBush<SectorBBox>                             ││
│  │  thingTree:   RBush<ThingBBox>                              ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

---

## Adresářová struktura

```
src/
├── app/                      # Next.js app router (nebo CRA entry)
│   ├── layout.tsx
│   └── page.tsx
│
├── components/
│   ├── ui/                   # Základní UI komponenty
│   │   ├── Button.tsx
│   │   ├── Panel.tsx
│   │   ├── Dropdown.tsx
│   │   └── Modal.tsx
│   │
│   ├── editor/               # Editor-specific komponenty
│   │   ├── Viewport.tsx      # Hlavní canvas wrapper
│   │   ├── Toolbar.tsx       # Horní toolbar
│   │   ├── Sidebar.tsx       # Levý panel (layers, things palette)
│   │   ├── PropertiesPanel.tsx
│   │   ├── StatusBar.tsx
│   │   └── Minimap.tsx
│   │
│   └── dialogs/              # Modální dialogy
│       ├── MapSettingsDialog.tsx
│       ├── SectorPropertiesDialog.tsx
│       ├── LinedefPropertiesDialog.tsx
│       └── ThingPropertiesDialog.tsx
│
├── core/                     # Editor jádro (framework-agnostic)
│   ├── map/
│   │   ├── types.ts          # Vertex, Linedef, Sector, Thing interfaces
│   │   ├── MapData.ts        # Hlavní datová struktura
│   │   ├── MapOperations.ts  # CRUD operace nad mapou
│   │   └── MapValidator.ts   # Validace integrity mapy
│   │
│   ├── geometry/
│   │   ├── math.ts           # Vec2, intersections, distances
│   │   ├── triangulation.ts  # Sector triangulace (earcut wrapper)
│   │   ├── polygon.ts        # Polygon operations
│   │   └── spatial.ts        # RBush wrapper
│   │
│   ├── actions/
│   │   ├── Action.ts         # Base action interface
│   │   ├── ActionStack.ts    # Undo/redo stack
│   │   ├── VertexActions.ts  # Move, merge, split vertex
│   │   ├── LinedefActions.ts # Split, flip, delete line
│   │   ├── SectorActions.ts  # Create, merge, adjust heights
│   │   └── ThingActions.ts   # Place, move, rotate things
│   │
│   ├── modes/
│   │   ├── Mode.ts           # Base mode interface
│   │   ├── VertexMode.ts     # Vertex editing mode
│   │   ├── LinedefMode.ts    # Line editing mode
│   │   ├── SectorMode.ts     # Sector editing mode
│   │   ├── ThingMode.ts      # Thing placement mode
│   │   └── DrawMode.ts       # Line drawing mode
│   │
│   ├── selection/
│   │   ├── Selection.ts      # Selection state
│   │   └── SelectionOps.ts   # Box select, flood select
│   │
│   └── tools/
│       ├── GridSnap.ts       # Grid snapping logic
│       ├── AutoAlign.ts      # Texture auto-alignment
│       └── SectorBuilder.ts  # Auto sector detection
│
├── renderer/                 # PixiJS rendering
│   ├── Renderer.ts           # Main renderer class
│   ├── Camera.ts             # Pan, zoom, coordinate transforms
│   ├── layers/
│   │   ├── GridLayer.ts
│   │   ├── SectorLayer.ts
│   │   ├── LinedefLayer.ts
│   │   ├── VertexLayer.ts
│   │   ├── ThingLayer.ts
│   │   └── OverlayLayer.ts   # Selection highlights, guides
│   │
│   └── shaders/              # Custom WebGL shaders (optional)
│       └── sector.frag
│
├── io/                       # File I/O
│   ├── wad/
│   │   ├── WadReader.ts      # WAD parsing
│   │   ├── WadWriter.ts      # WAD generation
│   │   └── WadTypes.ts       # WAD structure types
│   │
│   ├── map/
│   │   ├── DoomMapReader.ts  # Doom format parser
│   │   ├── HexenMapReader.ts # Hexen format parser
│   │   ├── HexenMapWriter.ts # Hexen format writer
│   │   └── BehaviorLump.ts   # ACS behavior handling
│   │
│   └── textures/
│       ├── TextureManager.ts
│       └── PatchComposer.ts
│
├── store/                    # Zustand stores
│   ├── mapStore.ts           # Map data state
│   ├── editorStore.ts        # Editor UI state (mode, grid, zoom)
│   ├── selectionStore.ts     # Current selection
│   └── historyStore.ts       # Undo/redo history
│
├── config/
│   ├── editorConfig.ts       # Default settings
│   ├── thingDefinitions.ts   # Thing types (DoomEdNums)
│   ├── linedefSpecials.ts    # Linedef action specials
│   └── sectorTypes.ts        # Sector specials
│
└── utils/
    ├── binary.ts             # Binary read/write helpers
    ├── colors.ts             # Color utilities
    └── keyboard.ts           # Keyboard shortcut handling
```

---

## Datové struktury

### Základní typy

```typescript
// src/core/map/types.ts

export interface Vec2 {
  x: number;
  y: number;
}

export interface BBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export interface Vertex {
  id: number;
  x: number;
  y: number;
  // Computed/cached
  linedefs: Set<number>;  // Linedefs using this vertex
}

export interface Linedef {
  id: number;
  v1: number;             // Start vertex ID
  v2: number;             // End vertex ID
  flags: number;
  special: number;        // Action special (Hexen)
  args: [number, number, number, number, number];  // Hexen args
  frontSidedef: number | null;
  backSidedef: number | null;
  // Computed
  frontSector: number | null;
  backSector: number | null;
}

export interface Sidedef {
  id: number;
  offsetX: number;
  offsetY: number;
  upperTexture: string;   // 8 chars max, "-" for none
  lowerTexture: string;
  middleTexture: string;
  sector: number;         // Sector ID
}

export interface Sector {
  id: number;
  floorHeight: number;
  ceilingHeight: number;
  floorTexture: string;   // 8 chars max
  ceilingTexture: string;
  lightLevel: number;     // 0-255
  special: number;
  tag: number;
  // Computed
  linedefs: Set<number>;
  boundingBox: BBox | null;
  triangles: number[] | null;  // For rendering
}

export interface Thing {
  id: number;
  tid: number;            // Thing ID (Hexen)
  x: number;
  y: number;
  z: number;              // Height above floor (Hexen)
  angle: number;          // 0-359
  type: number;           // Editor number (DoomEdNum)
  flags: number;
  special: number;        // Action special (Hexen)
  args: [number, number, number, number, number];
}

// Hexen-specific flags
export const LinedefFlags = {
  BLOCKING:       0x0001,
  BLOCKMONSTERS:  0x0002,
  TWOSIDED:       0x0004,
  UPPERUNPEGGED:  0x0008,
  LOWERUNPEGGED:  0x0010,
  SECRET:         0x0020,
  BLOCKSOUND:     0x0040,
  NOTONMAP:       0x0080,
  ALREADYONMAP:   0x0100,
  REPEATABLE:     0x0200,
  // Activation bits 10-12
  ACTIVATION_MASK: 0x1C00,
} as const;

export const ActivationType = {
  PLAYER_CROSSES:     0,
  PLAYER_USES:        1,
  MONSTER_CROSSES:    2,
  PROJECTILE_HITS:    3,
  PLAYER_BUMPS:       4,
  PROJECTILE_CROSSES: 5,
  PLAYER_USES_PASSTHROUGH: 6,
} as const;

export const ThingFlags = {
  SKILL_1_2:    0x0001,
  SKILL_3:      0x0002,
  SKILL_4_5:    0x0004,
  AMBUSH:       0x0008,
  DORMANT:      0x0010,
  FIGHTER:      0x0020,
  CLERIC:       0x0040,
  MAGE:         0x0080,
  SINGLEPLAYER: 0x0100,
  COOP:         0x0200,
  DEATHMATCH:   0x0400,
} as const;
```

### Map Data Class

```typescript
// src/core/map/MapData.ts

import { Vertex, Linedef, Sidedef, Sector, Thing, BBox } from './types';

export class MapData {
  name: string = 'MAP01';
  
  vertices: Map<number, Vertex> = new Map();
  linedefs: Map<number, Linedef> = new Map();
  sidedefs: Map<number, Sidedef> = new Map();
  sectors: Map<number, Sector> = new Map();
  things: Map<number, Thing> = new Map();
  
  private nextVertexId = 0;
  private nextLinedefId = 0;
  private nextSidedefId = 0;
  private nextSectorId = 0;
  private nextThingId = 0;
  
  // ID generators
  allocateVertexId(): number { return this.nextVertexId++; }
  allocateLinedefId(): number { return this.nextLinedefId++; }
  allocateSidedefId(): number { return this.nextSidedefId++; }
  allocateSectorId(): number { return this.nextSectorId++; }
  allocateThingId(): number { return this.nextThingId++; }
  
  // Queries
  getVertexLinedefs(vertexId: number): Linedef[] {
    const vertex = this.vertices.get(vertexId);
    if (!vertex) return [];
    return Array.from(vertex.linedefs)
      .map(id => this.linedefs.get(id))
      .filter((l): l is Linedef => l !== undefined);
  }
  
  getSectorLinedefs(sectorId: number): Linedef[] {
    return Array.from(this.linedefs.values()).filter(l => 
      l.frontSector === sectorId || l.backSector === sectorId
    );
  }
  
  getLinedefVertices(linedef: Linedef): [Vertex, Vertex] | null {
    const v1 = this.vertices.get(linedef.v1);
    const v2 = this.vertices.get(linedef.v2);
    if (!v1 || !v2) return null;
    return [v1, v2];
  }
  
  getBoundingBox(): BBox {
    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;
    
    for (const v of this.vertices.values()) {
      minX = Math.min(minX, v.x);
      minY = Math.min(minY, v.y);
      maxX = Math.max(maxX, v.x);
      maxY = Math.max(maxY, v.y);
    }
    
    return { minX, minY, maxX, maxY };
  }
  
  // Validation
  validate(): string[] {
    const errors: string[] = [];
    
    // Check linedef vertex references
    for (const [id, linedef] of this.linedefs) {
      if (!this.vertices.has(linedef.v1)) {
        errors.push(`Linedef ${id}: invalid v1 reference ${linedef.v1}`);
      }
      if (!this.vertices.has(linedef.v2)) {
        errors.push(`Linedef ${id}: invalid v2 reference ${linedef.v2}`);
      }
    }
    
    // Check sidedef sector references
    for (const [id, sidedef] of this.sidedefs) {
      if (!this.sectors.has(sidedef.sector)) {
        errors.push(`Sidedef ${id}: invalid sector reference ${sidedef.sector}`);
      }
    }
    
    // Check unclosed sectors
    // ... more validation
    
    return errors;
  }
}
```

---

## Rendering System

### Layer Architecture

```typescript
// src/renderer/Renderer.ts

import * as PIXI from 'pixi.js';
import { Camera } from './Camera';
import { GridLayer } from './layers/GridLayer';
import { SectorLayer } from './layers/SectorLayer';
import { LinedefLayer } from './layers/LinedefLayer';
import { VertexLayer } from './layers/VertexLayer';
import { ThingLayer } from './layers/ThingLayer';
import { OverlayLayer } from './layers/OverlayLayer';
import { MapData } from '../core/map/MapData';

export class Renderer {
  app: PIXI.Application;
  camera: Camera;
  
  private gridLayer: GridLayer;
  private sectorLayer: SectorLayer;
  private linedefLayer: LinedefLayer;
  private vertexLayer: VertexLayer;
  private thingLayer: ThingLayer;
  private overlayLayer: OverlayLayer;
  
  private worldContainer: PIXI.Container;
  
  constructor(canvas: HTMLCanvasElement) {
    this.app = new PIXI.Application();
    
    // Initialize async
  }
  
  async init(canvas: HTMLCanvasElement): Promise<void> {
    await this.app.init({
      canvas,
      resizeTo: canvas.parentElement!,
      antialias: true,
      backgroundColor: 0x1a1a2e,
      resolution: window.devicePixelRatio || 1,
    });
    
    this.camera = new Camera(this.app.screen.width, this.app.screen.height);
    
    // World container holds all map content
    this.worldContainer = new PIXI.Container();
    this.app.stage.addChild(this.worldContainer);
    
    // Create layers in render order (back to front)
    this.gridLayer = new GridLayer();
    this.sectorLayer = new SectorLayer();
    this.linedefLayer = new LinedefLayer();
    this.vertexLayer = new VertexLayer();
    this.thingLayer = new ThingLayer();
    this.overlayLayer = new OverlayLayer();
    
    this.worldContainer.addChild(this.gridLayer.container);
    this.worldContainer.addChild(this.sectorLayer.container);
    this.worldContainer.addChild(this.linedefLayer.container);
    this.worldContainer.addChild(this.vertexLayer.container);
    this.worldContainer.addChild(this.thingLayer.container);
    this.worldContainer.addChild(this.overlayLayer.container);
  }
  
  updateCamera(): void {
    this.worldContainer.position.set(
      this.app.screen.width / 2 - this.camera.x * this.camera.zoom,
      this.app.screen.height / 2 + this.camera.y * this.camera.zoom // Y flipped
    );
    this.worldContainer.scale.set(this.camera.zoom, -this.camera.zoom);
  }
  
  render(map: MapData): void {
    this.gridLayer.render(this.camera);
    this.sectorLayer.render(map, this.camera);
    this.linedefLayer.render(map, this.camera);
    this.vertexLayer.render(map, this.camera);
    this.thingLayer.render(map, this.camera);
  }
  
  // Screen to world coordinates
  screenToWorld(screenX: number, screenY: number): { x: number; y: number } {
    return this.camera.screenToWorld(screenX, screenY, this.app.screen);
  }
  
  // World to screen coordinates
  worldToScreen(worldX: number, worldY: number): { x: number; y: number } {
    return this.camera.worldToScreen(worldX, worldY, this.app.screen);
  }
  
  destroy(): void {
    this.app.destroy(true);
  }
}
```

### Camera System

```typescript
// src/renderer/Camera.ts

export class Camera {
  x: number = 0;      // World X (center of view)
  y: number = 0;      // World Y (center of view)
  zoom: number = 1;   // Pixels per map unit
  
  readonly minZoom = 0.05;
  readonly maxZoom = 32;
  
  constructor(
    private screenWidth: number,
    private screenHeight: number
  ) {}
  
  pan(dx: number, dy: number): void {
    this.x += dx / this.zoom;
    this.y -= dy / this.zoom; // Screen Y is flipped
  }
  
  zoomAt(factor: number, screenX: number, screenY: number, screen: { width: number; height: number }): void {
    const worldBefore = this.screenToWorld(screenX, screenY, screen);
    
    this.zoom = Math.max(this.minZoom, Math.min(this.maxZoom, this.zoom * factor));
    
    const worldAfter = this.screenToWorld(screenX, screenY, screen);
    
    // Adjust position so point under cursor stays fixed
    this.x += worldBefore.x - worldAfter.x;
    this.y += worldBefore.y - worldAfter.y;
  }
  
  screenToWorld(screenX: number, screenY: number, screen: { width: number; height: number }): { x: number; y: number } {
    return {
      x: this.x + (screenX - screen.width / 2) / this.zoom,
      y: this.y - (screenY - screen.height / 2) / this.zoom,
    };
  }
  
  worldToScreen(worldX: number, worldY: number, screen: { width: number; height: number }): { x: number; y: number } {
    return {
      x: screen.width / 2 + (worldX - this.x) * this.zoom,
      y: screen.height / 2 - (worldY - this.y) * this.zoom,
    };
  }
  
  getVisibleBounds(screen: { width: number; height: number }): { minX: number; minY: number; maxX: number; maxY: number } {
    const halfW = screen.width / 2 / this.zoom;
    const halfH = screen.height / 2 / this.zoom;
    return {
      minX: this.x - halfW,
      maxX: this.x + halfW,
      minY: this.y - halfH,
      maxY: this.y + halfH,
    };
  }
  
  fitToBounds(bounds: { minX: number; minY: number; maxX: number; maxY: number }, screen: { width: number; height: number }, padding = 50): void {
    const boundsWidth = bounds.maxX - bounds.minX;
    const boundsHeight = bounds.maxY - bounds.minY;
    
    this.x = (bounds.minX + bounds.maxX) / 2;
    this.y = (bounds.minY + bounds.maxY) / 2;
    
    const zoomX = (screen.width - padding * 2) / boundsWidth;
    const zoomY = (screen.height - padding * 2) / boundsHeight;
    
    this.zoom = Math.max(this.minZoom, Math.min(this.maxZoom, Math.min(zoomX, zoomY)));
  }
}
```

### Example Layer: LinedefLayer

```typescript
// src/renderer/layers/LinedefLayer.ts

import * as PIXI from 'pixi.js';
import { MapData, Linedef, LinedefFlags } from '../../core/map/types';
import { Camera } from '../Camera';

export class LinedefLayer {
  container: PIXI.Container;
  private graphics: PIXI.Graphics;
  
  // Color scheme
  private readonly colors = {
    oneSided: 0xffffff,
    twoSided: 0x808080,
    actionSpecial: 0xffff00,
    selected: 0xff8800,
    highlighted: 0x00ffff,
  };
  
  constructor() {
    this.container = new PIXI.Container();
    this.graphics = new PIXI.Graphics();
    this.container.addChild(this.graphics);
  }
  
  render(map: MapData, camera: Camera, selectedIds?: Set<number>, highlightedId?: number): void {
    this.graphics.clear();
    
    // Adjust line width based on zoom
    const baseWidth = Math.max(1, 2 / camera.zoom);
    
    for (const [id, linedef] of map.linedefs) {
      const v1 = map.vertices.get(linedef.v1);
      const v2 = map.vertices.get(linedef.v2);
      if (!v1 || !v2) continue;
      
      let color = this.getLineColor(linedef, selectedIds?.has(id), highlightedId === id);
      let width = baseWidth;
      
      if (selectedIds?.has(id)) {
        width = baseWidth * 1.5;
      }
      if (highlightedId === id) {
        width = baseWidth * 2;
      }
      
      this.graphics
        .moveTo(v1.x, v1.y)
        .lineTo(v2.x, v2.y)
        .stroke({ width, color });
      
      // Draw direction tick for one-sided lines
      if (!linedef.backSidedef) {
        this.drawDirectionTick(v1, v2, color, baseWidth);
      }
    }
  }
  
  private getLineColor(linedef: Linedef, selected: boolean, highlighted: boolean): number {
    if (highlighted) return this.colors.highlighted;
    if (selected) return this.colors.selected;
    if (linedef.special !== 0) return this.colors.actionSpecial;
    if (linedef.backSidedef === null) return this.colors.oneSided;
    return this.colors.twoSided;
  }
  
  private drawDirectionTick(v1: { x: number; y: number }, v2: { x: number; y: number }, color: number, width: number): void {
    const midX = (v1.x + v2.x) / 2;
    const midY = (v1.y + v2.y) / 2;
    
    const dx = v2.x - v1.x;
    const dy = v2.y - v1.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len === 0) return;
    
    // Perpendicular direction (right side of line)
    const nx = -dy / len;
    const ny = dx / len;
    
    const tickLen = 8;
    
    this.graphics
      .moveTo(midX, midY)
      .lineTo(midX + nx * tickLen, midY + ny * tickLen)
      .stroke({ width, color });
  }
}
```

---

## Action/Undo System

```typescript
// src/core/actions/Action.ts

export interface Action {
  readonly name: string;
  execute(): void;
  undo(): void;
}

// src/core/actions/ActionStack.ts

export class ActionStack {
  private undoStack: Action[] = [];
  private redoStack: Action[] = [];
  private maxSize = 100;
  
  execute(action: Action): void {
    action.execute();
    this.undoStack.push(action);
    this.redoStack = []; // Clear redo on new action
    
    if (this.undoStack.length > this.maxSize) {
      this.undoStack.shift();
    }
  }
  
  undo(): Action | null {
    const action = this.undoStack.pop();
    if (!action) return null;
    
    action.undo();
    this.redoStack.push(action);
    return action;
  }
  
  redo(): Action | null {
    const action = this.redoStack.pop();
    if (!action) return null;
    
    action.execute();
    this.undoStack.push(action);
    return action;
  }
  
  canUndo(): boolean { return this.undoStack.length > 0; }
  canRedo(): boolean { return this.redoStack.length > 0; }
  
  clear(): void {
    this.undoStack = [];
    this.redoStack = [];
  }
}

// src/core/actions/VertexActions.ts

import { MapData, Vertex } from '../map/types';
import { Action } from './Action';

export class MoveVerticesAction implements Action {
  readonly name = 'Move Vertices';
  
  constructor(
    private map: MapData,
    private vertexIds: number[],
    private dx: number,
    private dy: number
  ) {}
  
  execute(): void {
    for (const id of this.vertexIds) {
      const vertex = this.map.vertices.get(id);
      if (vertex) {
        vertex.x += this.dx;
        vertex.y += this.dy;
      }
    }
  }
  
  undo(): void {
    for (const id of this.vertexIds) {
      const vertex = this.map.vertices.get(id);
      if (vertex) {
        vertex.x -= this.dx;
        vertex.y -= this.dy;
      }
    }
  }
}

export class CreateVertexAction implements Action {
  readonly name = 'Create Vertex';
  private createdId: number | null = null;
  
  constructor(
    private map: MapData,
    private x: number,
    private y: number
  ) {}
  
  execute(): void {
    const id = this.map.allocateVertexId();
    const vertex: Vertex = {
      id,
      x: this.x,
      y: this.y,
      linedefs: new Set(),
    };
    this.map.vertices.set(id, vertex);
    this.createdId = id;
  }
  
  undo(): void {
    if (this.createdId !== null) {
      this.map.vertices.delete(this.createdId);
    }
  }
  
  getCreatedId(): number | null {
    return this.createdId;
  }
}
```

---

## Editor Modes

```typescript
// src/core/modes/Mode.ts

import { MapData } from '../map/MapData';
import { Renderer } from '../../renderer/Renderer';
import { ActionStack } from '../actions/ActionStack';

export interface ModeContext {
  map: MapData;
  renderer: Renderer;
  actions: ActionStack;
  selection: SelectionManager;
  gridSize: number;
  snapToGrid: boolean;
}

export interface Mode {
  readonly name: string;
  readonly cursor: string;
  
  onEnter(context: ModeContext): void;
  onExit(context: ModeContext): void;
  
  onMouseDown(event: MouseEvent, worldPos: { x: number; y: number }, context: ModeContext): void;
  onMouseMove(event: MouseEvent, worldPos: { x: number; y: number }, context: ModeContext): void;
  onMouseUp(event: MouseEvent, worldPos: { x: number; y: number }, context: ModeContext): void;
  onKeyDown(event: KeyboardEvent, context: ModeContext): void;
  
  render(context: ModeContext): void;  // Mode-specific overlay rendering
}

// src/core/modes/VertexMode.ts

export class VertexMode implements Mode {
  readonly name = 'Vertices';
  readonly cursor = 'crosshair';
  
  private dragging = false;
  private dragStart: { x: number; y: number } | null = null;
  private originalPositions: Map<number, { x: number; y: number }> = new Map();
  
  onEnter(context: ModeContext): void {
    // Highlight vertices in renderer
  }
  
  onExit(context: ModeContext): void {
    this.dragging = false;
  }
  
  onMouseDown(event: MouseEvent, worldPos: { x: number; y: number }, context: ModeContext): void {
    const snapped = this.snap(worldPos, context);
    
    // Find vertex under cursor
    const vertex = context.map.findVertexNear(snapped.x, snapped.y, 8 / context.renderer.camera.zoom);
    
    if (event.button === 0) { // Left click
      if (vertex) {
        if (!event.shiftKey && !context.selection.vertices.has(vertex.id)) {
          context.selection.clear();
        }
        context.selection.addVertex(vertex.id);
        
        // Start drag
        this.dragging = true;
        this.dragStart = snapped;
        this.saveOriginalPositions(context);
      } else if (!event.shiftKey) {
        context.selection.clear();
      }
    }
  }
  
  onMouseMove(event: MouseEvent, worldPos: { x: number; y: number }, context: ModeContext): void {
    const snapped = this.snap(worldPos, context);
    
    if (this.dragging && this.dragStart) {
      const dx = snapped.x - this.dragStart.x;
      const dy = snapped.y - this.dragStart.y;
      
      // Live preview (don't create action yet)
      for (const [id, orig] of this.originalPositions) {
        const vertex = context.map.vertices.get(id);
        if (vertex) {
          vertex.x = orig.x + dx;
          vertex.y = orig.y + dy;
        }
      }
      
      context.renderer.render(context.map);
    } else {
      // Highlight vertex under cursor
      const vertex = context.map.findVertexNear(snapped.x, snapped.y, 8 / context.renderer.camera.zoom);
      context.renderer.setHighlightedVertex(vertex?.id ?? null);
    }
  }
  
  onMouseUp(event: MouseEvent, worldPos: { x: number; y: number }, context: ModeContext): void {
    if (this.dragging && this.dragStart) {
      const snapped = this.snap(worldPos, context);
      const dx = snapped.x - this.dragStart.x;
      const dy = snapped.y - this.dragStart.y;
      
      // Restore original positions
      for (const [id, orig] of this.originalPositions) {
        const vertex = context.map.vertices.get(id);
        if (vertex) {
          vertex.x = orig.x;
          vertex.y = orig.y;
        }
      }
      
      // Create undoable action if actually moved
      if (dx !== 0 || dy !== 0) {
        const action = new MoveVerticesAction(
          context.map,
          Array.from(this.originalPositions.keys()),
          dx,
          dy
        );
        context.actions.execute(action);
      }
    }
    
    this.dragging = false;
    this.dragStart = null;
    this.originalPositions.clear();
  }
  
  onKeyDown(event: KeyboardEvent, context: ModeContext): void {
    if (event.key === 'Delete') {
      // Delete selected vertices
      const action = new DeleteVerticesAction(
        context.map,
        Array.from(context.selection.vertices)
      );
      context.actions.execute(action);
      context.selection.clear();
    }
  }
  
  render(context: ModeContext): void {
    // Draw selection box if box-selecting
  }
  
  private snap(pos: { x: number; y: number }, context: ModeContext): { x: number; y: number } {
    if (!context.snapToGrid) return pos;
    return {
      x: Math.round(pos.x / context.gridSize) * context.gridSize,
      y: Math.round(pos.y / context.gridSize) * context.gridSize,
    };
  }
  
  private saveOriginalPositions(context: ModeContext): void {
    this.originalPositions.clear();
    for (const id of context.selection.vertices) {
      const vertex = context.map.vertices.get(id);
      if (vertex) {
        this.originalPositions.set(id, { x: vertex.x, y: vertex.y });
      }
    }
  }
}
```

---

## Zustand Stores

```typescript
// src/store/mapStore.ts

import { create } from 'zustand';
import { MapData } from '../core/map/MapData';

interface MapState {
  map: MapData;
  dirty: boolean;  // Has unsaved changes
  
  // Actions
  setMap: (map: MapData) => void;
  markDirty: () => void;
  markClean: () => void;
}

export const useMapStore = create<MapState>((set) => ({
  map: new MapData(),
  dirty: false,
  
  setMap: (map) => set({ map, dirty: false }),
  markDirty: () => set({ dirty: true }),
  markClean: () => set({ dirty: false }),
}));


// src/store/editorStore.ts

import { create } from 'zustand';

type EditorMode = 'vertex' | 'linedef' | 'sector' | 'thing' | 'draw';

interface EditorState {
  mode: EditorMode;
  gridSize: number;
  snapToGrid: boolean;
  showGrid: boolean;
  showThings: boolean;
  showVertices: boolean;
  
  // Actions
  setMode: (mode: EditorMode) => void;
  setGridSize: (size: number) => void;
  toggleSnapToGrid: () => void;
  toggleShowGrid: () => void;
  toggleShowThings: () => void;
  toggleShowVertices: () => void;
}

export const useEditorStore = create<EditorState>((set) => ({
  mode: 'vertex',
  gridSize: 32,
  snapToGrid: true,
  showGrid: true,
  showThings: true,
  showVertices: true,
  
  setMode: (mode) => set({ mode }),
  setGridSize: (gridSize) => set({ gridSize }),
  toggleSnapToGrid: () => set((s) => ({ snapToGrid: !s.snapToGrid })),
  toggleShowGrid: () => set((s) => ({ showGrid: !s.showGrid })),
  toggleShowThings: () => set((s) => ({ showThings: !s.showThings })),
  toggleShowVertices: () => set((s) => ({ showVertices: !s.showVertices })),
}));


// src/store/selectionStore.ts

import { create } from 'zustand';

interface SelectionState {
  vertices: Set<number>;
  linedefs: Set<number>;
  sectors: Set<number>;
  things: Set<number>;
  
  // Actions
  selectVertex: (id: number, additive?: boolean) => void;
  selectLinedef: (id: number, additive?: boolean) => void;
  selectSector: (id: number, additive?: boolean) => void;
  selectThing: (id: number, additive?: boolean) => void;
  
  selectVertices: (ids: number[], additive?: boolean) => void;
  selectLinedefs: (ids: number[], additive?: boolean) => void;
  selectSectors: (ids: number[], additive?: boolean) => void;
  selectThings: (ids: number[], additive?: boolean) => void;
  
  deselectVertex: (id: number) => void;
  deselectLinedef: (id: number) => void;
  deselectSector: (id: number) => void;
  deselectThing: (id: number) => void;
  
  clearAll: () => void;
  clearVertices: () => void;
  clearLinedefs: () => void;
  clearSectors: () => void;
  clearThings: () => void;
}

export const useSelectionStore = create<SelectionState>((set) => ({
  vertices: new Set(),
  linedefs: new Set(),
  sectors: new Set(),
  things: new Set(),
  
  selectVertex: (id, additive = false) => set((s) => ({
    vertices: additive ? new Set([...s.vertices, id]) : new Set([id]),
    linedefs: additive ? s.linedefs : new Set(),
    sectors: additive ? s.sectors : new Set(),
    things: additive ? s.things : new Set(),
  })),
  
  // ... similar for other select methods
  
  clearAll: () => set({
    vertices: new Set(),
    linedefs: new Set(),
    sectors: new Set(),
    things: new Set(),
  }),
  
  // ... other methods
}));
```

---

## WAD I/O

```typescript
// src/io/wad/WadReader.ts

export interface WadLump {
  name: string;
  offset: number;
  size: number;
  data: ArrayBuffer;
}

export interface WadFile {
  type: 'IWAD' | 'PWAD';
  lumps: WadLump[];
}

export class WadReader {
  static read(buffer: ArrayBuffer): WadFile {
    const view = new DataView(buffer);
    
    // Header
    const typeBytes = new Uint8Array(buffer, 0, 4);
    const type = String.fromCharCode(...typeBytes) as 'IWAD' | 'PWAD';
    const numLumps = view.getInt32(4, true);
    const directoryOffset = view.getInt32(8, true);
    
    // Directory
    const lumps: WadLump[] = [];
    for (let i = 0; i < numLumps; i++) {
      const entryOffset = directoryOffset + i * 16;
      const lumpOffset = view.getInt32(entryOffset, true);
      const lumpSize = view.getInt32(entryOffset + 4, true);
      
      const nameBytes = new Uint8Array(buffer, entryOffset + 8, 8);
      const name = String.fromCharCode(...nameBytes).replace(/\0+$/, '');
      
      lumps.push({
        name,
        offset: lumpOffset,
        size: lumpSize,
        data: buffer.slice(lumpOffset, lumpOffset + lumpSize),
      });
    }
    
    return { type, lumps };
  }
  
  static findMapLumps(wad: WadFile, mapName: string): Map<string, WadLump> {
    const result = new Map<string, WadLump>();
    const mapIndex = wad.lumps.findIndex(l => l.name === mapName);
    
    if (mapIndex === -1) return result;
    
    const mapLumpNames = [
      'THINGS', 'LINEDEFS', 'SIDEDEFS', 'VERTEXES', 
      'SEGS', 'SSECTORS', 'NODES', 'SECTORS', 
      'REJECT', 'BLOCKMAP', 'BEHAVIOR', 'SCRIPTS'
    ];
    
    for (let i = mapIndex + 1; i < wad.lumps.length; i++) {
      const lump = wad.lumps[i];
      if (mapLumpNames.includes(lump.name)) {
        result.set(lump.name, lump);
      } else if (!mapLumpNames.includes(lump.name) && lump.size > 0) {
        break; // End of map lumps
      }
    }
    
    return result;
  }
}


// src/io/map/HexenMapReader.ts

import { MapData, Vertex, Linedef, Sidedef, Sector, Thing } from '../../core/map/types';
import { WadLump } from '../wad/WadReader';

export class HexenMapReader {
  static read(lumps: Map<string, WadLump>): MapData {
    const map = new MapData();
    
    // Read VERTEXES
    const vertexLump = lumps.get('VERTEXES');
    if (vertexLump) {
      this.readVertices(map, vertexLump.data);
    }
    
    // Read SECTORS
    const sectorLump = lumps.get('SECTORS');
    if (sectorLump) {
      this.readSectors(map, sectorLump.data);
    }
    
    // Read SIDEDEFS
    const sidedefLump = lumps.get('SIDEDEFS');
    if (sidedefLump) {
      this.readSidedefs(map, sidedefLump.data);
    }
    
    // Read LINEDEFS (Hexen format: 16 bytes)
    const linedefLump = lumps.get('LINEDEFS');
    if (linedefLump) {
      this.readLinedefs(map, linedefLump.data);
    }
    
    // Read THINGS (Hexen format: 20 bytes)
    const thingLump = lumps.get('THINGS');
    if (thingLump) {
      this.readThings(map, thingLump.data);
    }
    
    // Build back-references
    this.buildReferences(map);
    
    return map;
  }
  
  private static readVertices(map: MapData, data: ArrayBuffer): void {
    const view = new DataView(data);
    const count = data.byteLength / 4;
    
    for (let i = 0; i < count; i++) {
      const offset = i * 4;
      const vertex: Vertex = {
        id: i,
        x: view.getInt16(offset, true),
        y: view.getInt16(offset + 2, true),
        linedefs: new Set(),
      };
      map.vertices.set(i, vertex);
    }
  }
  
  private static readLinedefs(map: MapData, data: ArrayBuffer): void {
    const view = new DataView(data);
    const count = data.byteLength / 16; // Hexen format
    
    for (let i = 0; i < count; i++) {
      const offset = i * 16;
      const linedef: Linedef = {
        id: i,
        v1: view.getInt16(offset, true),
        v2: view.getInt16(offset + 2, true),
        flags: view.getInt16(offset + 4, true),
        special: view.getUint8(offset + 6),
        args: [
          view.getUint8(offset + 7),
          view.getUint8(offset + 8),
          view.getUint8(offset + 9),
          view.getUint8(offset + 10),
          view.getUint8(offset + 11),
        ],
        frontSidedef: view.getInt16(offset + 12, true),
        backSidedef: view.getInt16(offset + 14, true),
        frontSector: null,
        backSector: null,
      };
      
      // Convert -1 (0xFFFF) to null
      if (linedef.frontSidedef === -1 || linedef.frontSidedef === 0xFFFF) {
        linedef.frontSidedef = null;
      }
      if (linedef.backSidedef === -1 || linedef.backSidedef === 0xFFFF) {
        linedef.backSidedef = null;
      }
      
      map.linedefs.set(i, linedef);
    }
  }
  
  private static readSidedefs(map: MapData, data: ArrayBuffer): void {
    const view = new DataView(data);
    const count = data.byteLength / 30;
    
    for (let i = 0; i < count; i++) {
      const offset = i * 30;
      const sidedef: Sidedef = {
        id: i,
        offsetX: view.getInt16(offset, true),
        offsetY: view.getInt16(offset + 2, true),
        upperTexture: this.readString(data, offset + 4, 8),
        lowerTexture: this.readString(data, offset + 12, 8),
        middleTexture: this.readString(data, offset + 20, 8),
        sector: view.getInt16(offset + 28, true),
      };
      map.sidedefs.set(i, sidedef);
    }
  }
  
  private static readSectors(map: MapData, data: ArrayBuffer): void {
    const view = new DataView(data);
    const count = data.byteLength / 26;
    
    for (let i = 0; i < count; i++) {
      const offset = i * 26;
      const sector: Sector = {
        id: i,
        floorHeight: view.getInt16(offset, true),
        ceilingHeight: view.getInt16(offset + 2, true),
        floorTexture: this.readString(data, offset + 4, 8),
        ceilingTexture: this.readString(data, offset + 12, 8),
        lightLevel: view.getInt16(offset + 20, true),
        special: view.getInt16(offset + 22, true),
        tag: view.getInt16(offset + 24, true),
        linedefs: new Set(),
        boundingBox: null,
        triangles: null,
      };
      map.sectors.set(i, sector);
    }
  }
  
  private static readThings(map: MapData, data: ArrayBuffer): void {
    const view = new DataView(data);
    const count = data.byteLength / 20; // Hexen format
    
    for (let i = 0; i < count; i++) {
      const offset = i * 20;
      const thing: Thing = {
        id: i,
        tid: view.getInt16(offset, true),
        x: view.getInt16(offset + 2, true),
        y: view.getInt16(offset + 4, true),
        z: view.getInt16(offset + 6, true),
        angle: view.getInt16(offset + 8, true),
        type: view.getInt16(offset + 10, true),
        flags: view.getInt16(offset + 12, true),
        special: view.getUint8(offset + 14),
        args: [
          view.getUint8(offset + 15),
          view.getUint8(offset + 16),
          view.getUint8(offset + 17),
          view.getUint8(offset + 18),
          view.getUint8(offset + 19),
        ],
      };
      map.things.set(i, thing);
    }
  }
  
  private static readString(buffer: ArrayBuffer, offset: number, length: number): string {
    const bytes = new Uint8Array(buffer, offset, length);
    let str = '';
    for (const byte of bytes) {
      if (byte === 0) break;
      str += String.fromCharCode(byte);
    }
    return str.toUpperCase();
  }
  
  private static buildReferences(map: MapData): void {
    // Link vertices to linedefs
    for (const linedef of map.linedefs.values()) {
      const v1 = map.vertices.get(linedef.v1);
      const v2 = map.vertices.get(linedef.v2);
      if (v1) v1.linedefs.add(linedef.id);
      if (v2) v2.linedefs.add(linedef.id);
      
      // Link linedefs to sectors via sidedefs
      if (linedef.frontSidedef !== null) {
        const sidedef = map.sidedefs.get(linedef.frontSidedef);
        if (sidedef) {
          linedef.frontSector = sidedef.sector;
          const sector = map.sectors.get(sidedef.sector);
          if (sector) sector.linedefs.add(linedef.id);
        }
      }
      if (linedef.backSidedef !== null) {
        const sidedef = map.sidedefs.get(linedef.backSidedef);
        if (sidedef) {
          linedef.backSector = sidedef.sector;
          const sector = map.sectors.get(sidedef.sector);
          if (sector) sector.linedefs.add(linedef.id);
        }
      }
    }
  }
}
```

---

## Keyboard Shortcuts

```typescript
// src/utils/keyboard.ts

export interface Shortcut {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  action: string;
}

export const defaultShortcuts: Shortcut[] = [
  // Mode switching
  { key: 'v', action: 'mode.vertex' },
  { key: 'l', action: 'mode.linedef' },
  { key: 's', action: 'mode.sector' },
  { key: 't', action: 'mode.thing' },
  { key: 'd', action: 'mode.draw' },
  
  // Edit operations
  { key: 'z', ctrl: true, action: 'edit.undo' },
  { key: 'y', ctrl: true, action: 'edit.redo' },
  { key: 'z', ctrl: true, shift: true, action: 'edit.redo' },
  { key: 'a', ctrl: true, action: 'edit.selectAll' },
  { key: 'Delete', action: 'edit.delete' },
  { key: 'c', ctrl: true, action: 'edit.copy' },
  { key: 'x', ctrl: true, action: 'edit.cut' },
  { key: 'v', ctrl: true, action: 'edit.paste' },
  
  // View
  { key: 'g', action: 'view.toggleGrid' },
  { key: '[', action: 'view.gridDecrease' },
  { key: ']', action: 'view.gridIncrease' },
  { key: 'Home', action: 'view.fitToMap' },
  
  // File
  { key: 's', ctrl: true, action: 'file.save' },
  { key: 'o', ctrl: true, action: 'file.open' },
  { key: 'n', ctrl: true, action: 'file.new' },
];

export class KeyboardManager {
  private shortcuts: Map<string, Shortcut> = new Map();
  private handlers: Map<string, () => void> = new Map();
  
  constructor(shortcuts: Shortcut[] = defaultShortcuts) {
    for (const shortcut of shortcuts) {
      const key = this.makeKey(shortcut);
      this.shortcuts.set(key, shortcut);
    }
  }
  
  private makeKey(shortcut: Shortcut | KeyboardEvent): string {
    const parts: string[] = [];
    if ('ctrl' in shortcut ? shortcut.ctrl : shortcut.ctrlKey) parts.push('ctrl');
    if ('shift' in shortcut ? shortcut.shift : shortcut.shiftKey) parts.push('shift');
    if ('alt' in shortcut ? shortcut.alt : shortcut.altKey) parts.push('alt');
    parts.push(shortcut.key.toLowerCase());
    return parts.join('+');
  }
  
  registerHandler(action: string, handler: () => void): void {
    this.handlers.set(action, handler);
  }
  
  handleKeyDown(event: KeyboardEvent): boolean {
    const key = this.makeKey(event);
    const shortcut = this.shortcuts.get(key);
    
    if (shortcut) {
      const handler = this.handlers.get(shortcut.action);
      if (handler) {
        event.preventDefault();
        handler();
        return true;
      }
    }
    
    return false;
  }
}
```

---

## Implementační plán

### Fáze 1: Základy (2-3 týdny)
1. ✅ Project setup (Vite + React + TypeScript)
2. ✅ Základní datové struktury
3. ✅ PixiJS renderer s Camera
4. ✅ Grid rendering
5. ✅ WAD parser (read only)
6. ✅ Zobrazení načtené mapy

### Fáze 2: Interakce (2-3 týdny)
1. Selection system
2. Vertex mode (select, move, create, delete)
3. Linedef mode (select, split, flip)
4. Undo/redo system
5. Keyboard shortcuts

### Fáze 3: Editace (3-4 týdny)
1. Draw mode (kreslení nových linií)
2. Sector detection algoritmus
3. Sector mode (select, properties)
4. Thing mode (place, rotate, properties)
5. Properties panels

### Fáze 4: Pokročilé (4+ týdny)
1. Texture browser
2. Auto texture alignment
3. Copy/paste
4. WAD export (Hexen format)
5. BEHAVIOR lump generation
6. 3D preview mode

### Fáze 5: Polish
1. Minimap
2. Preferences dialog
3. Custom keybindings
4. Performance optimization
5. Error handling & validation

---

## Reference

- [ZDoom Wiki - Map Format](https://zdoom.org/wiki/Map_format)
- [Doom Wiki - WAD](https://doomwiki.org/wiki/WAD)
- [PixiJS Documentation](https://pixijs.com/guides)
- [Ultimate Doom Builder Source](https://github.com/jewalky/UltimateDoomBuilder)
- [Zustand Documentation](https://docs.pmnd.rs/zustand/getting-started/introduction)

---

*Dokument vytvořen: 2026-01-10*
