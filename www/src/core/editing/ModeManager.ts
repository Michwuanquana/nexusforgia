import type { EditMode, EditModeContext, Vec2, ContextMenuItem, OverlayState } from './interfaces';
import { LinedefMode } from './modes/LinedefMode';

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

  getHighlightedElements(): {
    vertex: number | null;
    linedef: number | null;
    sector: number | null;
    thing: number | null;
  } {
    const mode = this.currentMode as unknown as {
      getHighlightedVertex?: () => number | null;
      getHighlightedLinedef?: () => number | null;
      getHighlightedSector?: () => number | null;
      getHighlightedThing?: () => number | null;
    };

    return {
      vertex: mode?.getHighlightedVertex?.() ?? null,
      linedef: mode?.getHighlightedLinedef?.() ?? null,
      sector: mode?.getHighlightedSector?.() ?? null,
      thing: mode?.getHighlightedThing?.() ?? null,
    };
  }

  getOverlayState(): OverlayState {
    if (!this.currentMode) return {};

    const state = this.currentMode.getOverlayState();

    // Special handling for LinedefMode drawing line
    if (this.currentMode instanceof LinedefMode) {
      state.drawingLine = this.currentMode.getDrawingLineState(this.context);
    }

    return state;
  }
}
