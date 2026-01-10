import { ModeManager } from './ModeManager';
import { ActionStack } from './ActionStack';
import { SelectionManager } from './SelectionManager';
import { SnapSystem } from './SnapSystem';
import { KeyboardState } from './KeyboardState';
import { VertexMode } from './modes/VertexMode';
import { LinedefMode } from './modes/LinedefMode';
import { SectorMode } from './modes/SectorMode';
import { ThingMode } from './modes/ThingMode';
import type { EditModeContext, SelectionType } from './interfaces';
import type { MapData } from '../map/MapData';
import type { Renderer } from '../../renderer/Renderer';

export class EditorController {
  modeManager: ModeManager;
  actionStack: ActionStack;
  selectionManager: SelectionManager;
  snapSystem: SnapSystem;
  keyboard: KeyboardState;
  context: EditModeContext;
  map: MapData;
  renderer: Renderer;

  constructor(map: MapData, renderer: Renderer) {
    this.map = map;
    this.renderer = renderer;
    // Initialize systems
    this.actionStack = new ActionStack();
    this.selectionManager = new SelectionManager();
    this.snapSystem = new SnapSystem(map);
    this.keyboard = new KeyboardState();

    // Create context
    this.context = {
      map,
      renderer,
      actions: this.actionStack,
      selection: this.selectionManager,
      snap: this.snapSystem,
      camera: renderer.camera,
      keyboard: this.keyboard,
    };

    // Initialize mode manager
    this.modeManager = new ModeManager(this.context);

    // Register modes
    this.modeManager.registerMode(new VertexMode());
    this.modeManager.registerMode(new LinedefMode());
    this.modeManager.registerMode(new SectorMode());
    this.modeManager.registerMode(new ThingMode());

    // Set initial mode
    this.modeManager.setMode('Vertices');
  }

  // Mode management
  setMode(modeName: string): void {
    this.modeManager.setMode(modeName);
  }

  getCurrentModeName(): string | null {
    return this.modeManager.getCurrentMode()?.name ?? null;
  }

  // Input handling
  handleMouseDown(event: MouseEvent, screenX: number, screenY: number): void {
    const worldPos = this.renderer.screenToWorld(screenX, screenY);
    this.modeManager.handleMouseDown(event, worldPos);
  }

  handleMouseMove(event: MouseEvent, screenX: number, screenY: number): void {
    const worldPos = this.renderer.screenToWorld(screenX, screenY);
    this.modeManager.handleMouseMove(event, worldPos);
  }

  handleMouseUp(event: MouseEvent, screenX: number, screenY: number): void {
    const worldPos = this.renderer.screenToWorld(screenX, screenY);
    this.modeManager.handleMouseUp(event, worldPos);
  }

  handleWheel(event: WheelEvent): void {
    this.modeManager.handleWheel(event);
  }

  handleKeyDown(event: KeyboardEvent): boolean {
    return this.modeManager.handleKeyDown(event);
  }

  handleKeyUp(event: KeyboardEvent): void {
    this.modeManager.handleKeyUp(event);
  }

  // Snap configuration
  setGridSize(size: number): void {
    this.snapSystem.setConfig({ gridSize: size });
  }

  setSnapToGrid(enabled: boolean): void {
    this.snapSystem.setConfig({ snapToGrid: enabled });
  }

  // Action system
  undo(): void {
    this.actionStack.undo();
    this.renderer.requestRender();
  }

  redo(): void {
    this.actionStack.redo();
    this.renderer.requestRender();
  }

  canUndo(): boolean {
    return this.actionStack.canUndo();
  }

  canRedo(): boolean {
    return this.actionStack.canRedo();
  }

  // Selection
  getSelection() {
    return this.selectionManager;
  }

  // Get highlighted elements from current mode
  getHighlightedElements(): {
    vertex: number | null;
    linedef: number | null;
    sector: number | null;
    thing: number | null;
  } {
    return this.modeManager.getHighlightedElements();
  }

  // Get overlay state from current mode
  getOverlayState() {
    return this.modeManager.getOverlayState();
  }

  // Subscribe to mode changes
  onModeChange(callback: (modeName: string) => void): () => void {
    return this.modeManager.onModeChange((mode) => callback(mode.name));
  }

  // Set callback for when a mode requests the properties dialog
  // If elementId is provided, it's for a hover element (not selected)
  setPropertiesDialogCallback(callback: (type: SelectionType, elementId?: number) => void): void {
    this.context.requestPropertiesDialog = callback;
  }

  // Set callback for when a mode requests the thing picker dialog
  setThingPickerCallback(callback: () => void): void {
    this.context.requestThingPicker = callback;
  }

  // Set callbacks for getting/setting last thing type
  setThingTypeCallbacks(getter: () => number, setter: (type: number) => void): void {
    this.context.getLastThingType = getter;
    this.context.setLastThingType = setter;
  }

  // Clean up
  destroy(): void {
    this.keyboard.destroy();
  }
}
