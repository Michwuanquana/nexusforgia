# INSTRUCTIONS_EDITING.md
# Doom Map Editor - Editing System Implementation Guide

Implementační instrukce pro editační systém inspirovaný Ultimate Doom Builder (UDB).

---

## Obsah

1. [Architektura (SOLID)](#architektura-editing-system-solid)
2. [Klíčové Interfaces](#klíčové-interfaces)
3. [Mode Manager](#mode-manager)
4. [Selection Manager](#selection-manager)
5. [Snap System](#snap-system)
6. [Edit Modes](#edit-modes)
   - [Vertex Mode](#vertex-mode)
   - [Linedef Mode](#linedef-mode)
   - [Sector Mode](#sector-mode)
   - [Thing Mode](#thing-mode)
   - [Draw Mode](#draw-mode)
7. [Action System (Undo/Redo)](#action-system)
8. [Texture Management](#texture-management)
9. [Keyboard Shortcuts](#keyboard-shortcuts)

---

## Architektura Editing System (SOLID)

### Principy

| Princip | Aplikace |
|---------|----------|
| **S**ingle Responsibility | Každý Mode má jednu zodpovědnost (vertex editing, line editing...) |
| **O**pen/Closed | Nové módy přidáváme bez modifikace existujících |
| **L**iskov Substitution | Všechny módy implementují `EditMode` interface |
| **I**nterface Segregation | Malé, specifické interfaces (`Selectable`, `Draggable`, `Snappable`) |
| **D**ependency Inversion | Módy závisí na abstrakcích, ne na konkrétních třídách |

### Architektura Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        ModeManager                              │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐   │
│  │ Vertex  │ │ Linedef │ │ Sector  │ │  Thing  │ │  Draw   │   │
│  │  Mode   │ │  Mode   │ │  Mode   │ │  Mode   │ │  Mode   │   │
│  └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘   │
│       └───────────┴───────────┴───────────┴───────────┘        │
│                           │                                     │
│                    EditModeContext                              │
└─────────────────────────────┬───────────────────────────────────┘
                              │
         ┌────────────────────┼────────────────────┐
         │                    │                    │
         ▼                    ▼                    ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│ SelectionManager│  │   SnapSystem    │  │  ActionStack    │
└─────────────────┘  └─────────────────┘  └─────────────────┘
         │                    │                    │
         └────────────────────┼────────────────────┘
                              │
                              ▼
                      ┌───────────────┐
                      │    MapData    │
                      └───────────────┘
```

---

## Klíčové Interfaces

```typescript
// src/core/editing/interfaces.ts

// === BASE INTERFACES ===

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

export interface MapElement {
  readonly id: number;
  readonly type: 'vertex' | 'linedef' | 'sector' | 'thing';
}

// === BEHAVIOR INTERFACES (Interface Segregation) ===

export interface Selectable {
  isSelected: boolean;
  select(): void;
  deselect(): void;
}

export interface Draggable {
  startDrag(pos: Vec2): void;
  drag(pos: Vec2, snap: SnapContext): void;
  endDrag(): void;
  cancelDrag(): void;
}

export interface Snappable {
  getSnapPoints(): Vec2[];
}

export interface Hoverable {
  isHighlighted: boolean;
  highlight(): void;
  unhighlight(): void;
}

// === SNAP CONTEXT ===

export interface SnapContext {
  gridSize: number;
  snapToGrid: boolean;
  snapToGeometry: boolean;
  snapToVertices: boolean;
  snapToLines: boolean;
  snapDistance: number;  // in world units
}

export interface SnapResult {
  position: Vec2;
  snappedTo: 'grid' | 'vertex' | 'line' | 'none';
  snapTarget?: MapElement;
}

// === EDIT MODE INTERFACE ===

export interface EditModeContext {
  map: MapData;
  renderer: Renderer;
  actions: ActionStack;
  selection: SelectionManager;
  snap: SnapSystem;
  camera: Camera;
  keyboard: KeyboardState;
  textures: TextureManager;
}

export interface EditMode {
  readonly name: string;
  readonly cursor: string;
  readonly shortcut: string;
  
  // Lifecycle
  onEnter(ctx: EditModeContext): void;
  onExit(ctx: EditModeContext): void;
  
  // Input handling
  onMouseDown(event: MouseEvent, worldPos: Vec2, ctx: EditModeContext): void;
  onMouseMove(event: MouseEvent, worldPos: Vec2, ctx: EditModeContext): void;
  onMouseUp(event: MouseEvent, worldPos: Vec2, ctx: EditModeContext): void;
  onWheel(event: WheelEvent, ctx: EditModeContext): void;
  onKeyDown(event: KeyboardEvent, ctx: EditModeContext): boolean;
  onKeyUp(event: KeyboardEvent, ctx: EditModeContext): void;
  
  // Context menu
  getContextMenuItems(worldPos: Vec2, ctx: EditModeContext): ContextMenuItem[];
  
  // Rendering
  renderOverlay(ctx: EditModeContext): void;
}

export interface ContextMenuItem {
  label: string;
  action: () => void;
  shortcut?: string;
  separator?: boolean;
  disabled?: boolean;
  submenu?: ContextMenuItem[];
}
```

---

## Mode Manager

```typescript
// src/core/editing/ModeManager.ts

export class ModeManager {
  private modes: Map<string, EditMode> = new Map();
  private currentMode: EditMode | null = null;
  private context: EditModeContext;
  private listeners: Set<(mode: EditMode) => void> = new Set();
  
  constructor(context: EditModeContext) {
    this.context = context;
  }
  
  registerMode(mode: EditMode): void {
    this.modes.set(mode.name, mode);
  }
  
  setMode(name: string): void {
    const newMode = this.modes.get(name);
    if (!newMode) {
      console.warn(`Mode "${name}" not found`);
      return;
    }
    
    if (this.currentMode) {
      this.currentMode.onExit(this.context);
    }
    
    this.currentMode = newMode;
    this.currentMode.onEnter(this.context);
    
    // Update cursor
    document.body.style.cursor = this.currentMode.cursor;
    
    // Notify listeners
    for (const listener of this.listeners) {
      listener(this.currentMode);
    }
    
    this.context.renderer.requestRender();
  }
  
  getCurrentMode(): EditMode | null {
    return this.currentMode;
  }
  
  getModes(): EditMode[] {
    return Array.from(this.modes.values());
  }
  
  // Subscribe to mode changes
  onModeChange(listener: (mode: EditMode) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
  
  // Input delegation
  handleMouseDown(event: MouseEvent, worldPos: Vec2): void {
    this.currentMode?.onMouseDown(event, worldPos, this.context);
  }
  
  handleMouseMove(event: MouseEvent, worldPos: Vec2): void {
    this.currentMode?.onMouseMove(event, worldPos, this.context);
  }
  
  handleMouseUp(event: MouseEvent, worldPos: Vec2): void {
    this.currentMode?.onMouseUp(event, worldPos, this.context);
  }
  
  handleWheel(event: WheelEvent): void {
    this.currentMode?.onWheel(event, this.context);
  }
  
  handleKeyDown(event: KeyboardEvent): boolean {
    // Check for mode switching shortcuts first
    if (!event.ctrlKey && !event.altKey) {
      for (const mode of this.modes.values()) {
        if (event.key.toLowerCase() === mode.shortcut.toLowerCase()) {
          this.setMode(mode.name);
          return true;
        }
      }
    }
    
    return this.currentMode?.onKeyDown(event, this.context) ?? false;
  }
  
  handleKeyUp(event: KeyboardEvent): void {
    this.currentMode?.onKeyUp(event, this.context);
  }
  
  getContextMenu(worldPos: Vec2): ContextMenuItem[] {
    return this.currentMode?.getContextMenuItems(worldPos, this.context) ?? [];
  }
}
```

---

## Selection Manager

```typescript
// src/core/editing/SelectionManager.ts

export type SelectionType = 'vertex' | 'linedef' | 'sector' | 'thing';

export interface SelectionState {
  vertices: Set<number>;
  linedefs: Set<number>;
  sectors: Set<number>;
  things: Set<number>;
}

export class SelectionManager {
  private state: SelectionState = {
    vertices: new Set(),
    linedefs: new Set(),
    sectors: new Set(),
    things: new Set(),
  };
  
  private listeners: Set<() => void> = new Set();
  
  // === GETTERS ===
  
  getVertices(): ReadonlySet<number> { return this.state.vertices; }
  getLinedefs(): ReadonlySet<number> { return this.state.linedefs; }
  getSectors(): ReadonlySet<number> { return this.state.sectors; }
  getThings(): ReadonlySet<number> { return this.state.things; }
  
  hasSelection(type?: SelectionType): boolean {
    if (type) {
      return this.getSet(type).size > 0;
    }
    return this.state.vertices.size > 0 ||
           this.state.linedefs.size > 0 ||
           this.state.sectors.size > 0 ||
           this.state.things.size > 0;
  }
  
  count(type: SelectionType): number {
    return this.getSet(type).size;
  }
  
  // === SELECTION OPERATIONS ===
  
  select(type: SelectionType, id: number, additive: boolean = false): void {
    if (!additive) {
      this.clearAll();
    }
    this.getSet(type).add(id);
    this.notify();
  }
  
  selectMultiple(type: SelectionType, ids: number[], additive: boolean = false): void {
    if (!additive) {
      this.clearAll();
    }
    const set = this.getSet(type);
    for (const id of ids) {
      set.add(id);
    }
    this.notify();
  }
  
  deselect(type: SelectionType, id: number): void {
    this.getSet(type).delete(id);
    this.notify();
  }
  
  toggle(type: SelectionType, id: number): void {
    const set = this.getSet(type);
    if (set.has(id)) {
      set.delete(id);
    } else {
      set.add(id);
    }
    this.notify();
  }
  
  isSelected(type: SelectionType, id: number): boolean {
    return this.getSet(type).has(id);
  }
  
  clearAll(): void {
    this.state.vertices.clear();
    this.state.linedefs.clear();
    this.state.sectors.clear();
    this.state.things.clear();
    this.notify();
  }
  
  clear(type: SelectionType): void {
    this.getSet(type).clear();
    this.notify();
  }
  
  // === BOX SELECTION ===
  
  selectInBox(type: SelectionType, box: BBox, map: MapData, additive: boolean = false): number {
    if (!additive) {
      this.clearAll();
    }
    
    const set = this.getSet(type);
    let count = 0;
    
    switch (type) {
      case 'vertex':
        for (const [id, v] of map.vertices) {
          if (this.pointInBox(v, box)) {
            set.add(id);
            count++;
          }
        }
        break;
        
      case 'linedef':
        for (const [id, line] of map.linedefs) {
          const v1 = map.vertices.get(line.v1);
          const v2 = map.vertices.get(line.v2);
          if (v1 && v2 && this.lineIntersectsBox(v1, v2, box)) {
            set.add(id);
            count++;
          }
        }
        break;
        
      case 'sector':
        for (const [id, sector] of map.sectors) {
          if (sector.boundingBox && this.boxIntersectsBox(sector.boundingBox, box)) {
            set.add(id);
            count++;
          }
        }
        break;
        
      case 'thing':
        for (const [id, thing] of map.things) {
          if (this.pointInBox(thing, box)) {
            set.add(id);
            count++;
          }
        }
        break;
    }
    
    this.notify();
    return count;
  }
  
  // === RELATED SELECTION (Doom Builder style) ===
  
  selectConnectedLinedefs(map: MapData): void {
    for (const vid of this.state.vertices) {
      const vertex = map.vertices.get(vid);
      if (vertex) {
        for (const lid of vertex.linedefs) {
          this.state.linedefs.add(lid);
        }
      }
    }
    this.notify();
  }
  
  selectLinedefVertices(map: MapData): void {
    for (const lid of this.state.linedefs) {
      const line = map.linedefs.get(lid);
      if (line) {
        this.state.vertices.add(line.v1);
        this.state.vertices.add(line.v2);
      }
    }
    this.notify();
  }
  
  selectSectorLinedefs(map: MapData): void {
    for (const sid of this.state.sectors) {
      const sector = map.sectors.get(sid);
      if (sector) {
        for (const lid of sector.linedefs) {
          this.state.linedefs.add(lid);
        }
      }
    }
    this.notify();
  }
  
  selectAll(type: SelectionType, map: MapData): void {
    const set = this.getSet(type);
    switch (type) {
      case 'vertex':
        for (const id of map.vertices.keys()) set.add(id);
        break;
      case 'linedef':
        for (const id of map.linedefs.keys()) set.add(id);
        break;
      case 'sector':
        for (const id of map.sectors.keys()) set.add(id);
        break;
      case 'thing':
        for (const id of map.things.keys()) set.add(id);
        break;
    }
    this.notify();
  }
  
  invertSelection(type: SelectionType, map: MapData): void {
    const set = this.getSet(type);
    const collection = type === 'vertex' ? map.vertices :
                       type === 'linedef' ? map.linedefs :
                       type === 'sector' ? map.sectors : map.things;
    
    for (const id of collection.keys()) {
      if (set.has(id)) {
        set.delete(id);
      } else {
        set.add(id);
      }
    }
    this.notify();
  }
  
  // === HELPERS ===
  
  private getSet(type: SelectionType): Set<number> {
    switch (type) {
      case 'vertex': return this.state.vertices;
      case 'linedef': return this.state.linedefs;
      case 'sector': return this.state.sectors;
      case 'thing': return this.state.things;
    }
  }
  
  private pointInBox(p: Vec2, box: BBox): boolean {
    return p.x >= box.minX && p.x <= box.maxX &&
           p.y >= box.minY && p.y <= box.maxY;
  }
  
  private lineIntersectsBox(v1: Vec2, v2: Vec2, box: BBox): boolean {
    if (this.pointInBox(v1, box) || this.pointInBox(v2, box)) {
      return true;
    }
    return this.lineIntersectsLine(v1, v2, {x: box.minX, y: box.minY}, {x: box.maxX, y: box.minY}) ||
           this.lineIntersectsLine(v1, v2, {x: box.maxX, y: box.minY}, {x: box.maxX, y: box.maxY}) ||
           this.lineIntersectsLine(v1, v2, {x: box.maxX, y: box.maxY}, {x: box.minX, y: box.maxY}) ||
           this.lineIntersectsLine(v1, v2, {x: box.minX, y: box.maxY}, {x: box.minX, y: box.minY});
  }
  
  private lineIntersectsLine(a1: Vec2, a2: Vec2, b1: Vec2, b2: Vec2): boolean {
    const d1 = this.cross(b2.x - b1.x, b2.y - b1.y, a1.x - b1.x, a1.y - b1.y);
    const d2 = this.cross(b2.x - b1.x, b2.y - b1.y, a2.x - b1.x, a2.y - b1.y);
    const d3 = this.cross(a2.x - a1.x, a2.y - a1.y, b1.x - a1.x, b1.y - a1.y);
    const d4 = this.cross(a2.x - a1.x, a2.y - a1.y, b2.x - a1.x, b2.y - a1.y);
    return ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) &&
           ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0));
  }
  
  private cross(ax: number, ay: number, bx: number, by: number): number {
    return ax * by - ay * bx;
  }
  
  private boxIntersectsBox(a: BBox, b: BBox): boolean {
    return a.minX <= b.maxX && a.maxX >= b.minX &&
           a.minY <= b.maxY && a.maxY >= b.minY;
  }
  
  // === OBSERVERS ===
  
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
  
  private notify(): void {
    for (const listener of this.listeners) {
      listener();
    }
  }
}
```

---

## Snap System

```typescript
// src/core/editing/SnapSystem.ts

export interface SnapConfig {
  gridSize: number;
  snapToGrid: boolean;
  snapToVertices: boolean;
  snapToLines: boolean;
  snapDistance: number;
}

export class SnapSystem {
  private config: SnapConfig = {
    gridSize: 32,
    snapToGrid: true,
    snapToVertices: true,
    snapToLines: true,
    snapDistance: 8
  };
  
  constructor(
    private map: MapData,
    private spatialIndex: SpatialIndex
  ) {}
  
  setConfig(config: Partial<SnapConfig>): void {
    Object.assign(this.config, config);
  }
  
  getConfig(): SnapConfig {
    return { ...this.config };
  }
  
  snap(pos: Vec2, cameraZoom: number, excludeVertices?: Set<number>): SnapResult {
    const snapDist = this.config.snapDistance / cameraZoom;
    
    // Priority: Vertex > Line > Grid
    if (this.config.snapToVertices) {
      const vertex = this.findNearestVertex(pos, snapDist, excludeVertices);
      if (vertex) {
        return {
          position: { x: vertex.x, y: vertex.y },
          snappedTo: 'vertex',
          snapTarget: { id: vertex.id, type: 'vertex' }
        };
      }
    }
    
    if (this.config.snapToLines) {
      const lineSnap = this.findNearestLinePoint(pos, snapDist, excludeVertices);
      if (lineSnap) {
        return {
          position: lineSnap.point,
          snappedTo: 'line',
          snapTarget: { id: lineSnap.linedefId, type: 'linedef' }
        };
      }
    }
    
    if (this.config.snapToGrid) {
      return {
        position: this.snapToGrid(pos),
        snappedTo: 'grid'
      };
    }
    
    return { position: pos, snappedTo: 'none' };
  }
  
  snapToGrid(pos: Vec2): Vec2 {
    return {
      x: Math.round(pos.x / this.config.gridSize) * this.config.gridSize,
      y: Math.round(pos.y / this.config.gridSize) * this.config.gridSize
    };
  }
  
  private findNearestVertex(pos: Vec2, maxDistance: number, exclude?: Set<number>): Vertex | null {
    const candidates = this.spatialIndex.queryVertices({
      minX: pos.x - maxDistance,
      minY: pos.y - maxDistance,
      maxX: pos.x + maxDistance,
      maxY: pos.y + maxDistance
    });
    
    let nearest: Vertex | null = null;
    let nearestDist = maxDistance;
    
    for (const v of candidates) {
      if (exclude?.has(v.id)) continue;
      const dist = Math.hypot(v.x - pos.x, v.y - pos.y);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = v;
      }
    }
    
    return nearest;
  }
  
  private findNearestLinePoint(
    pos: Vec2, 
    maxDistance: number,
    excludeVertices?: Set<number>
  ): { point: Vec2; linedefId: number } | null {
    const candidates = this.spatialIndex.queryLinedefs({
      minX: pos.x - maxDistance,
      minY: pos.y - maxDistance,
      maxX: pos.x + maxDistance,
      maxY: pos.y + maxDistance
    });
    
    let nearest: { point: Vec2; linedefId: number } | null = null;
    let nearestDist = maxDistance;
    
    for (const line of candidates) {
      const v1 = this.map.vertices.get(line.v1);
      const v2 = this.map.vertices.get(line.v2);
      if (!v1 || !v2) continue;
      
      if (excludeVertices?.has(v1.id) || excludeVertices?.has(v2.id)) continue;
      
      const closest = this.closestPointOnLine(pos, v1, v2);
      const dist = Math.hypot(closest.x - pos.x, closest.y - pos.y);
      
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = { point: closest, linedefId: line.id };
      }
    }
    
    return nearest;
  }
  
  private closestPointOnLine(p: Vec2, a: Vec2, b: Vec2): Vec2 {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len2 = dx * dx + dy * dy;
    
    if (len2 === 0) return a;
    
    const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2));
    
    return {
      x: a.x + t * dx,
      y: a.y + t * dy
    };
  }
}
```

---

## Edit Modes

### Vertex Mode

```typescript
// src/core/modes/VertexMode.ts

export class VertexMode implements EditMode {
  readonly name = 'Vertices';
  readonly cursor = 'crosshair';
  readonly shortcut = 'v';
  
  private isDragging = false;
  private isBoxSelecting = false;
  private dragStartPos: Vec2 | null = null;
  private boxStartPos: Vec2 | null = null;
  private originalPositions: Map<number, Vec2> = new Map();
  private highlightedVertexId: number | null = null;
  
  onEnter(ctx: EditModeContext): void {
    ctx.renderer.setVertexVisibility('prominent');
    ctx.selection.clear('linedef');
    ctx.selection.clear('sector');
    ctx.selection.clear('thing');
  }
  
  onExit(ctx: EditModeContext): void {
    this.cancelDrag(ctx);
    ctx.renderer.setVertexVisibility('normal');
  }
  
  onMouseDown(event: MouseEvent, worldPos: Vec2, ctx: EditModeContext): void {
    const snapped = ctx.snap.snap(worldPos, ctx.camera.zoom);
    
    if (event.button === 0) { // Left click
      const vertex = this.findVertexAt(snapped.position, ctx);
      
      if (vertex) {
        // Click on vertex - select and prepare drag
        if (!event.shiftKey && !ctx.selection.isSelected('vertex', vertex.id)) {
          ctx.selection.clearAll();
        }
        ctx.selection.select('vertex', vertex.id, event.shiftKey);
        this.startDrag(snapped.position, ctx);
      } else {
        // Click on empty space - start box selection
        if (!event.shiftKey) {
          ctx.selection.clearAll();
        }
        this.startBoxSelect(snapped.position);
      }
    } else if (event.button === 2) { // Right click
      // Insert vertex (UDB behavior)
      if (!event.ctrlKey) {
        this.insertVertex(snapped.position, ctx);
      }
    }
  }
  
  onMouseMove(event: MouseEvent, worldPos: Vec2, ctx: EditModeContext): void {
    const excludeIds = this.isDragging ? new Set(this.originalPositions.keys()) : undefined;
    const snapped = ctx.snap.snap(worldPos, ctx.camera.zoom, excludeIds);
    
    if (this.isDragging && this.dragStartPos) {
      const dx = snapped.position.x - this.dragStartPos.x;
      const dy = snapped.position.y - this.dragStartPos.y;
      
      for (const [id, orig] of this.originalPositions) {
        const vertex = ctx.map.vertices.get(id);
        if (vertex) {
          vertex.x = orig.x + dx;
          vertex.y = orig.y + dy;
        }
      }
      
      ctx.renderer.invalidateVertices(Array.from(this.originalPositions.keys()));
      ctx.renderer.requestRender();
      
    } else if (this.isBoxSelecting && this.boxStartPos) {
      ctx.renderer.setSelectionBox({
        minX: Math.min(this.boxStartPos.x, snapped.position.x),
        minY: Math.min(this.boxStartPos.y, snapped.position.y),
        maxX: Math.max(this.boxStartPos.x, snapped.position.x),
        maxY: Math.max(this.boxStartPos.y, snapped.position.y),
      });
      ctx.renderer.requestRender();
      
    } else {
      const vertex = this.findVertexAt(snapped.position, ctx);
      const newHighlight = vertex?.id ?? null;
      
      if (newHighlight !== this.highlightedVertexId) {
        this.highlightedVertexId = newHighlight;
        ctx.renderer.setHighlightedVertex(this.highlightedVertexId);
        ctx.renderer.requestRender();
      }
    }
  }
  
  onMouseUp(event: MouseEvent, worldPos: Vec2, ctx: EditModeContext): void {
    const excludeIds = this.isDragging ? new Set(this.originalPositions.keys()) : undefined;
    const snapped = ctx.snap.snap(worldPos, ctx.camera.zoom, excludeIds);
    
    if (this.isDragging && this.dragStartPos) {
      this.finishDrag(snapped.position, ctx);
    } else if (this.isBoxSelecting && this.boxStartPos) {
      this.finishBoxSelect(snapped.position, event.shiftKey, ctx);
    }
  }
  
  onWheel(event: WheelEvent, ctx: EditModeContext): void {}
  
  onKeyDown(event: KeyboardEvent, ctx: EditModeContext): boolean {
    switch (event.key) {
      case 'Delete':
      case 'Backspace':
        this.deleteSelected(ctx);
        return true;
        
      case 'Escape':
        if (this.isDragging) {
          this.cancelDrag(ctx);
          return true;
        }
        ctx.selection.clearAll();
        return true;
        
      case 'm':
      case 'M':
        if (event.shiftKey) {
          this.mergeSelectedVertices(ctx);
          return true;
        }
        break;
        
      case 'j':
      case 'J':
        this.joinSelectedVertices(ctx);
        return true;
        
      case 'a':
      case 'A':
        if (event.ctrlKey) {
          ctx.selection.selectAll('vertex', ctx.map);
          return true;
        }
        break;
    }
    
    return false;
  }
  
  onKeyUp(event: KeyboardEvent, ctx: EditModeContext): void {}
  
  getContextMenuItems(worldPos: Vec2, ctx: EditModeContext): ContextMenuItem[] {
    const items: ContextMenuItem[] = [];
    const vertex = this.findVertexAt(worldPos, ctx);
    
    if (vertex) {
      items.push({
        label: 'Delete Vertex',
        shortcut: 'Del',
        action: () => this.deleteVertex(vertex.id, ctx)
      });
      
      items.push({
        label: 'Properties...',
        action: () => ctx.renderer.showVertexProperties(vertex.id)
      });
    } else {
      items.push({
        label: 'Insert Vertex Here',
        action: () => this.insertVertex(worldPos, ctx)
      });
    }
    
    if (ctx.selection.count('vertex') >= 2) {
      items.push({ separator: true, label: '', action: () => {} });
      items.push({
        label: 'Merge Vertices',
        shortcut: 'Shift+M',
        action: () => this.mergeSelectedVertices(ctx)
      });
      items.push({
        label: 'Join with Linedef',
        shortcut: 'J',
        action: () => this.joinSelectedVertices(ctx),
        disabled: ctx.selection.count('vertex') !== 2
      });
    }
    
    return items;
  }
  
  renderOverlay(ctx: EditModeContext): void {}
  
  // === PRIVATE ===
  
  private findVertexAt(pos: Vec2, ctx: EditModeContext): Vertex | null {
    const threshold = 8 / ctx.camera.zoom;
    return ctx.map.findVertexNear(pos.x, pos.y, threshold);
  }
  
  private startDrag(pos: Vec2, ctx: EditModeContext): void {
    this.isDragging = true;
    this.dragStartPos = pos;
    this.originalPositions.clear();
    
    for (const id of ctx.selection.getVertices()) {
      const vertex = ctx.map.vertices.get(id);
      if (vertex) {
        this.originalPositions.set(id, { x: vertex.x, y: vertex.y });
      }
    }
  }
  
  private finishDrag(pos: Vec2, ctx: EditModeContext): void {
    if (!this.dragStartPos) return;
    
    const dx = pos.x - this.dragStartPos.x;
    const dy = pos.y - this.dragStartPos.y;
    
    // Restore original positions
    for (const [id, orig] of this.originalPositions) {
      const vertex = ctx.map.vertices.get(id);
      if (vertex) {
        vertex.x = orig.x;
        vertex.y = orig.y;
      }
    }
    
    // Create undoable action if moved
    if (Math.abs(dx) > 0.001 || Math.abs(dy) > 0.001) {
      const action = new MoveVerticesAction(
        ctx.map,
        Array.from(this.originalPositions.keys()),
        dx, dy
      );
      ctx.actions.execute(action);
    }
    
    this.isDragging = false;
    this.dragStartPos = null;
    this.originalPositions.clear();
    ctx.renderer.requestRender();
  }
  
  private cancelDrag(ctx: EditModeContext): void {
    // Restore positions
    for (const [id, orig] of this.originalPositions) {
      const vertex = ctx.map.vertices.get(id);
      if (vertex) {
        vertex.x = orig.x;
        vertex.y = orig.y;
      }
    }
    
    this.isDragging = false;
    this.dragStartPos = null;
    this.originalPositions.clear();
    ctx.renderer.requestRender();
  }
  
  private startBoxSelect(pos: Vec2): void {
    this.isBoxSelecting = true;
    this.boxStartPos = pos;
  }
  
  private finishBoxSelect(pos: Vec2, additive: boolean, ctx: EditModeContext): void {
    if (!this.boxStartPos) return;
    
    const box: BBox = {
      minX: Math.min(this.boxStartPos.x, pos.x),
      minY: Math.min(this.boxStartPos.y, pos.y),
      maxX: Math.max(this.boxStartPos.x, pos.x),
      maxY: Math.max(this.boxStartPos.y, pos.y),
    };
    
    ctx.selection.selectInBox('vertex', box, ctx.map, additive);
    
    this.isBoxSelecting = false;
    this.boxStartPos = null;
    ctx.renderer.setSelectionBox(null);
    ctx.renderer.requestRender();
  }
  
  private insertVertex(pos: Vec2, ctx: EditModeContext): void {
    const threshold = 8 / ctx.camera.zoom;
    const linedef = ctx.map.findLinedefNear(pos.x, pos.y, threshold);
    
    if (linedef) {
      // Split linedef
      const action = new SplitLinedefAction(ctx.map, linedef.id, pos);
      ctx.actions.execute(action);
    } else {
      // Create standalone vertex
      const action = new CreateVertexAction(ctx.map, pos.x, pos.y);
      ctx.actions.execute(action);
    }
    
    ctx.renderer.requestRender();
  }
  
  private deleteSelected(ctx: EditModeContext): void {
    const ids = Array.from(ctx.selection.getVertices());
    if (ids.length === 0) return;
    
    const action = new DeleteVerticesAction(ctx.map, ids);
    ctx.actions.execute(action);
    ctx.selection.clear('vertex');
    ctx.renderer.requestRender();
  }
  
  private deleteVertex(id: number, ctx: EditModeContext): void {
    const action = new DeleteVerticesAction(ctx.map, [id]);
    ctx.actions.execute(action);
    ctx.selection.deselect('vertex', id);
    ctx.renderer.requestRender();
  }
  
  private mergeSelectedVertices(ctx: EditModeContext): void {
    const ids = Array.from(ctx.selection.getVertices());
    if (ids.length < 2) return;
    
    const action = new MergeVerticesAction(ctx.map, ids);
    ctx.actions.execute(action);
    ctx.selection.clear('vertex');
    ctx.renderer.requestRender();
  }
  
  private joinSelectedVertices(ctx: EditModeContext): void {
    const ids = Array.from(ctx.selection.getVertices());
    if (ids.length !== 2) return;
    
    const action = new CreateLinedefAction(ctx.map, ids[0], ids[1]);
    ctx.actions.execute(action);
    ctx.renderer.requestRender();
  }
}
```

---

## Texture Management

### Architektura

```
/public/
└── resources/
    ├── doom1/
    │   ├── textures/
    │   │   ├── STARTAN2.png
    │   │   ├── DOOR1.png
    │   │   └── ...
    │   ├── flats/
    │   │   ├── FLOOR4_8.png
    │   │   ├── CEIL3_5.png
    │   │   └── ...
    │   └── manifest.json
    │
    ├── doom2/
    │   ├── textures/
    │   ├── flats/
    │   └── manifest.json
    │
    └── custom/              # User uploaded
        └── {projectId}/
            ├── textures/
            ├── flats/
            └── manifest.json
```

### TextureManager

```typescript
// src/core/textures/TextureManager.ts

export interface TextureInfo {
  name: string;
  width: number;
  height: number;
  category: 'texture' | 'flat';
  source: 'doom1' | 'doom2' | 'custom';
  url: string;
}

export interface TextureManifest {
  textures: TextureInfo[];
  flats: TextureInfo[];
}

export class TextureManager {
  private textures: Map<string, TextureInfo> = new Map();
  private flats: Map<string, TextureInfo> = new Map();
  private loadedImages: Map<string, HTMLImageElement> = new Map();
  private pixiTextures: Map<string, PIXI.Texture> = new Map();
  
  private baseUrl = '/resources';
  private currentGame: 'doom1' | 'doom2' = 'doom2';
  private customProjectId: string | null = null;
  
  async loadGame(game: 'doom1' | 'doom2'): Promise<void> {
    this.currentGame = game;
    const manifest = await this.loadManifest(`${this.baseUrl}/${game}/manifest.json`);
    this.registerTextures(manifest, game);
  }
  
  async loadCustomTextures(projectId: string): Promise<void> {
    this.customProjectId = projectId;
    try {
      const manifest = await this.loadManifest(
        `${this.baseUrl}/custom/${projectId}/manifest.json`
      );
      this.registerTextures(manifest, 'custom');
    } catch {
      console.log('No custom textures for project');
    }
  }
  
  private async loadManifest(url: string): Promise<TextureManifest> {
    const response = await fetch(url);
    return response.json();
  }
  
  private registerTextures(manifest: TextureManifest, source: 'doom1' | 'doom2' | 'custom'): void {
    for (const tex of manifest.textures) {
      tex.source = source;
      this.textures.set(tex.name.toUpperCase(), tex);
    }
    for (const flat of manifest.flats) {
      flat.source = source;
      this.flats.set(flat.name.toUpperCase(), flat);
    }
  }
  
  getTexture(name: string): TextureInfo | null {
    return this.textures.get(name.toUpperCase()) ?? null;
  }
  
  getFlat(name: string): TextureInfo | null {
    return this.flats.get(name.toUpperCase()) ?? null;
  }
  
  getAllTextures(): TextureInfo[] {
    return Array.from(this.textures.values());
  }
  
  getAllFlats(): TextureInfo[] {
    return Array.from(this.flats.values());
  }
  
  async getPixiTexture(name: string, category: 'texture' | 'flat'): Promise<PIXI.Texture> {
    const key = `${category}:${name.toUpperCase()}`;
    
    if (this.pixiTextures.has(key)) {
      return this.pixiTextures.get(key)!;
    }
    
    const info = category === 'texture' ? this.getTexture(name) : this.getFlat(name);
    if (!info) {
      return PIXI.Texture.EMPTY;
    }
    
    const texture = await PIXI.Assets.load(info.url);
    this.pixiTextures.set(key, texture);
    return texture;
  }
  
  // Search textures by name pattern
  search(pattern: string, category?: 'texture' | 'flat'): TextureInfo[] {
    const regex = new RegExp(pattern.replace('*', '.*'), 'i');
    const results: TextureInfo[] = [];
    
    if (!category || category === 'texture') {
      for (const tex of this.textures.values()) {
        if (regex.test(tex.name)) results.push(tex);
      }
    }
    
    if (!category || category === 'flat') {
      for (const flat of this.flats.values()) {
        if (regex.test(flat.name)) results.push(flat);
      }
    }
    
    return results;
  }
}
```

### Texture Browser Component

```typescript
// src/components/dialogs/TextureBrowser.tsx

interface TextureBrowserProps {
  category: 'texture' | 'flat';
  currentTexture?: string;
  onSelect: (textureName: string) => void;
  onClose: () => void;
}

export function TextureBrowser({ category, currentTexture, onSelect, onClose }: TextureBrowserProps) {
  const [search, setSearch] = useState('');
  const [textures, setTextures] = useState<TextureInfo[]>([]);
  const textureManager = useTextureManager();
  
  useEffect(() => {
    const all = category === 'texture' 
      ? textureManager.getAllTextures()
      : textureManager.getAllFlats();
    
    if (search) {
      setTextures(textureManager.search(search, category));
    } else {
      setTextures(all);
    }
  }, [search, category]);
  
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>
            {category === 'texture' ? 'Wall Textures' : 'Floor/Ceiling Flats'}
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex flex-col gap-4">
          <Input
            placeholder="Search textures..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          
          <div className="grid grid-cols-8 gap-2 overflow-y-auto max-h-[50vh]">
            {textures.map((tex) => (
              <button
                key={tex.name}
                className={cn(
                  "flex flex-col items-center p-1 border rounded hover:bg-accent",
                  tex.name === currentTexture && "ring-2 ring-primary"
                )}
                onClick={() => onSelect(tex.name)}
              >
                <img 
                  src={tex.url} 
                  alt={tex.name}
                  className="w-16 h-16 object-contain pixelated"
                />
                <span className="text-xs truncate w-full text-center">
                  {tex.name}
                </span>
              </button>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

---

## Keyboard Shortcuts

```typescript
// src/config/shortcuts.ts

export const DEFAULT_SHORTCUTS = {
  // Mode switching
  'mode.vertex': { key: 'v', description: 'Vertex Mode' },
  'mode.linedef': { key: 'l', description: 'Linedef Mode' },
  'mode.sector': { key: 's', description: 'Sector Mode' },
  'mode.thing': { key: 't', description: 'Thing Mode' },
  'mode.draw': { key: 'd', description: 'Draw Mode' },
  
  // Edit operations
  'edit.undo': { key: 'z', ctrl: true, description: 'Undo' },
  'edit.redo': { key: 'y', ctrl: true, description: 'Redo' },
  'edit.redoAlt': { key: 'z', ctrl: true, shift: true, description: 'Redo' },
  'edit.selectAll': { key: 'a', ctrl: true, description: 'Select All' },
  'edit.delete': { key: 'Delete', description: 'Delete Selection' },
  'edit.copy': { key: 'c', ctrl: true, description: 'Copy' },
  'edit.cut': { key: 'x', ctrl: true, description: 'Cut' },
  'edit.paste': { key: 'v', ctrl: true, description: 'Paste' },
  
  // Vertex mode
  'vertex.merge': { key: 'm', shift: true, description: 'Merge Vertices' },
  'vertex.join': { key: 'j', description: 'Join with Linedef' },
  
  // Linedef mode
  'linedef.flip': { key: 'f', description: 'Flip Linedef' },
  'linedef.split': { key: 's', shift: true, description: 'Split Linedef' },
  'linedef.align': { key: 'a', shift: true, description: 'Auto-align Textures' },
  
  // Sector mode
  'sector.join': { key: 'j', description: 'Join Sectors' },
  'sector.gradientFloor': { key: 'g', shift: true, description: 'Gradient Floors' },
  'sector.gradientLight': { key: 'b', shift: true, description: 'Gradient Brightness' },
  'sector.raiseFloor': { key: '=', description: 'Raise Floor (+8)' },
  'sector.lowerFloor': { key: '-', description: 'Lower Floor (-8)' },
  'sector.raiseCeiling': { key: '=', shift: true, description: 'Raise Ceiling (+8)' },
  'sector.lowerCeiling': { key: '-', shift: true, description: 'Lower Ceiling (-8)' },
  
  // Thing mode
  'thing.rotateLeft': { key: '[', description: 'Rotate 45° CCW' },
  'thing.rotateRight': { key: ']', description: 'Rotate 45° CW' },
  
  // View
  'view.toggleGrid': { key: 'g', description: 'Toggle Grid' },
  'view.gridIncrease': { key: ']', ctrl: true, description: 'Increase Grid' },
  'view.gridDecrease': { key: '[', ctrl: true, description: 'Decrease Grid' },
  'view.fitToMap': { key: 'Home', description: 'Fit Map to View' },
  'view.zoomIn': { key: '+', ctrl: true, description: 'Zoom In' },
  'view.zoomOut': { key: '-', ctrl: true, description: 'Zoom Out' },
  
  // File
  'file.save': { key: 's', ctrl: true, description: 'Save' },
  'file.open': { key: 'o', ctrl: true, description: 'Open' },
  'file.new': { key: 'n', ctrl: true, description: 'New Map' },
  'file.export': { key: 'e', ctrl: true, description: 'Export WAD' },
  
  // General
  'general.escape': { key: 'Escape', description: 'Cancel / Clear Selection' },
  'general.properties': { key: 'Enter', description: 'Edit Properties' },
};

export type ShortcutAction = keyof typeof DEFAULT_SHORTCUTS;
```

---

## Doporučená Implementační Sekvence

### Fáze 1: Core Infrastructure
1. `EditModeContext` interface
2. `ModeManager` class
3. `SelectionManager` class
4. `SnapSystem` class
5. Base `EditMode` interface

### Fáze 2: Basic Modes
1. `VertexMode` - select, move, delete
2. `LinedefMode` - select, move, delete, flip
3. Keyboard shortcuts integration
4. Context menu support

### Fáze 3: Drawing & Creation
1. Drawing in LinedefMode
2. Auto sector detection (SectorBuilder)
3. `SectorMode` - select, adjust heights
4. `ThingMode` - place, rotate

### Fáze 4: Textures
1. `TextureManager` setup
2. Texture browser dialog
3. Sidedef texture editing
4. Floor/ceiling flat editing

### Fáze 5: Advanced Features
1. Copy/paste
2. Auto texture alignment
3. Gradient tools
4. Properties dialogs

---

## Reference

- [Ultimate Doom Builder](https://github.com/UltimateDoomBuilder/UltimateDoomBuilder)
- [DoomBuilderX](https://github.com/anotak/doombuilderx)
- [Doom Builder Documentation](https://documentation.help/Doom-Builder/)
- [ZDoom Wiki - Editing](https://zdoom.org/wiki/Category:Editing)

---

*Dokument vytvořen: 2026-01-10*