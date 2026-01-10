import { useState, useCallback, useEffect } from 'react';
import { useEditorStore } from '../../store/editorStore';
import type { EditorMode, SectorViewMode } from '../../store/editorStore';
import { Renderer } from '../../renderer/Renderer';
import { useMapStore } from '../../store/mapStore';
import { useTextureStore } from '../../store/textureStore';
import { WadReader } from '../../io/wad/WadReader';
import { HexenMapReader } from '../../io/map/HexenMapReader';
import { ResourceManagerDialog } from '../dialogs/ResourceManagerDialog';
import { SessionManagerDialog } from '../dialogs/SessionManagerDialog';
import { MapSelectionDialog } from '../dialogs/MapSelectionDialog';
import { NewMapDialog } from '../dialogs/NewMapDialog';
import { AboutDialog, isFirstLaunch } from '../dialogs/AboutDialog';
import { IconButton } from '../common/IconButton';
import { Icon } from '../common/Icon';
import type { EditorSession } from '../../core/session/SessionManager';
import type { WadFile, WadLump } from '../../io/wad/WadReader';
import { detectMapFormat, type MapFormatId } from '../../core/map/MapFormat';
import { MapData } from '../../core/map/MapData';
import { SectorBuilder } from '../../core/geometry/SectorBuilder';

interface ToolbarProps {
  renderer: Renderer | null;
}

const modes: { mode: EditorMode; icon: string; label: string; key: string }[] = [
  { mode: 'vertex', icon: 'VerticesMode', label: 'Vertices', key: 'V' },
  { mode: 'linedef', icon: 'LinesMode', label: 'Lines', key: 'L' },
  { mode: 'sector', icon: 'SectorsMode', label: 'Sectors', key: 'S' },
  { mode: 'thing', icon: 'ThingsMode', label: 'Things', key: 'T' },
  // Draw mode removed - drawing starts with RMB on empty space in linedef/sector modes
];

const sectorViewModes: { mode: SectorViewMode; icon: string; label: string }[] = [
  { mode: 'none', icon: 'ViewNormal', label: 'Normal' },
  { mode: 'floor', icon: 'ViewTextureFloor', label: 'Floor' },
  { mode: 'ceiling', icon: 'ViewTextureCeiling', label: 'Ceiling' },
  { mode: 'brightness', icon: 'ViewBrightness', label: 'Brightness' },
];

export function Toolbar({ renderer }: ToolbarProps) {
  const { mode, setMode, showGrid, toggleShowGrid, showVertices, toggleShowVertices, showThings, toggleShowThings, gridSize, setGridSize, sectorViewMode, setSectorViewMode } = useEditorStore();
  const { setMap, saveToLocalStorage, loadFromLocalStorage, clearAllData, exportToWad, map, dirty } = useMapStore();
  const [showResourceManager, setShowResourceManager] = useState(false);
  const [showSessionManager, setShowSessionManager] = useState(false);
  const [showMapSelection, setShowMapSelection] = useState(false);
  const [showNewMapDialog, setShowNewMapDialog] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [pendingWad, setPendingWad] = useState<{ wad: WadFile; mapNames: string[] } | null>(null);

  // Show About dialog on first launch
  useEffect(() => {
    if (isFirstLaunch()) {
      setShowAbout(true);
    }
  }, []);

  // Helper to check for unsaved changes before destructive operations
  const confirmUnsavedChanges = (): boolean => {
    if (!dirty) return true;
    return confirm('You have unsaved changes. Do you want to continue and lose them?');
  };

  const handleOpenWad = async () => {
    if (!confirmUnsavedChanges()) return;
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.wad';

    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      const buffer = await file.arrayBuffer();
      const wad = WadReader.read(buffer);
      const mapNames = WadReader.getMapNames(wad);

      if (mapNames.length === 0) {
        alert('No maps found in WAD');
        return;
      }

      // Load textures from WAD
      useTextureStore.getState().loadFromWad(wad);

      // If only one map, load it directly with auto-detected format
      if (mapNames.length === 1) {
        const lumps = WadReader.findMapLumps(wad, mapNames[0]);
        const lumpSizes = new Map<string, { size: number }>();
        for (const [name, lump] of lumps) {
          lumpSizes.set(name, { size: lump.size });
        }
        const format = detectMapFormat(lumpSizes);
        loadMapFromWad(wad, mapNames[0], format);
      } else {
        // Show map selection dialog
        setPendingWad({ wad, mapNames });
        setShowMapSelection(true);
      }
    };

    input.click();
  };

  const loadMapFromWad = (wad: WadFile, mapName: string, format: MapFormatId) => {
    const lumps = WadReader.findMapLumps(wad, mapName);
    const map = HexenMapReader.read(lumps, mapName, format);

    setMap(map);

    if (renderer) {
      renderer.fitToMap(map);
    }
  };

  const getLumpsForMap = useCallback((mapName: string): Map<string, WadLump> => {
    if (!pendingWad) return new Map();
    return WadReader.findMapLumps(pendingWad.wad, mapName);
  }, [pendingWad]);

  const handleMapSelected = (mapName: string, format: MapFormatId) => {
    if (pendingWad) {
      loadMapFromWad(pendingWad.wad, mapName, format);
    }
    setShowMapSelection(false);
    setPendingWad(null);
  };

  const handleMapSelectionCancel = () => {
    setShowMapSelection(false);
    setPendingWad(null);
  };

  const handleNewMap = () => {
    if (!confirmUnsavedChanges()) return;
    setShowNewMapDialog(true);
  };

  const handleNewMapConfirm = (mapName: string, format: MapFormatId) => {
    const newMap = new MapData();
    newMap.name = mapName;
    newMap.format = format;
    setMap(newMap);
    setShowNewMapDialog(false);

    if (renderer) {
      renderer.setCamera(0, 0, 1);
    }
  };

  const handleClearAllData = () => {
    if (confirm('This will clear ALL saved maps and sessions from browser storage. Are you sure?')) {
      clearAllData();
      if (renderer) {
        renderer.setCamera(0, 0, 1);
      }
    }
  };

  const handleFitToMap = () => {
    if (!renderer) return;
    const map = useMapStore.getState().map;
    renderer.fitToMap(map);
  };

  const handleDetectSectors = () => {
    const currentMap = useMapStore.getState().map;

    // Check if there are any linedefs
    if (currentMap.linedefs.size === 0) {
      alert('No linedefs found. Draw some lines first!');
      return;
    }

    // Run sector detection
    const sectors = SectorBuilder.detectAndCreateSectors(currentMap);

    if (sectors.length === 0) {
      alert('No closed loops found. Make sure your lines form closed polygons.');
      return;
    }

    // Add detected sectors to the map
    for (const sector of sectors) {
      currentMap.sectors.set(sector.id, sector);
    }

    // Calculate bounding boxes
    currentMap.calculateSectorBoundingBoxes();

    // Mark as dirty and re-render
    useMapStore.getState().markDirty();
    renderer?.requestRender();

    alert(`Detected ${sectors.length} sector(s).`);
  };

  const getCurrentSession = (): EditorSession => {
    const camera = renderer?.getCamera() || { x: 0, y: 0, zoom: 1 };
    return {
      version: 1,
      mapName: map.name || 'untitled',
      camera,
      resources: [],
      editMode: mode,
      gridSize,
      showGrid,
    };
  };

  const handleLoadSession = (session: EditorSession) => {
    // Restore camera
    if (renderer && session.camera) {
      renderer.setCamera(session.camera.x, session.camera.y, session.camera.zoom);
    }

    // Restore editor settings
    if (session.editMode) {
      setMode(session.editMode as EditorMode);
    }
    if (session.gridSize !== undefined) {
      setGridSize(session.gridSize);
    }
    if (session.showGrid !== undefined && session.showGrid !== showGrid) {
      toggleShowGrid();
    }
  };

  return (
    <div className="h-10 bg-[var(--panel-bg)] border-b border-[var(--panel-border)] flex items-center px-2 gap-1">
      {/* File operations */}
      <IconButton
        icon="OpenMap"
        title="Open WAD"
        onClick={handleOpenWad}
      />
      <IconButton
        icon="NewMap"
        title="New Map"
        onClick={handleNewMap}
      />
      <IconButton
        icon="SaveMap"
        title="Save to Browser Storage (Ctrl+S)"
        onClick={saveToLocalStorage}
      />
      <IconButton
        icon="Folder"
        title="Load from Browser Storage"
        onClick={() => {
          if (loadFromLocalStorage() && renderer) {
            const map = useMapStore.getState().map;
            renderer.fitToMap(map);
          }
        }}
      />
      <IconButton
        icon="Test"
        title="Export to WAD (Ctrl+Shift+S)"
        onClick={() => exportToWad()}
      />

      <div className="w-px h-6 bg-[var(--panel-border)] mx-1" />

      <IconButton
        icon="Properties"
        title="Manage WAD/PK3 Resources"
        onClick={() => setShowResourceManager(true)}
      />
      <IconButton
        icon="SaveAll"
        title="Save/Load Sessions"
        onClick={() => setShowSessionManager(true)}
      />
      <IconButton
        icon="Close"
        title="Clear All Saved Data"
        onClick={handleClearAllData}
        danger
      />

      <div className="w-px h-6 bg-[var(--panel-border)] mx-1" />

      {/* Mode buttons */}
      {modes.map(({ mode: m, icon, label, key }) => (
        <IconButton
          key={m}
          icon={icon}
          label={label}
          title={`${label} Mode (${key})`}
          active={mode === m}
          onClick={() => setMode(m)}
        />
      ))}

      <div className="w-px h-6 bg-[var(--panel-border)] mx-1" />

      {/* View toggles */}
      <IconButton
        icon="Grid"
        title="Toggle Grid (G)"
        active={showGrid}
        onClick={toggleShowGrid}
      />
      <IconButton
        icon="VerticesMode"
        title="Toggle Vertices Display"
        active={showVertices}
        onClick={toggleShowVertices}
      />
      <IconButton
        icon="ThingsMode"
        title="Toggle Things Display"
        active={showThings}
        onClick={toggleShowThings}
      />

      <div className="w-px h-6 bg-[var(--panel-border)] mx-1" />

      {/* Sector view mode toggles */}
      {sectorViewModes.map(({ mode: m, icon, label }) => (
        <IconButton
          key={m}
          icon={icon}
          title={`${label} View`}
          active={sectorViewMode === m}
          onClick={() => setSectorViewMode(m)}
        />
      ))}

      <div className="w-px h-6 bg-[var(--panel-border)] mx-1" />

      {/* Sector detection */}
      <IconButton
        icon="SectorsMode"
        title="Detect Sectors from Closed Lines (Shift+B)"
        onClick={handleDetectSectors}
      />

      <div className="w-px h-6 bg-[var(--panel-border)] mx-1" />

      {/* Grid size */}
      <div className="flex items-center gap-1">
        <Icon name="Grid2" size={16} title="Grid Size" />
        <select
          value={gridSize}
          onChange={(e) => setGridSize(Number(e.target.value))}
          className="px-2 py-1 text-sm bg-[var(--panel-border)] rounded"
        >
          <option value={8}>8</option>
          <option value={16}>16</option>
          <option value={32}>32</option>
          <option value={64}>64</option>
          <option value={128}>128</option>
        </select>
      </div>

      <div className="w-px h-6 bg-[var(--panel-border)] mx-1" />

      {/* Fit to map */}
      <IconButton
        icon="Zoom"
        title="Fit to Map (Home)"
        onClick={handleFitToMap}
      />

      {/* Spacer to push map info to right */}
      <div className="flex-1" />

      {/* Map info */}
      <div className="text-xs text-gray-400 mr-2">
        {map.name} | {map.format}
        {dirty && <span className="text-yellow-400 ml-2">*</span>}
      </div>

      <div className="w-px h-6 bg-[var(--panel-border)] mx-1" />

      {/* About button */}
      <IconButton
        icon="Help"
        title="About WADsmith"
        onClick={() => setShowAbout(true)}
      />

      {/* Resource Manager Dialog */}
      <ResourceManagerDialog
        open={showResourceManager}
        onClose={() => setShowResourceManager(false)}
      />

      {/* Session Manager Dialog */}
      <SessionManagerDialog
        open={showSessionManager}
        onClose={() => setShowSessionManager(false)}
        getCurrentSession={getCurrentSession}
        onLoadSession={handleLoadSession}
        isDirty={useMapStore.getState().dirty}
      />

      {/* Map Selection Dialog */}
      <MapSelectionDialog
        open={showMapSelection}
        mapNames={pendingWad?.mapNames || []}
        getLumpsForMap={getLumpsForMap}
        onSelect={handleMapSelected}
        onCancel={handleMapSelectionCancel}
      />

      {/* New Map Dialog */}
      <NewMapDialog
        open={showNewMapDialog}
        onConfirm={handleNewMapConfirm}
        onCancel={() => setShowNewMapDialog(false)}
      />

      {/* About Dialog */}
      <AboutDialog
        open={showAbout}
        onClose={() => setShowAbout(false)}
      />
    </div>
  );
}
