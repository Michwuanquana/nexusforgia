import type { EditMode, EditModeContext, Vec2, BBox, ContextMenuItem, OverlayState } from '../interfaces';
import type { Thing } from '../../map/types';
import { CreateThingAction, DeleteThingsAction, MoveThingsAction } from '../actions/ThingActions';

export class ThingMode implements EditMode {
  readonly name = 'Things';
  readonly cursor = 'crosshair';
  readonly shortcut = 't';

  private isDragging = false;
  private isBoxSelecting = false;
  private dragStartPos: Vec2 | null = null;
  private boxStartPos: Vec2 | null = null;
  private currentMousePos: Vec2 | null = null;
  private originalPositions: Map<number, Vec2> = new Map();
  private highlightedThingId: number | null = null;

  // RMB click detection
  private rmbDownPos: Vec2 | null = null;
  private rmbDownTime: number = 0;
  private rmbPendingPropertiesOpen = false;
  private rmbHoverDragThingId: number | null = null; // Track thing selected just for hover drag
  private rmbHoverThingId: number | null = null; // Track hover thing for properties (NOT selected)
  private static readonly CLICK_THRESHOLD_DISTANCE = 5;
  private static readonly CLICK_THRESHOLD_TIME = 300;

  onEnter(ctx: EditModeContext): void {
    ctx.selection.clear('vertex');
    ctx.selection.clear('linedef');
    ctx.selection.clear('sector');
  }

  onExit(ctx: EditModeContext): void {
    this.cancelDrag(ctx);
  }

  onMouseDown(event: MouseEvent, worldPos: Vec2, ctx: EditModeContext): void {
    const snapped = ctx.snap.snap(worldPos, ctx.camera.zoom);

    if (event.button === 0) {
      // Left click
      const thing = this.findThingAt(snapped.position, ctx);

      if (thing) {
        if (!event.shiftKey && !ctx.selection.isSelected('thing', thing.id)) {
          ctx.selection.clearAll();
        }
        ctx.selection.select('thing', thing.id, event.shiftKey);
        this.startDrag(snapped.position, ctx);
      } else {
        if (!event.shiftKey) {
          ctx.selection.clearAll();
        }
        this.startBoxSelect(snapped.position);
      }
    } else if (event.button === 2) {
      // Right click - track for click vs drag detection
      this.rmbDownPos = worldPos;
      this.rmbDownTime = Date.now();
      this.rmbPendingPropertiesOpen = false;
      this.rmbHoverThingId = null;

      const thing = this.findThingAt(snapped.position, ctx);
      if (ctx.selection.count('thing') > 0) {
        // RMB when something is selected
        this.rmbPendingPropertiesOpen = true;
        this.rmbHoverDragThingId = null; // Not a hover drag
        this.startDrag(snapped.position, ctx);
      } else if (thing) {
        // RMB + hover on thing (nothing selected)
        // Don't select yet - wait to see if it's a click (properties) or drag (move)
        this.rmbPendingPropertiesOpen = true;
        this.rmbHoverThingId = thing.id; // Remember hover for properties
        this.rmbHoverDragThingId = thing.id; // Also for drag deselect
        // Temporarily select for visual feedback and drag setup
        ctx.selection.select('thing', thing.id);
        this.startDrag(snapped.position, ctx);
        ctx.renderer.requestRender();
      } else {
        // RMB on empty space = insert thing and start dragging it
        this.insertThingAndDrag(snapped.position, ctx);
      }
    }
  }

  onMouseMove(event: MouseEvent, worldPos: Vec2, ctx: EditModeContext): void {
    const excludeIds = this.isDragging ? new Set(this.originalPositions.keys()) : undefined;
    const snapped = ctx.snap.snap(worldPos, ctx.camera.zoom, excludeIds);
    this.currentMousePos = snapped.position;

    // Check if RMB movement exceeds click threshold
    if (this.rmbDownPos && this.rmbPendingPropertiesOpen) {
      const dx = worldPos.x - this.rmbDownPos.x;
      const dy = worldPos.y - this.rmbDownPos.y;
      const distanceWorld = Math.sqrt(dx * dx + dy * dy);
      const distanceScreen = distanceWorld * ctx.camera.zoom;

      if (distanceScreen > ThingMode.CLICK_THRESHOLD_DISTANCE) {
        this.rmbPendingPropertiesOpen = false;
      }
    }

    if (this.isDragging && this.dragStartPos) {
      const dx = snapped.position.x - this.dragStartPos.x;
      const dy = snapped.position.y - this.dragStartPos.y;

      for (const [id, orig] of this.originalPositions) {
        const thing = ctx.map.things.get(id);
        if (thing) {
          thing.x = orig.x + dx;
          thing.y = orig.y + dy;
        }
      }

      ctx.renderer.requestRender();
    } else if (this.isBoxSelecting && this.boxStartPos) {
      ctx.renderer.requestRender();
    } else {
      const thing = this.findThingAt(snapped.position, ctx);
      const newHighlight = thing?.id ?? null;

      if (newHighlight !== this.highlightedThingId) {
        this.highlightedThingId = newHighlight;
        ctx.renderer.requestRender();
      }
    }
  }

  onMouseUp(event: MouseEvent, worldPos: Vec2, ctx: EditModeContext): void {
    const excludeIds = this.isDragging ? new Set(this.originalPositions.keys()) : undefined;
    const snapped = ctx.snap.snap(worldPos, ctx.camera.zoom, excludeIds);

    // Check for RMB click (not drag) to open properties
    if (event.button === 2 && this.rmbPendingPropertiesOpen && this.rmbDownPos) {
      const elapsed = Date.now() - this.rmbDownTime;
      const dx = worldPos.x - this.rmbDownPos.x;
      const dy = worldPos.y - this.rmbDownPos.y;
      const distanceWorld = Math.sqrt(dx * dx + dy * dy);
      const distanceScreen = distanceWorld * ctx.camera.zoom;

      if (elapsed < ThingMode.CLICK_THRESHOLD_TIME && distanceScreen < ThingMode.CLICK_THRESHOLD_DISTANCE) {
        // This was a click, not a drag - cancel the drag and open properties
        this.cancelDrag(ctx);

        // If this was a hover click (nothing was selected before), open properties for hover element
        // but DON'T keep it selected
        if (this.rmbHoverThingId !== null && ctx.requestPropertiesDialog) {
          // The thing was temporarily selected, deselect it
          ctx.selection.deselect('thing', this.rmbHoverThingId);
          // Open properties for the hover thing (pass the ID)
          ctx.requestPropertiesDialog('thing', this.rmbHoverThingId);
        } else if (ctx.selection.count('thing') > 0 && ctx.requestPropertiesDialog) {
          // Normal case: something was already selected, open properties for selection
          ctx.requestPropertiesDialog('thing');
        }

        this.rmbDownPos = null;
        this.rmbPendingPropertiesOpen = false;
        this.rmbHoverThingId = null;
        return;
      }
    }

    // Reset RMB tracking
    this.rmbDownPos = null;
    this.rmbPendingPropertiesOpen = false;
    this.rmbHoverThingId = null;

    if (this.isDragging && this.dragStartPos) {
      this.finishDrag(snapped.position, ctx);
    } else if (this.isBoxSelecting && this.boxStartPos) {
      this.finishBoxSelect(snapped.position, event.shiftKey, ctx);
    }
  }

  onWheel(event: WheelEvent, ctx: EditModeContext): void {
    // Camera handles zoom
  }

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
        ctx.renderer.requestRender();
        return true;

      case 'a':
      case 'A':
        if (event.ctrlKey) {
          ctx.selection.selectAll('thing', ctx.map);
          ctx.renderer.requestRender();
          return true;
        }
        break;

      case 'z':
      case 'Z':
        if (event.ctrlKey && !event.shiftKey) {
          ctx.actions.undo();
          ctx.renderer.requestRender();
          return true;
        } else if (event.ctrlKey && event.shiftKey) {
          ctx.actions.redo();
          ctx.renderer.requestRender();
          return true;
        }
        break;

      case 'y':
      case 'Y':
        if (event.ctrlKey) {
          ctx.actions.redo();
          ctx.renderer.requestRender();
          return true;
        }
        break;
    }

    return false;
  }

  onKeyUp(event: KeyboardEvent, ctx: EditModeContext): void {
    // No key up handling needed
  }

  getContextMenuItems(worldPos: Vec2, ctx: EditModeContext): ContextMenuItem[] {
    const items: ContextMenuItem[] = [];
    const thing = this.findThingAt(worldPos, ctx);

    if (thing) {
      items.push({
        label: 'Thing Properties...',
        action: () => {
          console.log('Show thing properties', thing.id);
        },
      });
    }

    return items;
  }

  renderOverlay(ctx: EditModeContext): void {
    // Could render additional overlays here
  }

  // === PRIVATE METHODS ===

  private findThingAt(pos: Vec2, ctx: EditModeContext): Thing | null {
    const threshold = 16 / ctx.camera.zoom; // Things are larger
    let closest: Thing | null = null;
    let closestDist = threshold * threshold;

    for (const thing of ctx.map.things.values()) {
      const dx = thing.x - pos.x;
      const dy = thing.y - pos.y;
      const distSq = dx * dx + dy * dy;
      if (distSq < closestDist) {
        closestDist = distSq;
        closest = thing;
      }
    }

    return closest;
  }

  private startDrag(pos: Vec2, _ctx: EditModeContext): void {
    this.isDragging = true;
    this.dragStartPos = pos;
    this.originalPositions.clear();

    for (const id of _ctx.selection.getThings()) {
      const thing = _ctx.map.things.get(id);
      if (thing) {
        this.originalPositions.set(id, { x: thing.x, y: thing.y });
      }
    }
  }

  private finishDrag(pos: Vec2, ctx: EditModeContext): void {
    if (!this.dragStartPos) return;

    const dx = pos.x - this.dragStartPos.x;
    const dy = pos.y - this.dragStartPos.y;

    // Restore original positions before executing action
    for (const [id, orig] of this.originalPositions) {
      const thing = ctx.map.things.get(id);
      if (thing) {
        thing.x = orig.x;
        thing.y = orig.y;
      }
    }

    // Create undoable action if moved
    if (Math.abs(dx) > 0.001 || Math.abs(dy) > 0.001) {
      const action = new MoveThingsAction(
        ctx.map,
        Array.from(this.originalPositions.keys()),
        dx,
        dy
      );
      ctx.actions.execute(action);
    }

    // If this was a hover drag (single thing selected just for dragging), deselect it
    if (this.rmbHoverDragThingId !== null) {
      ctx.selection.deselect('thing', this.rmbHoverDragThingId);
      this.rmbHoverDragThingId = null;
    }

    this.isDragging = false;
    this.dragStartPos = null;
    this.originalPositions.clear();
    ctx.renderer.requestRender();
  }

  private cancelDrag(ctx: EditModeContext): void {
    // Restore positions
    for (const [id, orig] of this.originalPositions) {
      const thing = ctx.map.things.get(id);
      if (thing) {
        thing.x = orig.x;
        thing.y = orig.y;
      }
    }

    // If this was a hover drag, deselect the thing
    if (this.rmbHoverDragThingId !== null) {
      ctx.selection.deselect('thing', this.rmbHoverDragThingId);
      this.rmbHoverDragThingId = null;
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

    ctx.selection.selectInBox('thing', box, ctx.map, additive);

    this.isBoxSelecting = false;
    this.boxStartPos = null;
    ctx.renderer.requestRender();
  }

  getHighlightedThing(): number | null {
    return this.highlightedThingId;
  }

  private insertThingAndDrag(pos: Vec2, ctx: EditModeContext): void {
    // Use last thing type from editor state, or default to 1 (Player 1 start)
    const thingType = ctx.getLastThingType?.() ?? 1;
    const action = new CreateThingAction(ctx.map, pos.x, pos.y, thingType);
    ctx.actions.execute(action);

    // Select the new thing and start dragging it
    const newId = action.getCreatedId();
    if (newId !== null) {
      ctx.selection.clearAll();
      ctx.selection.select('thing', newId, false);
      this.rmbHoverDragThingId = newId; // Treat as hover drag so it deselects after
      this.startDrag(pos, ctx);
    }

    ctx.renderer.requestRender();
  }

  private deleteSelected(ctx: EditModeContext): void {
    const ids = Array.from(ctx.selection.getThings());
    if (ids.length === 0) return;

    const action = new DeleteThingsAction(ctx.map, ids);
    ctx.actions.execute(action);
    ctx.selection.clear('thing');
    ctx.renderer.requestRender();
  }

  getOverlayState(): OverlayState {
    return {
      selectionBox: this.isBoxSelecting && this.boxStartPos && this.currentMousePos ? {
        startX: this.boxStartPos.x,
        startY: this.boxStartPos.y,
        endX: this.currentMousePos.x,
        endY: this.currentMousePos.y,
      } : null,
    };
  }
}
