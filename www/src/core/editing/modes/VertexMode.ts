import type { EditMode, EditModeContext, Vec2, BBox, ContextMenuItem, OverlayState } from '../interfaces';
import type { Vertex } from '../../map/types';
import {
  MoveVerticesAction,
  CreateVertexAction,
  CreateLinedefAction,
  SplitLinedefAction,
  MergeVerticesAction,
} from '../actions/VertexActions';
import { SmartDeleteVerticesAction } from '../actions/SmartDeleteActions';

export class VertexMode implements EditMode {
  readonly name = 'Vertices';
  readonly cursor = 'crosshair';
  readonly shortcut = 'v';

  private isDragging = false;
  private isBoxSelecting = false;
  private dragStartPos: Vec2 | null = null;
  private boxStartPos: Vec2 | null = null;
  private currentMousePos: Vec2 | null = null;
  private originalPositions: Map<number, Vec2> = new Map();
  private highlightedVertexId: number | null = null;
  private dragReferenceVertexId: number | null = null;

  // RMB click detection
  private rmbDownPos: Vec2 | null = null;
  private rmbDownTime: number = 0;
  private rmbPendingPropertiesOpen = false;
  private rmbHoverDragVertexId: number | null = null; // Track vertex selected just for hover drag
  private static readonly CLICK_THRESHOLD_DISTANCE = 5;
  private static readonly CLICK_THRESHOLD_TIME = 300;

  onEnter(ctx: EditModeContext): void {
    // Clear other selections
    ctx.selection.clear('linedef');
    ctx.selection.clear('sector');
    ctx.selection.clear('thing');
  }

  onExit(ctx: EditModeContext): void {
    this.cancelDrag(ctx);
  }

  onMouseDown(event: MouseEvent, worldPos: Vec2, ctx: EditModeContext): void {
    const snapped = ctx.snap.snap(worldPos, ctx.camera.zoom);
    const vertex = this.findVertexAt(worldPos, ctx);

    if (event.button === 0) {
      // Left click
      if (vertex) {
        // LMB + hover on vertex = add to selection
        ctx.selection.select('vertex', vertex.id, true); // Always additive
        ctx.renderer.requestRender();
      } else {
        // LMB on empty space = deselect all, then start box select
        ctx.selection.clearAll();
        this.startBoxSelect(worldPos);
        ctx.renderer.requestRender();
      }
    } else if (event.button === 2) {
      // Right click - track for click vs drag detection
      this.rmbDownPos = worldPos;
      this.rmbDownTime = Date.now();
      this.rmbPendingPropertiesOpen = false;

      if (ctx.selection.count('vertex') > 0) {
        // RMB when something is selected
        this.rmbPendingPropertiesOpen = true;
        this.rmbHoverDragVertexId = null; // Not a hover drag
        this.dragReferenceVertexId = this.findClosestSelectedVertex(worldPos, ctx);
        this.startDrag(snapped.position, ctx);
      } else if (vertex) {
        // RMB + hover on vertex (nothing selected) = temporarily select for drag
        ctx.selection.select('vertex', vertex.id);
        this.rmbPendingPropertiesOpen = true;
        this.rmbHoverDragVertexId = vertex.id; // Remember this is a hover drag
        this.dragReferenceVertexId = vertex.id;
        this.startDrag(snapped.position, ctx);
        ctx.renderer.requestRender();
      } else {
        // RMB on empty space (nothing selected) = insert vertex
        this.insertVertex(snapped.position, ctx);
      }
    }
  }

  onMouseMove(event: MouseEvent, worldPos: Vec2, ctx: EditModeContext): void {
    const excludeIds = this.isDragging ? new Set(this.originalPositions.keys()) : undefined;
    this.currentMousePos = worldPos;

    // Check if RMB movement exceeds click threshold
    if (this.rmbDownPos && this.rmbPendingPropertiesOpen) {
      const dx = worldPos.x - this.rmbDownPos.x;
      const dy = worldPos.y - this.rmbDownPos.y;
      const distanceWorld = Math.sqrt(dx * dx + dy * dy);
      const distanceScreen = distanceWorld * ctx.camera.zoom;

      if (distanceScreen > VertexMode.CLICK_THRESHOLD_DISTANCE) {
        this.rmbPendingPropertiesOpen = false;
      }
    }

    if (this.isDragging && this.dragStartPos) {
      // Calculate movement delta from drag start
      const rawDx = worldPos.x - this.dragStartPos.x;
      const rawDy = worldPos.y - this.dragStartPos.y;

      // Determine snapped delta using reference vertex
      let dx: number, dy: number;
      if (this.dragReferenceVertexId !== null) {
        const refOrig = this.originalPositions.get(this.dragReferenceVertexId);
        if (refOrig) {
          // Calculate where the reference vertex would be after raw movement
          const refNewPos = { x: refOrig.x + rawDx, y: refOrig.y + rawDy };
          // Snap that position to grid/vertices
          const snapped = ctx.snap.snap(refNewPos, ctx.camera.zoom, excludeIds);
          // Delta is difference between snapped position and original position
          dx = snapped.position.x - refOrig.x;
          dy = snapped.position.y - refOrig.y;
        } else {
          // Fallback: snap raw delta
          const snapped = ctx.snap.snapToGrid({ x: rawDx, y: rawDy });
          dx = snapped.x;
          dy = snapped.y;
        }
      } else {
        // No reference vertex - snap delta directly
        const snapped = ctx.snap.snapToGrid({ x: rawDx, y: rawDy });
        dx = snapped.x;
        dy = snapped.y;
      }

      // Apply delta to all vertices
      for (const [id, orig] of this.originalPositions) {
        const vertex = ctx.map.vertices.get(id);
        if (vertex) {
          vertex.x = orig.x + dx;
          vertex.y = orig.y + dy;
        }
      }

      ctx.renderer.requestRender();
    } else if (this.isBoxSelecting && this.boxStartPos) {
      ctx.renderer.requestRender();
    } else {
      // Update highlight
      const vertex = this.findVertexAt(worldPos, ctx);
      const newHighlight = vertex?.id ?? null;

      if (newHighlight !== this.highlightedVertexId) {
        this.highlightedVertexId = newHighlight;
        ctx.renderer.requestRender();
      }
    }
  }

  onMouseUp(event: MouseEvent, worldPos: Vec2, ctx: EditModeContext): void {
    // Check for RMB click (not drag) to open properties
    if (event.button === 2 && this.rmbPendingPropertiesOpen && this.rmbDownPos) {
      const elapsed = Date.now() - this.rmbDownTime;
      const dx = worldPos.x - this.rmbDownPos.x;
      const dy = worldPos.y - this.rmbDownPos.y;
      const distanceWorld = Math.sqrt(dx * dx + dy * dy);
      const distanceScreen = distanceWorld * ctx.camera.zoom;

      if (elapsed < VertexMode.CLICK_THRESHOLD_TIME && distanceScreen < VertexMode.CLICK_THRESHOLD_DISTANCE) {
        // This was a click, not a drag - cancel the drag and open properties
        this.cancelDrag(ctx);
        this.rmbDownPos = null;
        this.rmbPendingPropertiesOpen = false;

        // Request properties dialog
        if (ctx.selection.count('vertex') > 0 && ctx.requestPropertiesDialog) {
          ctx.requestPropertiesDialog('vertex');
        }
        return;
      }
    }

    // Reset RMB tracking
    this.rmbDownPos = null;
    this.rmbPendingPropertiesOpen = false;

    if (this.isDragging && this.dragStartPos) {
      this.finishDrag(worldPos, ctx);
    } else if (this.isBoxSelecting && this.boxStartPos) {
      this.finishBoxSelect(worldPos, false, ctx);
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
    const vertex = this.findVertexAt(worldPos, ctx);

    if (vertex) {
      items.push({
        label: 'Delete Vertex',
        shortcut: 'Del',
        action: () => this.deleteVertex(vertex.id, ctx),
      });

      items.push({
        label: 'Properties...',
        action: () => {
          console.log('Show vertex properties', vertex.id);
        },
      });
    } else {
      items.push({
        label: 'Insert Vertex Here',
        action: () => this.insertVertex(worldPos, ctx),
      });
    }

    if (ctx.selection.count('vertex') >= 2) {
      items.push({ separator: true, label: '', action: () => {} });
      items.push({
        label: 'Merge Vertices',
        shortcut: 'Shift+M',
        action: () => this.mergeSelectedVertices(ctx),
      });
      items.push({
        label: 'Join with Linedef',
        shortcut: 'J',
        action: () => this.joinSelectedVertices(ctx),
        disabled: ctx.selection.count('vertex') !== 2,
      });
    }

    return items;
  }

  renderOverlay(ctx: EditModeContext): void {
    // Could render additional overlays here
  }

  // === PRIVATE METHODS ===

  private findVertexAt(pos: Vec2, ctx: EditModeContext): Vertex | null {
    const threshold = 8 / ctx.camera.zoom;
    return ctx.map.findVertexNear(pos.x, pos.y, threshold);
  }

  /**
   * Find the closest vertex from currently selected vertices to a given position.
   * Used to determine which vertex to use as reference for grid snapping during drag.
   */
  private findClosestSelectedVertex(pos: Vec2, ctx: EditModeContext): number | null {
    let closestId: number | null = null;
    let closestDist = Infinity;

    for (const vertexId of ctx.selection.getVertices()) {
      const vertex = ctx.map.vertices.get(vertexId);
      if (!vertex) continue;

      const dx = vertex.x - pos.x;
      const dy = vertex.y - pos.y;
      const dist = dx * dx + dy * dy;

      if (dist < closestDist) {
        closestDist = dist;
        closestId = vertexId;
      }
    }

    return closestId;
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

  private finishDrag(_worldPos: Vec2, ctx: EditModeContext): void {
    if (!this.dragStartPos) return;

    // Calculate delta from current vertex positions (already snapped during onMouseMove)
    // This ensures "what you see is what you get" - no jumping on mouse release
    let dx = 0, dy = 0;

    // Use reference vertex if available, otherwise use first vertex
    const refId = this.dragReferenceVertexId ?? this.originalPositions.keys().next().value;
    if (refId !== undefined) {
      const refOrig = this.originalPositions.get(refId);
      const refCurrent = ctx.map.vertices.get(refId);
      if (refOrig && refCurrent) {
        dx = refCurrent.x - refOrig.x;
        dy = refCurrent.y - refOrig.y;
      }
    }

    // Restore original positions (before applying undoable action)
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
        dx,
        dy
      );
      ctx.actions.execute(action);
    }

    // If this was a hover drag (single vertex selected just for dragging), deselect it
    if (this.rmbHoverDragVertexId !== null) {
      ctx.selection.deselect('vertex', this.rmbHoverDragVertexId);
      this.rmbHoverDragVertexId = null;
    }

    this.isDragging = false;
    this.dragStartPos = null;
    this.dragReferenceVertexId = null;
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

    // If this was a hover drag, deselect the vertex
    if (this.rmbHoverDragVertexId !== null) {
      ctx.selection.deselect('vertex', this.rmbHoverDragVertexId);
      this.rmbHoverDragVertexId = null;
    }

    this.isDragging = false;
    this.dragStartPos = null;
    this.dragReferenceVertexId = null;
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

    const action = new SmartDeleteVerticesAction(ctx.map, ids);
    ctx.actions.execute(action);
    ctx.selection.clear('vertex');
    ctx.renderer.requestRender();
  }

  private deleteVertex(id: number, ctx: EditModeContext): void {
    const action = new SmartDeleteVerticesAction(ctx.map, [id]);
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

  getHighlightedVertex(): number | null {
    return this.highlightedVertexId;
  }

  getOverlayState(): OverlayState {
    const state: OverlayState = {};

    if (this.isBoxSelecting && this.boxStartPos && this.currentMousePos) {
      state.selectionBox = {
        startX: this.boxStartPos.x,
        startY: this.boxStartPos.y,
        endX: this.currentMousePos.x,
        endY: this.currentMousePos.y,
      };
    }

    return state;
  }
}
