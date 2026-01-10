// Core editing system interfaces
import type { MapData } from '../map/MapData';
import type { Renderer } from '../../renderer/Renderer';
import type { Camera } from '../../renderer/Camera';
import type { Vec2, BBox } from '../map/types';

// Re-export types from map types
export type { Vec2, BBox };

// === MAP ELEMENT INTERFACE ===

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
  snapDistance: number; // in world units
}

export interface SnapResult {
  position: Vec2;
  snappedTo: 'grid' | 'vertex' | 'line' | 'none';
  snapTarget?: MapElement;
}

// === SELECTION TYPES ===

export type SelectionType = 'vertex' | 'linedef' | 'sector' | 'thing';

// === ACTION SYSTEM ===

export interface Action {
  readonly name: string;
  execute(): void;
  undo(): void;
  canMerge?(other: Action): boolean;
  merge?(other: Action): void;
}

// === CONTEXT MENU ===

export interface ContextMenuItem {
  label: string;
  action: () => void;
  shortcut?: string;
  separator?: boolean;
  disabled?: boolean;
  submenu?: ContextMenuItem[];
}

// === EDIT MODE CONTEXT ===

// Forward declarations for classes that will be implemented
export interface ActionStack {
  execute(action: Action): void;
  undo(): void;
  redo(): void;
  canUndo(): boolean;
  canRedo(): boolean;
  clear(): void;
}

export interface SelectionManager {
  getVertices(): ReadonlySet<number>;
  getLinedefs(): ReadonlySet<number>;
  getSectors(): ReadonlySet<number>;
  getThings(): ReadonlySet<number>;
  hasSelection(type?: SelectionType): boolean;
  count(type: SelectionType): number;
  select(type: SelectionType, id: number, additive?: boolean): void;
  selectMultiple(type: SelectionType, ids: number[], additive?: boolean): void;
  deselect(type: SelectionType, id: number): void;
  toggle(type: SelectionType, id: number): void;
  isSelected(type: SelectionType, id: number): boolean;
  clearAll(): void;
  clear(type: SelectionType): void;
  selectInBox(type: SelectionType, box: BBox, map: MapData, additive?: boolean): number;
  selectAll(type: SelectionType, map: MapData): void;
  invertSelection(type: SelectionType, map: MapData): void;
  subscribe(listener: () => void): () => void;
}

export interface SnapSystem {
  snap(pos: Vec2, cameraZoom: number, excludeVertices?: Set<number>): SnapResult;
  snapToGrid(pos: Vec2): Vec2;
  setConfig(config: Partial<SnapConfig>): void;
  getConfig(): SnapConfig;
}

export interface SnapConfig {
  gridSize: number;
  snapToGrid: boolean;
  snapToVertices: boolean;
  snapToLines: boolean;
  snapDistance: number;
}

export interface KeyboardState {
  isKeyDown(key: string): boolean;
  isShiftDown(): boolean;
  isCtrlDown(): boolean;
  isAltDown(): boolean;
}

export interface EditModeContext {
  map: MapData;
  renderer: Renderer;
  actions: ActionStack;
  selection: SelectionManager;
  snap: SnapSystem;
  camera: Camera;
  keyboard: KeyboardState;
  // Callbacks to parent UI
  // If elementId is provided, show properties for that specific element (hover case)
  // If elementId is not provided, show properties for current selection
  requestPropertiesDialog?: (type: SelectionType, elementId?: number) => void;
  requestThingPicker?: () => void;
  // Getters for editor state
  getLastThingType?: () => number;
  setLastThingType?: (type: number) => void;
}

// === OVERLAY STATE ===

export interface OverlayState {
  selectionBox?: {
    startX: number;
    startY: number;
    endX: number;
    endY: number;
  } | null;
  drawingLine?: {
    startX: number;
    startY: number;
    endX: number;
    endY: number;
  } | null;
}

// === EDIT MODE INTERFACE ===

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
  getOverlayState(): OverlayState;
}
