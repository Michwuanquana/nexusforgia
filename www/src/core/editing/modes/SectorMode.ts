import type { EditMode, EditModeContext, Vec2, BBox, ContextMenuItem, OverlayState } from '../interfaces';
import type { Sector } from '../../map/types';
import { SmartDeleteSectorsAction } from '../actions/SmartDeleteActions';
import { MoveVerticesAction } from '../actions/VertexActions';

export class SectorMode implements EditMode {
  readonly name = 'Sectors';
  readonly cursor = 'pointer';
  readonly shortcut = 's';

  private isDragging = false;
  private isBoxSelecting = false;
  private dragStartPos: Vec2 | null = null;
  private boxStartPos: Vec2 | null = null;
  private currentMousePos: Vec2 | null = null;
  private originalPositions: Map<number, Vec2> = new Map();
  private highlightedSectorId: number | null = null;
  private highlightedVertexId: number | null = null;
  private dragReferenceVertexId: number | null = null;

  // RMB click detection
  private rmbDownPos: Vec2 | null = null;
  private rmbDownTime: number = 0;
  private rmbPendingPropertiesOpen = false;
  private rmbHoverDragSectorId: number | null = null; // Track sector selected just for hover drag
  private rmbHoverSectorId: number | null = null; // Track hover sector for properties (NOT selected)
  private static readonly CLICK_THRESHOLD_DISTANCE = 5; // pixels
  private static readonly CLICK_THRESHOLD_TIME = 300; // ms

  onEnter(ctx: EditModeContext): void {
    ctx.selection.clear('vertex');
    ctx.selection.clear('linedef');
    ctx.selection.clear('thing');
  }

  onExit(ctx: EditModeContext): void {
    this.cancelDrag(ctx);
  }

  onMouseDown(event: MouseEvent, worldPos: Vec2, ctx: EditModeContext): void {
    const snapped = ctx.snap.snap(worldPos, ctx.camera.zoom);
    const sector = this.findSectorAt(worldPos, ctx);
    const vertex = this.findVertexAt(worldPos, ctx);

    if (event.button === 0) {
      // Left click
      if (sector) {
        // LMB + hover on sector = add to selection (numbered)
        ctx.selection.select('sector', sector.id, true); // Always additive
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
      this.rmbHoverSectorId = null;

      if (ctx.selection.count('sector') > 0) {
        // RMB when something is selected
        // Will become drag if mouse moves, or open properties if it's a click
        this.rmbPendingPropertiesOpen = true;
        this.rmbHoverDragSectorId = null; // Not a hover drag
        this.dragReferenceVertexId = this.findClosestSelectedVertex(worldPos, ctx);
        this.startDrag(snapped.position, ctx);
      } else if (sector) {
        // RMB + hover on sector (nothing selected)
        // Don't select yet - wait to see if it's a click (properties) or drag (move)
        this.rmbPendingPropertiesOpen = true;
        this.rmbHoverSectorId = sector.id; // Remember hover for properties
        this.rmbHoverDragSectorId = sector.id; // Also for drag deselect
        this.dragReferenceVertexId = vertex?.id ?? null;
        // Temporarily select for visual feedback and drag setup
        ctx.selection.select('sector', sector.id);
        this.startDrag(snapped.position, ctx);
        ctx.renderer.requestRender();
      }
      // RMB on empty space (nothing selected) in sector mode = TODO: start sector drawing
    }
  }

  onMouseMove(event: MouseEvent, worldPos: Vec2, ctx: EditModeContext): void {
    const excludeIds = this.isDragging ? new Set(this.originalPositions.keys()) : undefined;
    this.currentMousePos = worldPos;

    // Check if RMB movement exceeds click threshold - cancel pending properties
    if (this.rmbDownPos && this.rmbPendingPropertiesOpen) {
      const dx = worldPos.x - this.rmbDownPos.x;
      const dy = worldPos.y - this.rmbDownPos.y;
      const distanceWorld = Math.sqrt(dx * dx + dy * dy);
      const distanceScreen = distanceWorld * ctx.camera.zoom;

      if (distanceScreen > SectorMode.CLICK_THRESHOLD_DISTANCE) {
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
      // Update highlights
      const sector = this.findSectorAt(worldPos, ctx);
      const vertex = this.findVertexAt(worldPos, ctx);
      const newSectorHighlight = sector?.id ?? null;
      const newVertexHighlight = vertex?.id ?? null;

      if (newSectorHighlight !== this.highlightedSectorId || newVertexHighlight !== this.highlightedVertexId) {
        this.highlightedSectorId = newSectorHighlight;
        this.highlightedVertexId = newVertexHighlight;
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

      if (elapsed < SectorMode.CLICK_THRESHOLD_TIME && distanceScreen < SectorMode.CLICK_THRESHOLD_DISTANCE) {
        // This was a click, not a drag - cancel the drag and open properties
        this.cancelDrag(ctx);

        // If this was a hover click (nothing was selected before), open properties for hover element
        // but DON'T keep it selected
        if (this.rmbHoverSectorId !== null && ctx.requestPropertiesDialog) {
          // The sector was temporarily selected, deselect it
          ctx.selection.deselect('sector', this.rmbHoverSectorId);
          // Open properties for the hover sector (pass the ID)
          ctx.requestPropertiesDialog('sector', this.rmbHoverSectorId);
        } else if (ctx.selection.count('sector') > 0 && ctx.requestPropertiesDialog) {
          // Normal case: something was already selected, open properties for selection
          ctx.requestPropertiesDialog('sector');
        }

        this.rmbDownPos = null;
        this.rmbPendingPropertiesOpen = false;
        this.rmbHoverSectorId = null;
        return;
      }
    }

    // Reset RMB tracking
    this.rmbDownPos = null;
    this.rmbPendingPropertiesOpen = false;
    this.rmbHoverSectorId = null;

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

      case 'a':
      case 'A':
        if (event.ctrlKey) {
          ctx.selection.selectAll('sector', ctx.map);
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
    const sector = this.findSectorAt(worldPos, ctx);

    if (sector) {
      items.push({
        label: 'Sector Properties...',
        action: () => {
          console.log('Show sector properties', sector.id);
        },
      });
    }

    return items;
  }

  renderOverlay(ctx: EditModeContext): void {
    // Could render additional overlays here
  }

  // === PRIVATE METHODS ===

  private findSectorAt(pos: Vec2, ctx: EditModeContext): Sector | null {
    return ctx.map.findSectorAt(pos.x, pos.y);
  }

  private findVertexAt(pos: Vec2, ctx: EditModeContext): { id: number; x: number; y: number } | null {
    const threshold = 8 / ctx.camera.zoom;
    return ctx.map.findVertexNear(pos.x, pos.y, threshold);
  }

  /**
   * Find the closest vertex from currently selected sectors to a given position.
   * Used to determine which vertex to use as reference for grid snapping during drag.
   */
  private findClosestSelectedVertex(pos: Vec2, ctx: EditModeContext): number | null {
    let closestId: number | null = null;
    let closestDist = Infinity;

    for (const sectorId of ctx.selection.getSectors()) {
      const linedefs = ctx.map.getSectorLinedefs(sectorId);
      for (const linedef of linedefs) {
        for (const vertexId of [linedef.v1, linedef.v2]) {
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
      }
    }

    return closestId;
  }

  getHighlightedSector(): number | null {
    return this.highlightedSectorId;
  }

  getHighlightedVertex(): number | null {
    return this.highlightedVertexId;
  }

  private startDrag(pos: Vec2, ctx: EditModeContext): void {
    this.isDragging = true;
    this.dragStartPos = pos;
    this.originalPositions.clear();

    // Collect all vertices from selected sectors
    const vertexIds = new Set<number>();
    for (const sectorId of ctx.selection.getSectors()) {
      const linedefs = ctx.map.getSectorLinedefs(sectorId);
      for (const linedef of linedefs) {
        vertexIds.add(linedef.v1);
        vertexIds.add(linedef.v2);
      }
    }

    for (const id of vertexIds) {
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

    // If this was a hover drag (single sector selected just for dragging), deselect it
    if (this.rmbHoverDragSectorId !== null) {
      ctx.selection.deselect('sector', this.rmbHoverDragSectorId);
      this.rmbHoverDragSectorId = null;
    }

    this.isDragging = false;
    this.dragStartPos = null;
    this.dragReferenceVertexId = null;
    this.originalPositions.clear();
    ctx.renderer.requestRender();
  }

  private cancelDrag(ctx: EditModeContext): void {
    for (const [id, orig] of this.originalPositions) {
      const vertex = ctx.map.vertices.get(id);
      if (vertex) {
        vertex.x = orig.x;
        vertex.y = orig.y;
      }
    }

    // If this was a hover drag, deselect the sector
    if (this.rmbHoverDragSectorId !== null) {
      ctx.selection.deselect('sector', this.rmbHoverDragSectorId);
      this.rmbHoverDragSectorId = null;
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

    ctx.selection.selectInBox('sector', box, ctx.map, additive);

    this.isBoxSelecting = false;
    this.boxStartPos = null;
    ctx.renderer.requestRender();
  }

  private deleteSelected(ctx: EditModeContext): void {
    const ids = Array.from(ctx.selection.getSectors());
    if (ids.length === 0) return;

    const action = new SmartDeleteSectorsAction(ctx.map, ids);
    ctx.actions.execute(action);
    ctx.selection.clear('sector');
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
