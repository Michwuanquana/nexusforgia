import type { EditMode, EditModeContext, Vec2, BBox, ContextMenuItem, OverlayState } from '../interfaces';
import type { Linedef } from '../../map/types';
import { FlipLinedefAction } from '../actions/LinedefActions';
import { SmartDeleteLinedefsAction } from '../actions/SmartDeleteActions';
import { MoveVerticesAction, CreateVertexAction, CreateLinedefAction, SplitLinedefAction, CurveLinedefAction } from '../actions/VertexActions';
import { SectorBuilder } from '../../geometry/SectorBuilder';

export class LinedefMode implements EditMode {
  readonly name = 'Linedefs';
  readonly cursor = 'crosshair';
  readonly shortcut = 'l';

  private isDragging = false;
  private isBoxSelecting = false;
  private isDrawing = false;
  private dragStartPos: Vec2 | null = null;
  private boxStartPos: Vec2 | null = null;
  private drawStartVertexId: number | null = null;
  private currentMousePos: Vec2 | null = null;
  private originalPositions: Map<number, Vec2> = new Map();
  private highlightedLinedefId: number | null = null;
  private highlightedVertexId: number | null = null;
  private dragReferenceVertexId: number | null = null; // Vertex used for grid snapping during drag

  // RMB click detection
  private rmbDownPos: Vec2 | null = null;
  private rmbDownTime: number = 0;
  private rmbPendingPropertiesOpen = false;
  private rmbHoverDragLinedefId: number | null = null; // Track linedef selected just for hover drag
  private rmbHoverLinedefId: number | null = null; // Track hover linedef for properties (NOT selected)
  private static readonly CLICK_THRESHOLD_DISTANCE = 5;
  private static readonly CLICK_THRESHOLD_TIME = 300;

  onEnter(ctx: EditModeContext): void {
    // Clear other selections
    ctx.selection.clear('vertex');
    ctx.selection.clear('sector');
    ctx.selection.clear('thing');
  }

  onExit(ctx: EditModeContext): void {
    this.cancelDrag(ctx);
    this.cancelDrawing(ctx);
  }

  onMouseDown(event: MouseEvent, worldPos: Vec2, ctx: EditModeContext): void {
    const snapped = ctx.snap.snap(worldPos, ctx.camera.zoom);
    const linedef = this.findLinedefAt(worldPos, ctx);
    const vertex = this.findVertexAt(worldPos, ctx);

    if (event.button === 0) {
      // Left click
      if (this.isDrawing) {
        // Continue drawing - create linedef to this point
        this.continueDrawing(snapped.position, ctx);
      } else if (linedef) {
        // LMB + hover on linedef = add to selection (numbered)
        ctx.selection.select('linedef', linedef.id, true); // Always additive
        ctx.renderer.requestRender();
      } else {
        // LMB on empty space = deselect all, then start box select
        ctx.selection.clearAll();
        this.startBoxSelect(worldPos); // Use unsnapped for box select
        ctx.renderer.requestRender();
      }
    } else if (event.button === 2) {
      // Right click - track for click vs drag detection
      this.rmbDownPos = worldPos;
      this.rmbDownTime = Date.now();
      this.rmbPendingPropertiesOpen = false;
      this.rmbHoverLinedefId = null;

      if (this.isDrawing) {
        // RMB during drawing = finish drawing
        this.finishDrawing(ctx);
      } else if (ctx.selection.count('linedef') > 0) {
        // RMB when something is selected
        this.rmbPendingPropertiesOpen = true;
        this.rmbHoverDragLinedefId = null; // Not a hover drag
        this.dragReferenceVertexId = this.findClosestSelectedVertex(worldPos, ctx);
        this.startDrag(snapped.position, ctx);
      } else if (linedef) {
        // RMB + hover on linedef (nothing selected)
        // Don't select yet - wait to see if it's a click (properties) or drag (move)
        this.rmbPendingPropertiesOpen = true;
        this.rmbHoverLinedefId = linedef.id; // Remember hover for properties
        this.rmbHoverDragLinedefId = linedef.id; // Also for drag deselect
        this.dragReferenceVertexId = vertex?.id ?? null;
        // Temporarily select for visual feedback and drag setup
        ctx.selection.select('linedef', linedef.id);
        this.startDrag(snapped.position, ctx);
        ctx.renderer.requestRender();
      } else {
        // RMB on empty space (nothing selected) = start drawing
        this.startDrawing(snapped.position, ctx);
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

      if (distanceScreen > LinedefMode.CLICK_THRESHOLD_DISTANCE) {
        this.rmbPendingPropertiesOpen = false;
      }
    }

    if (this.isDrawing) {
      // Update drawing preview line
      const snapped = ctx.snap.snap(worldPos, ctx.camera.zoom);
      this.currentMousePos = snapped.position;
      ctx.renderer.requestRender();
    } else if (this.isDragging && this.dragStartPos) {
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
      const linedef = this.findLinedefAt(worldPos, ctx);
      const vertex = this.findVertexAt(worldPos, ctx);
      const newLinedefHighlight = linedef?.id ?? null;
      const newVertexHighlight = vertex?.id ?? null;

      if (newLinedefHighlight !== this.highlightedLinedefId || newVertexHighlight !== this.highlightedVertexId) {
        this.highlightedLinedefId = newLinedefHighlight;
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

      if (elapsed < LinedefMode.CLICK_THRESHOLD_TIME && distanceScreen < LinedefMode.CLICK_THRESHOLD_DISTANCE) {
        // This was a click, not a drag - cancel the drag and open properties
        this.cancelDrag(ctx);

        // If this was a hover click (nothing was selected before), open properties for hover element
        // but DON'T keep it selected
        if (this.rmbHoverLinedefId !== null && ctx.requestPropertiesDialog) {
          // The linedef was temporarily selected, deselect it
          ctx.selection.deselect('linedef', this.rmbHoverLinedefId);
          // Open properties for the hover linedef (pass the ID)
          ctx.requestPropertiesDialog('linedef', this.rmbHoverLinedefId);
        } else if (ctx.selection.count('linedef') > 0 && ctx.requestPropertiesDialog) {
          // Normal case: something was already selected, open properties for selection
          ctx.requestPropertiesDialog('linedef');
        }

        this.rmbDownPos = null;
        this.rmbPendingPropertiesOpen = false;
        this.rmbHoverLinedefId = null;
        return;
      }
    }

    // Reset RMB tracking
    this.rmbDownPos = null;
    this.rmbPendingPropertiesOpen = false;
    this.rmbHoverLinedefId = null;

    if (this.isDragging && this.dragStartPos) {
      this.finishDrag(worldPos, ctx);
    } else if (this.isBoxSelecting && this.boxStartPos) {
      this.finishBoxSelect(worldPos, false, ctx); // Box select is always additive in new scheme
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
        if (this.isDrawing) {
          this.cancelDrawing(ctx);
          return true;
        }
        if (this.isDragging) {
          this.cancelDrag(ctx);
          return true;
        }
        ctx.selection.clearAll();
        ctx.renderer.requestRender();
        return true;

      case 'f':
      case 'F':
        this.flipSelected(ctx);
        return true;

      case 'a':
      case 'A':
        if (event.ctrlKey) {
          ctx.selection.selectAll('linedef', ctx.map);
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

      case 's':
      case 'S':
        if (event.shiftKey && !event.ctrlKey) {
          this.splitSelectedAtMidpoint(ctx);
          return true;
        }
        break;

      case 'c':
      case 'C':
        if (event.shiftKey && !event.ctrlKey) {
          this.curveSelected(ctx);
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
    const linedef = this.findLinedefAt(worldPos, ctx);

    if (linedef) {
      items.push({
        label: 'Flip Linedef',
        shortcut: 'F',
        action: () => this.flipLinedef(linedef.id, ctx),
      });

      items.push({
        label: 'Split Linedef',
        shortcut: 'Shift+S',
        action: () => this.splitLinedefAtMidpoint(linedef.id, ctx),
      });

      items.push({
        label: 'Curve Linedef',
        shortcut: 'Shift+C',
        action: () => this.curveLinedef(linedef.id, ctx),
      });

      items.push({
        label: 'Delete Linedef',
        shortcut: 'Del',
        action: () => this.deleteLinedef(linedef.id, ctx),
      });

      items.push({ separator: true, label: '', action: () => {} });

      items.push({
        label: 'Properties...',
        action: () => {
          console.log('Show linedef properties', linedef.id);
        },
      });
    }

    return items;
  }

  renderOverlay(ctx: EditModeContext): void {
    // Could render additional overlays here
  }

  // === PRIVATE METHODS ===

  private findLinedefAt(pos: Vec2, ctx: EditModeContext): Linedef | null {
    const threshold = 8 / ctx.camera.zoom;
    return ctx.map.findLinedefNear(pos.x, pos.y, threshold);
  }

  private findVertexAt(pos: Vec2, ctx: EditModeContext): { id: number; x: number; y: number } | null {
    const threshold = 8 / ctx.camera.zoom;
    return ctx.map.findVertexNear(pos.x, pos.y, threshold);
  }

  /**
   * Find the closest vertex from currently selected linedefs to a given position.
   * Used to determine which vertex to use as reference for grid snapping during drag.
   */
  private findClosestSelectedVertex(pos: Vec2, ctx: EditModeContext): number | null {
    let closestId: number | null = null;
    let closestDist = Infinity;

    for (const linedefId of ctx.selection.getLinedefs()) {
      const linedef = ctx.map.linedefs.get(linedefId);
      if (!linedef) continue;

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

    return closestId;
  }

  private startDrag(pos: Vec2, ctx: EditModeContext): void {
    this.isDragging = true;
    this.dragStartPos = pos;
    this.originalPositions.clear();

    // Collect all vertices from selected linedefs
    const vertexIds = new Set<number>();
    for (const id of ctx.selection.getLinedefs()) {
      const linedef = ctx.map.linedefs.get(id);
      if (linedef) {
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

    // If this was a hover drag (single linedef selected just for dragging), deselect it
    if (this.rmbHoverDragLinedefId !== null) {
      ctx.selection.deselect('linedef', this.rmbHoverDragLinedefId);
      this.rmbHoverDragLinedefId = null;
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

    // If this was a hover drag, deselect the linedef
    if (this.rmbHoverDragLinedefId !== null) {
      ctx.selection.deselect('linedef', this.rmbHoverDragLinedefId);
      this.rmbHoverDragLinedefId = null;
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

    ctx.selection.selectInBox('linedef', box, ctx.map, additive);

    this.isBoxSelecting = false;
    this.boxStartPos = null;
    ctx.renderer.requestRender();
  }

  private deleteSelected(ctx: EditModeContext): void {
    const ids = Array.from(ctx.selection.getLinedefs());
    if (ids.length === 0) return;

    const action = new SmartDeleteLinedefsAction(ctx.map, ids);
    ctx.actions.execute(action);
    ctx.selection.clear('linedef');
    ctx.renderer.requestRender();
  }

  private deleteLinedef(id: number, ctx: EditModeContext): void {
    const action = new SmartDeleteLinedefsAction(ctx.map, [id]);
    ctx.actions.execute(action);
    ctx.selection.deselect('linedef', id);
    ctx.renderer.requestRender();
  }

  private flipSelected(ctx: EditModeContext): void {
    const ids = Array.from(ctx.selection.getLinedefs());
    if (ids.length === 0) return;

    const action = new FlipLinedefAction(ctx.map, ids);
    ctx.actions.execute(action);
    ctx.renderer.requestRender();
  }

  private flipLinedef(id: number, ctx: EditModeContext): void {
    const action = new FlipLinedefAction(ctx.map, [id]);
    ctx.actions.execute(action);
    ctx.renderer.requestRender();
  }

  private splitSelectedAtMidpoint(ctx: EditModeContext): void {
    const ids = Array.from(ctx.selection.getLinedefs());
    if (ids.length === 0) return;

    for (const id of ids) {
      const linedef = ctx.map.linedefs.get(id);
      if (!linedef) continue;

      const v1 = ctx.map.vertices.get(linedef.v1);
      const v2 = ctx.map.vertices.get(linedef.v2);
      if (!v1 || !v2) continue;

      // Calculate midpoint
      const midpoint: Vec2 = {
        x: Math.round((v1.x + v2.x) / 2),
        y: Math.round((v1.y + v2.y) / 2),
      };

      const action = new SplitLinedefAction(ctx.map, id, midpoint);
      ctx.actions.execute(action);
    }

    ctx.renderer.requestRender();
  }

  private curveSelected(ctx: EditModeContext): void {
    const ids = Array.from(ctx.selection.getLinedefs());
    if (ids.length === 0) return;

    for (const id of ids) {
      const linedef = ctx.map.linedefs.get(id);
      if (!linedef) continue;

      // Default: 8 segments, offset of 32 units
      const action = new CurveLinedefAction(ctx.map, id, 8, 32);
      ctx.actions.execute(action);
    }

    ctx.selection.clear('linedef');
    ctx.renderer.requestRender();
  }

  private splitLinedefAtMidpoint(id: number, ctx: EditModeContext): void {
    const linedef = ctx.map.linedefs.get(id);
    if (!linedef) return;

    const v1 = ctx.map.vertices.get(linedef.v1);
    const v2 = ctx.map.vertices.get(linedef.v2);
    if (!v1 || !v2) return;

    const midpoint: Vec2 = {
      x: Math.round((v1.x + v2.x) / 2),
      y: Math.round((v1.y + v2.y) / 2),
    };

    const action = new SplitLinedefAction(ctx.map, id, midpoint);
    ctx.actions.execute(action);
    ctx.renderer.requestRender();
  }

  private curveLinedef(id: number, ctx: EditModeContext): void {
    const action = new CurveLinedefAction(ctx.map, id, 8, 32);
    ctx.actions.execute(action);
    ctx.selection.deselect('linedef', id);
    ctx.renderer.requestRender();
  }

  getHighlightedLinedef(): number | null {
    return this.highlightedLinedefId;
  }

  getHighlightedVertex(): number | null {
    return this.highlightedVertexId;
  }

  // === DRAWING METHODS ===

  private startDrawing(pos: Vec2, ctx: EditModeContext): void {
    // Check if there's an existing vertex at this position
    const existingVertex = ctx.map.findVertexNear(pos.x, pos.y, 8 / ctx.camera.zoom);

    if (existingVertex) {
      this.drawStartVertexId = existingVertex.id;
    } else {
      // Create new vertex
      const action = new CreateVertexAction(ctx.map, pos.x, pos.y);
      ctx.actions.execute(action);
      this.drawStartVertexId = action.getVertexId();
    }

    this.isDrawing = true;
    ctx.selection.clearAll();
    ctx.renderer.requestRender();
  }

  private continueDrawing(pos: Vec2, ctx: EditModeContext): void {
    if (this.drawStartVertexId === null) return;

    // Check if clicking on existing vertex
    const existingVertex = ctx.map.findVertexNear(pos.x, pos.y, 8 / ctx.camera.zoom);
    let endVertexId: number;
    let closedLoop = false;

    if (existingVertex) {
      endVertexId = existingVertex.id;

      // If clicking on start vertex, finish drawing
      if (endVertexId === this.drawStartVertexId) {
        this.isDrawing = false;
        this.drawStartVertexId = null;
        ctx.renderer.requestRender();
        return;
      }

      // Check if connecting to an existing vertex might close a loop
      closedLoop = existingVertex.linedefs.size > 0;
    } else {
      // Create new vertex
      const action = new CreateVertexAction(ctx.map, pos.x, pos.y);
      ctx.actions.execute(action);
      endVertexId = action.getVertexId()!;
    }

    // Create linedef between start and end vertices
    const lineAction = new CreateLinedefAction(ctx.map, this.drawStartVertexId, endVertexId);
    ctx.actions.execute(lineAction);

    // If we connected to an existing vertex, check for new closed loops and create sectors
    if (closedLoop) {
      this.tryCreateSectorsFromNewLinedef(ctx, lineAction.getLinedefId()!);
    }

    // Continue drawing from this vertex
    this.drawStartVertexId = endVertexId;
    ctx.renderer.requestRender();
  }

  /**
   * Try to create sectors from a newly created linedef that might have closed a loop
   */
  private tryCreateSectorsFromNewLinedef(ctx: EditModeContext, linedefId: number): void {
    const linedef = ctx.map.linedefs.get(linedefId);
    if (!linedef) return;

    // Get the vertices of the new linedef
    const v1 = ctx.map.vertices.get(linedef.v1);
    const v2 = ctx.map.vertices.get(linedef.v2);
    if (!v1 || !v2) return;

    // Only proceed if both vertices have multiple linedefs (potential for closed loop)
    if (v1.linedefs.size < 2 || v2.linedefs.size < 2) return;

    // Check how many linedefs don't have sidedefs yet (need sectors)
    const linedefsNeedingSectors = Array.from(ctx.map.linedefs.values()).filter(
      l => l.frontSidedef === null && l.backSidedef === null
    );

    // If all linedefs already have sectors, no need to detect
    if (linedefsNeedingSectors.length === 0) return;

    // Detect closed loops - SectorBuilder will find any new closed loops
    const sectors = SectorBuilder.detectAndCreateSectors(ctx.map);

    if (sectors.length > 0) {
      // Add detected sectors to the map
      for (const sector of sectors) {
        ctx.map.sectors.set(sector.id, sector);
      }

      // Calculate bounding boxes
      ctx.map.calculateSectorBoundingBoxes();

      console.log(`Auto-created ${sectors.length} sector(s) from closed loop`);
    }
  }

  /**
   * Finish drawing - keep all drawn linedefs and recalculate affected sectors
   */
  private finishDrawing(ctx: EditModeContext): void {
    if (!this.isDrawing) return;

    // Get the vertex we were drawing from to find affected linedefs
    const affectedVertexId = this.drawStartVertexId;

    this.isDrawing = false;
    this.drawStartVertexId = null;

    // Recalculate sectors for affected area
    if (affectedVertexId !== null) {
      this.recalculateAffectedSectors(ctx, affectedVertexId);
    }

    ctx.renderer.requestRender();
  }

  /**
   * Cancel drawing - discard current line segment only (path stays)
   */
  private cancelDrawing(ctx: EditModeContext): void {
    this.isDrawing = false;
    this.drawStartVertexId = null;
    ctx.renderer.requestRender();
  }

  /**
   * Recalculate sectors that might be affected by changes near a vertex
   */
  private recalculateAffectedSectors(ctx: EditModeContext, vertexId: number): void {
    const vertex = ctx.map.vertices.get(vertexId);
    if (!vertex) return;

    // Collect all linedefs connected to this vertex and their neighbors
    const affectedLinedefs = new Set<number>();
    const affectedVertices = new Set<number>();

    // Start with the vertex and expand to connected vertices (depth 3 for better coverage)
    this.collectAffectedGeometry(ctx, vertexId, affectedLinedefs, affectedVertices, 3);

    // Use optimized sector detection for affected area only
    const sectors = SectorBuilder.detectSectorsForAffectedArea(ctx.map, affectedLinedefs);

    if (sectors.length > 0) {
      for (const sector of sectors) {
        ctx.map.sectors.set(sector.id, sector);
      }
      ctx.map.calculateSectorBoundingBoxes();
      console.log(`Created ${sectors.length} sector(s) after finishing drawing`);
    }
  }

  /**
   * Collect linedefs and vertices within N hops from a starting vertex
   */
  private collectAffectedGeometry(
    ctx: EditModeContext,
    startVertexId: number,
    linedefs: Set<number>,
    vertices: Set<number>,
    depth: number
  ): void {
    if (depth <= 0 || vertices.has(startVertexId)) return;

    vertices.add(startVertexId);
    const vertex = ctx.map.vertices.get(startVertexId);
    if (!vertex) return;

    for (const linedefId of vertex.linedefs) {
      linedefs.add(linedefId);

      const linedef = ctx.map.linedefs.get(linedefId);
      if (!linedef) continue;

      // Recurse to connected vertices
      const otherVertexId = linedef.v1 === startVertexId ? linedef.v2 : linedef.v1;
      this.collectAffectedGeometry(ctx, otherVertexId, linedefs, vertices, depth - 1);
    }
  }

  getOverlayState(): OverlayState {
    return {
      selectionBox: this.isBoxSelecting && this.boxStartPos && this.currentMousePos ? {
        startX: this.boxStartPos.x,
        startY: this.boxStartPos.y,
        endX: this.currentMousePos.x,
        endY: this.currentMousePos.y,
      } : null,
      drawingLine: null, // Will be set by ModeManager with vertex position
    };
  }

  getDrawingLineState(ctx: EditModeContext): OverlayState['drawingLine'] {
    if (!this.isDrawing || this.drawStartVertexId === null || !this.currentMousePos) {
      return null;
    }

    const startVertex = ctx.map.vertices.get(this.drawStartVertexId);
    if (!startVertex) return null;

    return {
      startX: startVertex.x,
      startY: startVertex.y,
      endX: this.currentMousePos.x,
      endY: this.currentMousePos.y,
    };
  }
}
