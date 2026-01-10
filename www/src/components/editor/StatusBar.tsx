import { useState, useEffect } from 'react';
import { useMapStore } from '../../store/mapStore';
import { useEditorStore } from '../../store/editorStore';
import { useSelectionStore } from '../../store/selectionStore';
import { Renderer } from '../../renderer/Renderer';

interface StatusBarProps {
  renderer: Renderer | null;
}

export function StatusBar({ renderer }: StatusBarProps) {
  const map = useMapStore((s) => s.map);
  const dirty = useMapStore((s) => s.dirty);
  const mode = useEditorStore((s) => s.mode);
  const gridSize = useEditorStore((s) => s.gridSize);
  const snapToGrid = useEditorStore((s) => s.snapToGrid);
  const cursorPosition = useEditorStore((s) => s.cursorPosition);
  const selection = useSelectionStore();

  const [zoom, setZoom] = useState(1);

  // Track zoom
  useEffect(() => {
    if (!renderer) return;

    const interval = setInterval(() => {
      setZoom(renderer.camera.zoom);
    }, 100);

    return () => clearInterval(interval);
  }, [renderer]);

  // Calculate selection count
  const selectionCount =
    selection.vertices.size +
    selection.linedefs.size +
    selection.sectors.size +
    selection.things.size;

  return (
    <div className="h-6 bg-[var(--panel-bg)] border-t border-[var(--panel-border)] flex items-center px-3 text-xs text-[var(--text-secondary)] gap-4">
      {/* Map info */}
      <span className="font-mono">
        {map.name}
        {dirty && ' *'}
      </span>

      <div className="w-px h-4 bg-[var(--panel-border)]" />

      {/* Mode */}
      <span>Mode: {mode.charAt(0).toUpperCase() + mode.slice(1)}</span>

      <div className="w-px h-4 bg-[var(--panel-border)]" />

      {/* Selection */}
      <span>Selected: {selectionCount}</span>

      <div className="w-px h-4 bg-[var(--panel-border)]" />

      {/* Map stats */}
      <span>
        V:{map.vertices.size} L:{map.linedefs.size} S:{map.sectors.size} T:
        {map.things.size}
      </span>

      <div className="flex-1" />

      {/* Cursor position */}
      {cursorPosition && (
        <>
          <span className="font-mono" title="Cursor position (snapped if grid snap enabled)">
            X: {snapToGrid ? cursorPosition.snappedX : cursorPosition.x}
            {' '}
            Y: {snapToGrid ? cursorPosition.snappedY : cursorPosition.y}
          </span>
          <div className="w-px h-4 bg-[var(--panel-border)]" />
        </>
      )}

      {/* Grid */}
      <span>Grid: {gridSize}</span>

      <div className="w-px h-4 bg-[var(--panel-border)]" />

      {/* Zoom */}
      <span>Zoom: {(zoom * 100).toFixed(0)}%</span>
    </div>
  );
}
