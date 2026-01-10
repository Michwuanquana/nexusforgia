import { useState, useEffect, useCallback } from 'react';
import { Viewport } from './components/editor/Viewport';
import { Toolbar } from './components/editor/Toolbar';
import { StatusBar } from './components/editor/StatusBar';
import { Renderer } from './renderer/Renderer';
import { useEditorStore } from './store/editorStore';
import { useMapStore } from './store/mapStore';
import { useSelectionStore } from './store/selectionStore';
import { resourceManager } from './core/resources/ResourceManager';
import { SectorBuilder } from './core/geometry/SectorBuilder';
import { CopyPasteManager } from './core/editing/CopyPasteManager';
import { AutoAlignTexturesAction } from './core/editing/actions/TextureAlignmentActions';

export default function App() {
  const [renderer, setRenderer] = useState<Renderer | null>(null);
  const { setMode, toggleShowGrid } = useEditorStore();
  const { loadFromLocalStorage, saveToLocalStorage, exportToWad } = useMapStore();
  const dirty = useMapStore((s) => s.dirty);
  const mapName = useMapStore((s) => s.map.name);

  // Update document title based on current map
  useEffect(() => {
    const title = mapName ? `${mapName} - WADsmith` : 'Untitled - WADsmith';
    document.title = dirty ? `* ${title}` : title;
  }, [mapName, dirty]);

  // Initialize ResourceManager and load last map on startup
  useEffect(() => {
    resourceManager.init().catch(console.error);
    loadFromLocalStorage();
  }, [loadFromLocalStorage]);

  // Warn before leaving with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [dirty]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in input/textarea/select or contenteditable
      const target = e.target as HTMLElement;
      if (target instanceof HTMLInputElement ||
          target instanceof HTMLTextAreaElement ||
          target instanceof HTMLSelectElement ||
          target.getAttribute('contenteditable') === 'true') {
        return;
      }

      // Ctrl + Shift + S to export WAD
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 's') {
        e.preventDefault();
        exportToWad();
        return;
      }

      // Ctrl + S to save
      if (e.ctrlKey && e.key.toLowerCase() === 's') {
        e.preventDefault();
        saveToLocalStorage();
        return;
      }

      // Ctrl + C to copy
      if (e.ctrlKey && e.key.toLowerCase() === 'c') {
        e.preventDefault();
        const currentMap = useMapStore.getState().map;
        CopyPasteManager.copy(currentMap);
        return;
      }

      // Ctrl + X to cut
      if (e.ctrlKey && e.key.toLowerCase() === 'x') {
        e.preventDefault();
        const currentMap = useMapStore.getState().map;
        CopyPasteManager.cut(currentMap);
        renderer?.requestRender();
        return;
      }

      // Ctrl + V to paste (at cursor position or center)
      if (e.ctrlKey && e.key.toLowerCase() === 'v') {
        e.preventDefault();
        const currentMap = useMapStore.getState().map;
        const cursorPos = useEditorStore.getState().cursorPosition;
        // Use snapped cursor position if available, otherwise use map center
        const targetX = cursorPos?.snappedX ?? 0;
        const targetY = cursorPos?.snappedY ?? 0;
        CopyPasteManager.paste(currentMap, targetX, targetY);
        renderer?.requestRender();
        return;
      }

      // Delete or Backspace to delete selection
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        const currentMap = useMapStore.getState().map;
        CopyPasteManager.deleteSelection(currentMap);
        renderer?.requestRender();
        return;
      }

      // Shift + B to detect sectors
      if (e.shiftKey && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        const currentMap = useMapStore.getState().map;
        if (currentMap.linedefs.size === 0) {
          return;
        }
        const sectors = SectorBuilder.detectAndCreateSectors(currentMap);
        if (sectors.length > 0) {
          for (const sector of sectors) {
            currentMap.sectors.set(sector.id, sector);
          }
          currentMap.calculateSectorBoundingBoxes();
          useMapStore.getState().markDirty();
          renderer?.requestRender();
        }
        return;
      }

      // Shift + A to auto-align textures
      if (e.shiftKey && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        const currentMap = useMapStore.getState().map;
        const { linedefs: selectedLinedefSet } = useSelectionStore.getState();
        const selectedLinedefs = Array.from(selectedLinedefSet);

        if (selectedLinedefs.length === 0) {
          console.log('No linedefs selected for auto-align');
          return;
        }

        // Get the first selected linedef's front sidedef and its texture
        const firstLinedef = currentMap.linedefs.get(selectedLinedefs[0]);
        if (!firstLinedef || firstLinedef.frontSidedef === null) {
          console.log('Selected linedef has no front sidedef');
          return;
        }

        const sidedef = currentMap.sidedefs.get(firstLinedef.frontSidedef);
        if (!sidedef) {
          console.log('Sidedef not found');
          return;
        }

        // Find the texture to align (prefer middle, then upper, then lower)
        let textureName = sidedef.middleTexture;
        if (!textureName || textureName === '-') {
          textureName = sidedef.upperTexture;
        }
        if (!textureName || textureName === '-') {
          textureName = sidedef.lowerTexture;
        }
        if (!textureName || textureName === '-') {
          console.log('No texture found on sidedef');
          return;
        }

        // Execute auto-align action
        const action = new AutoAlignTexturesAction(
          currentMap,
          firstLinedef.frontSidedef,
          textureName,
          true, // align X
          true  // align Y
        );
        action.execute();

        const alignedCount = action.getAlignedCount();
        console.log(`Auto-aligned ${alignedCount} sidedef(s) with texture ${textureName}`);

        useMapStore.getState().markDirty();
        renderer?.requestRender();
        return;
      }

      switch (e.key.toLowerCase()) {
        case 'v':
          setMode('vertex');
          break;
        case 'l':
          setMode('linedef');
          break;
        case 's':
          setMode('sector');
          break;
        case 't':
          setMode('thing');
          break;
        // 'd' for draw mode removed - drawing starts with RMB on empty space
        case 'g':
          toggleShowGrid();
          break;
        case 'home':
          if (renderer) {
            const map = useMapStore.getState().map;
            renderer.fitToMap(map);
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [renderer, setMode, toggleShowGrid]);

  const handleRendererReady = useCallback((r: Renderer) => {
    setRenderer(r);
    // Auto-fit if map is loaded
    const map = useMapStore.getState().map;
    if (map.vertices.size > 0) {
      r.fitToMap(map);
    }
  }, []);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden">
      <Toolbar renderer={renderer} />
      <Viewport renderer={renderer} onRendererReady={handleRendererReady} />
      <StatusBar renderer={renderer} />
    </div>
  );
}
