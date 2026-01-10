import { useEffect, useRef, useCallback, useState } from 'react';
import { Renderer } from '../../renderer/Renderer';
import { EditorController } from '../../core/editing/EditorController';
import { useMapStore } from '../../store/mapStore';
import { useEditorStore } from '../../store/editorStore';
import { VertexPropertiesDialog } from '../dialogs/VertexPropertiesDialog';
import { LinedefPropertiesDialog } from '../dialogs/LinedefPropertiesDialog';
import { SectorPropertiesDialog } from '../dialogs/SectorPropertiesDialog';
import { ThingPropertiesDialog } from '../dialogs/ThingPropertiesDialog';
import { ThingPickerDialog } from '../dialogs/ThingPickerDialog';
import type { Vertex, Linedef, Sector, Thing } from '../../core/map/types';

interface ViewportProps {
  renderer: Renderer | null;
  onRendererReady: (renderer: Renderer) => void;
}

export function Viewport({ renderer, onRendererReady }: ViewportProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const editorControllerRef = useRef<EditorController | null>(null);
  const isPanning = useRef(false);
  const lastMousePos = useRef({ x: 0, y: 0 });
  const [renderVersion, setRenderVersion] = useState(0);

  // Property dialogs
  const [showVertexProps, setShowVertexProps] = useState(false);
  const [showLinedefProps, setShowLinedefProps] = useState(false);
  const [showSectorProps, setShowSectorProps] = useState(false);
  const [showThingProps, setShowThingProps] = useState(false);
  const [showThingPicker, setShowThingPicker] = useState(false);
  // Store specific element ID for hover-based properties dialogs
  const [hoverElementId, setHoverElementId] = useState<number | null>(null);

  const map = useMapStore((s) => s.map);
  const { showGrid, showVertices, showThings, sectorViewMode, gridSize, snapToGrid, mode, setMode, setCursorPosition, lastThingType, setLastThingType } =
    useEditorStore();

  // Initialize renderer
  useEffect(() => {
    if (!canvasRef.current || renderer) return;

    const newRenderer = new Renderer();
    newRenderer.init(canvasRef.current).then(() => {
      onRendererReady(newRenderer);
    });

    return () => {
      newRenderer.destroy();
    };
  }, []);

  // Initialize editor controller
  useEffect(() => {
    if (!renderer || !map || editorControllerRef.current) return;

    const controller = new EditorController(map, renderer);

    // Set up render callback
    renderer.setRenderCallback(() => {
      setRenderVersion(v => v + 1);
    });

    // Sync grid size and snap
    controller.setGridSize(gridSize);
    controller.setSnapToGrid(snapToGrid);

    // Set up callback for modes to request properties dialog
    // If elementId is provided, it's a hover-based dialog for a specific element
    controller.setPropertiesDialogCallback((type, elementId) => {
      setHoverElementId(elementId ?? null);
      if (type === 'vertex') setShowVertexProps(true);
      else if (type === 'linedef') setShowLinedefProps(true);
      else if (type === 'sector') setShowSectorProps(true);
      else if (type === 'thing') setShowThingProps(true);
    });

    // Set up callback for thing picker dialog
    controller.setThingPickerCallback(() => {
      setShowThingPicker(true);
    });

    // Set up thing type callbacks
    controller.setThingTypeCallbacks(
      () => lastThingType,
      (type) => setLastThingType(type)
    );

    // Subscribe to mode changes
    const unsubscribe = controller.onModeChange((modeName) => {
      // Update Zustand store based on mode name
      if (modeName === 'Vertices') setMode('vertex');
      else if (modeName === 'Linedefs') setMode('linedef');
      else if (modeName === 'Sectors') setMode('sector');
      else if (modeName === 'Things') setMode('thing');
    });

    editorControllerRef.current = controller;

    return () => {
      unsubscribe();
      controller.destroy();
      editorControllerRef.current = null;
    };
  }, [renderer, map]);

  // Sync mode from store to controller
  useEffect(() => {
    const controller = editorControllerRef.current;
    if (!controller) return;

    const modeMap: Record<string, string> = {
      vertex: 'Vertices',
      linedef: 'Linedefs',
      sector: 'Sectors',
      thing: 'Things',
      draw: 'Vertices', // TODO: Add DrawMode
    };

    const targetMode = modeMap[mode];
    if (targetMode && controller.getCurrentModeName() !== targetMode) {
      controller.setMode(targetMode);
    }
  }, [mode]);

  // Sync grid settings
  useEffect(() => {
    editorControllerRef.current?.setGridSize(gridSize);
    editorControllerRef.current?.setSnapToGrid(snapToGrid);
  }, [gridSize, snapToGrid]);

  // Render loop
  useEffect(() => {
    if (!renderer || !map) return;

    const animate = () => {
      const selection = editorControllerRef.current?.getSelection();
      const highlighted = editorControllerRef.current?.getHighlightedElements();
      const overlay = editorControllerRef.current?.getOverlayState();

      renderer.render(map, {
        showGrid,
        showVertices,
        showThings,
        sectorViewMode,
        gridSize,
        selectedVertices: selection?.getVertices() as Set<number> | undefined,
        selectedLinedefs: selection?.getLinedefs() as Set<number> | undefined,
        selectedSectors: selection?.getSectors() as Set<number> | undefined,
        selectedThings: selection?.getThings() as Set<number> | undefined,
        highlightedVertex: highlighted?.vertex,
        highlightedLinedef: highlighted?.linedef,
        highlightedSector: highlighted?.sector,
        highlightedThing: highlighted?.thing,
        selectionBox: overlay?.selectionBox,
        drawingLine: overlay?.drawingLine,
      });
    };

    animate();
  }, [
    renderer,
    map,
    showGrid,
    showVertices,
    showThings,
    sectorViewMode,
    gridSize,
    renderVersion,
  ]);

  // Handle resize
  useEffect(() => {
    if (!renderer || !containerRef.current) return;

    const observer = new ResizeObserver(() => {
      renderer.resize();
    });

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [renderer]);

  // Mouse handlers
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!renderer || !canvasRef.current) return;

      const rect = canvasRef.current.getBoundingClientRect();
      const screenX = e.clientX - rect.left;
      const screenY = e.clientY - rect.top;

      if (e.button === 1 || (e.button === 0 && e.altKey)) {
        // Middle mouse or Alt+Left = pan
        isPanning.current = true;
        lastMousePos.current = { x: e.clientX, y: e.clientY };
        e.preventDefault();
      } else {
        // Pass to editor controller
        editorControllerRef.current?.handleMouseDown(e.nativeEvent, screenX, screenY);
      }
    },
    [renderer]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!renderer || !canvasRef.current) return;

      const rect = canvasRef.current.getBoundingClientRect();
      const screenX = e.clientX - rect.left;
      const screenY = e.clientY - rect.top;

      // Update cursor position in store
      const worldPos = renderer.camera.screenToWorld(screenX, screenY);
      const snappedX = snapToGrid ? Math.round(worldPos.x / gridSize) * gridSize : worldPos.x;
      const snappedY = snapToGrid ? Math.round(worldPos.y / gridSize) * gridSize : worldPos.y;
      setCursorPosition({
        x: Math.round(worldPos.x),
        y: Math.round(worldPos.y),
        snappedX: Math.round(snappedX),
        snappedY: Math.round(snappedY),
      });

      if (isPanning.current) {
        const dx = e.clientX - lastMousePos.current.x;
        const dy = e.clientY - lastMousePos.current.y;
        renderer.camera.pan(-dx, -dy);
        renderer.requestRender();
        lastMousePos.current = { x: e.clientX, y: e.clientY };
      } else {
        editorControllerRef.current?.handleMouseMove(e.nativeEvent, screenX, screenY);
      }
    },
    [renderer, snapToGrid, gridSize, setCursorPosition]
  );

  const handleMouseUp = useCallback(
    (e: React.MouseEvent) => {
      if (!renderer || !canvasRef.current) return;

      const rect = canvasRef.current.getBoundingClientRect();
      const screenX = e.clientX - rect.left;
      const screenY = e.clientY - rect.top;

      if (isPanning.current) {
        isPanning.current = false;
      } else {
        editorControllerRef.current?.handleMouseUp(e.nativeEvent, screenX, screenY);
      }
    },
    [renderer]
  );

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      if (!renderer || !canvasRef.current) return;

      const rect = canvasRef.current.getBoundingClientRect();
      const screenX = e.clientX - rect.left;
      const screenY = e.clientY - rect.top;

      const factor = e.deltaY > 0 ? 0.9 : 1.1;
      renderer.camera.zoomAt(factor, screenX, screenY);
      renderer.requestRender();

      editorControllerRef.current?.handleWheel(e.nativeEvent);
    },
    [renderer]
  );

  const handleDoubleClick = useCallback(() => {
    const controller = editorControllerRef.current;
    if (!controller) return;

    const selection = controller.selectionManager;

    // Open properties dialog based on current mode and selection
    if (mode === 'vertex' && selection.getVertices().size > 0) {
      setShowVertexProps(true);
    } else if (mode === 'linedef' && selection.getLinedefs().size > 0) {
      setShowLinedefProps(true);
    } else if (mode === 'sector' && selection.getSectors().size > 0) {
      setShowSectorProps(true);
    } else if (mode === 'thing' && selection.getThings().size > 0) {
      setShowThingProps(true);
    }
  }, [mode]);

  // Keyboard handler
  useEffect(() => {
    const isInputFocused = () => {
      const activeElement = document.activeElement;
      if (!activeElement) return false;
      const tagName = activeElement.tagName.toLowerCase();
      // Check for input elements or contenteditable
      return tagName === 'input' ||
             tagName === 'textarea' ||
             tagName === 'select' ||
             activeElement.getAttribute('contenteditable') === 'true';
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // Skip editor keyboard handling when an input is focused
      if (isInputFocused()) {
        return;
      }

      // Check for Enter key to open properties
      if (e.key === 'Enter') {
        handleDoubleClick();
        e.preventDefault();
        return;
      }

      const handled = editorControllerRef.current?.handleKeyDown(e);
      if (handled) {
        e.preventDefault();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      // Skip editor keyboard handling when an input is focused
      if (isInputFocused()) {
        return;
      }
      editorControllerRef.current?.handleKeyUp(e);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleDoubleClick]);

  return (
    <div
      ref={containerRef}
      className="flex-1 relative overflow-hidden bg-[var(--editor-bg)]"
      onContextMenu={(e) => e.preventDefault()}
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        onDoubleClick={handleDoubleClick}
      />

      {/* Property Dialogs */}
      {showVertexProps && editorControllerRef.current && (
        <VertexPropertiesDialog
          open={showVertexProps}
          vertices={Array.from(editorControllerRef.current.selectionManager.getVertices())
            .map((id: number) => map.vertices.get(id))
            .filter((v): v is Vertex => v !== undefined)}
          map={map}
          onClose={() => setShowVertexProps(false)}
          onSave={(updates) => {
            // Apply vertex updates
            for (const update of updates) {
              const vertex = map.vertices.get(update.id!);
              if (vertex && update.x !== undefined && update.y !== undefined) {
                vertex.x = update.x;
                vertex.y = update.y;
              }
            }
            renderer?.requestRender();
            setShowVertexProps(false);
          }}
        />
      )}

      {showLinedefProps && editorControllerRef.current && (
        <LinedefPropertiesDialog
          open={showLinedefProps}
          linedefs={
            // If hoverElementId is set, use that single element; otherwise use selection
            hoverElementId !== null
              ? [map.linedefs.get(hoverElementId)].filter((l): l is Linedef => l !== undefined)
              : Array.from(editorControllerRef.current.selectionManager.getLinedefs())
                  .map((id: number) => map.linedefs.get(id))
                  .filter((l): l is Linedef => l !== undefined)
          }
          map={map}
          onClose={() => { setShowLinedefProps(false); setHoverElementId(null); }}
          onSave={(linedefUpdates, sidedefUpdates, sidedefChanges) => {
            // Apply linedef updates
            for (const update of linedefUpdates) {
              const linedef = map.linedefs.get(update.id!);
              if (linedef) {
                Object.assign(linedef, update);
              }
            }
            // Apply sidedef updates
            for (const update of sidedefUpdates) {
              const sidedef = map.sidedefs.get(update.id!);
              if (sidedef) {
                Object.assign(sidedef, update);
              }
            }
            // Apply sidedef changes (create/delete)
            if (sidedefChanges) {
              for (const change of sidedefChanges) {
                const linedef = map.linedefs.get(change.linedefId);
                if (!linedef) continue;

                if (change.action === 'create') {
                  // Create new sidedef
                  const sidedefId = map.allocateSidedefId();
                  const sidedef = {
                    id: sidedefId,
                    offsetX: change.data?.offsetX ?? 0,
                    offsetY: change.data?.offsetY ?? 0,
                    upperTexture: change.data?.upperTexture ?? '-',
                    lowerTexture: change.data?.lowerTexture ?? '-',
                    middleTexture: change.data?.middleTexture ?? 'STONE',
                    sector: change.sectorId ?? 0,
                  };
                  map.sidedefs.set(sidedefId, sidedef);

                  if (change.side === 'front') {
                    linedef.frontSidedef = sidedefId;
                    linedef.frontSector = change.sectorId ?? null;
                  } else {
                    linedef.backSidedef = sidedefId;
                    linedef.backSector = change.sectorId ?? null;
                  }

                  // Update two-sided flag
                  if (linedef.frontSidedef !== null && linedef.backSidedef !== null) {
                    linedef.flags |= 0x0004; // TWOSIDED
                  }
                } else if (change.action === 'delete' && change.sidedefId !== undefined) {
                  // Delete sidedef
                  map.sidedefs.delete(change.sidedefId);

                  if (change.side === 'front') {
                    linedef.frontSidedef = null;
                    linedef.frontSector = null;
                  } else {
                    linedef.backSidedef = null;
                    linedef.backSector = null;
                  }

                  // Clear two-sided flag if now one-sided
                  if (linedef.frontSidedef === null || linedef.backSidedef === null) {
                    linedef.flags &= ~0x0004; // Clear TWOSIDED
                  }
                }
              }
            }
            renderer?.requestRender();
            setShowLinedefProps(false);
            setHoverElementId(null);
          }}
        />
      )}

      {showSectorProps && editorControllerRef.current && (
        <SectorPropertiesDialog
          open={showSectorProps}
          sectors={
            // If hoverElementId is set, use that single element; otherwise use selection
            hoverElementId !== null
              ? [map.sectors.get(hoverElementId)].filter((s): s is Sector => s !== undefined)
              : Array.from(editorControllerRef.current.selectionManager.getSectors())
                  .map((id: number) => map.sectors.get(id))
                  .filter((s): s is Sector => s !== undefined)
          }
          map={map}
          onClose={() => { setShowSectorProps(false); setHoverElementId(null); }}
          onSave={(updates) => {
            // Apply sector updates
            for (const update of updates) {
              const sector = map.sectors.get(update.id!);
              if (sector) {
                Object.assign(sector, update);
              }
            }
            renderer?.requestRender();
            setShowSectorProps(false);
            setHoverElementId(null);
          }}
        />
      )}

      {showThingProps && editorControllerRef.current && (
        <ThingPropertiesDialog
          open={showThingProps}
          things={
            // If hoverElementId is set, use that single element; otherwise use selection
            hoverElementId !== null
              ? [map.things.get(hoverElementId)].filter((t): t is Thing => t !== undefined)
              : Array.from(editorControllerRef.current.selectionManager.getThings())
                  .map((id: number) => map.things.get(id))
                  .filter((t): t is Thing => t !== undefined)
          }
          map={map}
          onClose={() => { setShowThingProps(false); setHoverElementId(null); }}
          onSave={(updates) => {
            // Apply thing updates
            for (const update of updates) {
              const thing = map.things.get(update.id!);
              if (thing) {
                Object.assign(thing, update);
              }
            }
            renderer?.requestRender();
            setShowThingProps(false);
            setHoverElementId(null);
          }}
        />
      )}

      {showThingPicker && (
        <ThingPickerDialog
          open={showThingPicker}
          currentType={lastThingType}
          onClose={() => setShowThingPicker(false)}
          onSelect={(thingType) => {
            setLastThingType(thingType.id);
            setShowThingPicker(false);
          }}
        />
      )}
    </div>
  );
}
