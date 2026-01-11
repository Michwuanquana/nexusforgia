import { useState, useEffect, useCallback, useMemo } from 'react';
import { detectMapFormat, getFormatOptions, MAP_FORMATS, type MapFormatId } from '../../core/map/MapFormat';
import type { WadLump } from '../../io/wad/WadReader';
import { useEscapeKey } from '../../hooks/useEscapeKey';
import { HexenMapReader } from '../../io/map/HexenMapReader';
import { MapPreview } from '../editor/MapPreview';
import { DOOM_AUTOMAP_COLORS } from '../../core/preview';

interface MapSelectionDialogProps {
  open: boolean;
  mapNames: string[];
  getLumpsForMap: (mapName: string) => Map<string, WadLump>;
  onSelect: (mapName: string, format: MapFormatId) => void;
  onCancel: () => void;
}

export function MapSelectionDialog({
  open,
  mapNames,
  getLumpsForMap,
  onSelect,
  onCancel,
}: MapSelectionDialogProps) {
  const [selectedMap, setSelectedMap] = useState<string>('');
  const [selectedFormat, setSelectedFormat] = useState<MapFormatId>('boom_doom2');
  const [detectedFormat, setDetectedFormat] = useState<MapFormatId>('boom_doom2');
  const [previewMap, setPreviewMap] = useState<ReturnType<typeof HexenMapReader.read> | null>(null);

  // Close on Escape
  useEscapeKey(onCancel, open);

  // Detect format and load map for preview when selection changes
  const detectFormat = useCallback((mapName: string) => {
    if (!mapName) {
      setPreviewMap(null);
      return;
    }

    const lumps = getLumpsForMap(mapName);
    const lumpSizes = new Map<string, { size: number }>();
    for (const [name, lump] of lumps) {
      lumpSizes.set(name, { size: lump.size });
    }

    const detected = detectMapFormat(lumpSizes);
    setDetectedFormat(detected);
    setSelectedFormat(detected);

    // Load map for preview
    try {
      const mapData = HexenMapReader.read(lumps, mapName, detected);
      setPreviewMap(mapData);
    } catch {
      setPreviewMap(null);
    }
  }, [getLumpsForMap]);

  // Reset selection when dialog opens
  useEffect(() => {
    if (open && mapNames.length > 0) {
      const firstMap = mapNames[0];
      setSelectedMap(firstMap);
      detectFormat(firstMap);
    }
  }, [open, mapNames, detectFormat]);

  // Update format detection when map changes
  const handleMapSelect = (mapName: string) => {
    setSelectedMap(mapName);
    detectFormat(mapName);
  };

  const handleConfirm = () => {
    if (selectedMap) {
      onSelect(selectedMap, selectedFormat);
    }
  };

  const handleDoubleClick = (mapName: string) => {
    setSelectedMap(mapName);
    // Use current detected format for double-click
    const lumps = getLumpsForMap(mapName);
    const lumpSizes = new Map<string, { size: number }>();
    for (const [name, lump] of lumps) {
      lumpSizes.set(name, { size: lump.size });
    }
    const detected = detectMapFormat(lumpSizes);
    onSelect(mapName, detected);
  };

  if (!open) return null;

  const formatOptions = getFormatOptions(detectedFormat);
  const currentFormat = MAP_FORMATS[selectedFormat];

  // Preview options
  const previewOptions = useMemo(() => ({
    colors: DOOM_AUTOMAP_COLORS,
    padding: 8,
  }), []);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onCancel}>
      <div
        className="bg-[#2a2a3e] border border-[#444] rounded-lg shadow-xl w-[500px]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#444]">
          <h2 className="text-lg font-semibold text-white">Select Map</h2>
          <button onClick={onCancel} className="text-gray-400 hover:text-white transition-colors">
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          <div className="mb-4 text-sm text-gray-400">
            Found {mapNames.length} map{mapNames.length !== 1 ? 's' : ''} in WAD file:
          </div>

          {/* Map List + Preview */}
          <div className="flex gap-4 mb-4">
            {/* Map List */}
            <div className="flex-1 border border-[#444] rounded overflow-hidden max-h-64 overflow-y-auto">
              {mapNames.map((mapName) => (
                <div
                  key={mapName}
                  onClick={() => handleMapSelect(mapName)}
                  onDoubleClick={() => handleDoubleClick(mapName)}
                  className={`px-4 py-3 cursor-pointer transition-colors ${
                    selectedMap === mapName
                      ? 'bg-blue-600 text-white'
                      : 'bg-[#1e1e2e] text-gray-300 hover:bg-[#2a2a3e]'
                  }`}
                >
                  <div className="font-mono font-semibold">{mapName}</div>
                </div>
              ))}
            </div>

            {/* Map Preview */}
            <div className="w-40 h-40 bg-black border border-[#444] rounded flex items-center justify-center flex-shrink-0">
              {previewMap ? (
                <MapPreview
                  map={previewMap}
                  width={152}
                  height={152}
                  options={previewOptions}
                />
              ) : (
                <span className="text-gray-600 text-xs">No preview</span>
              )}
            </div>
          </div>

          {/* Format Selection */}
          <div className="mb-4">
            <label className="block text-sm text-gray-400 mb-2">Map Format</label>
            <select
              value={selectedFormat}
              onChange={(e) => setSelectedFormat(e.target.value as MapFormatId)}
              className="w-full px-3 py-2 bg-[#1e1e2e] border border-[#444] rounded text-white"
            >
              {formatOptions.map(({ id, label, detected }) => (
                <option key={id} value={id}>
                  {label}{detected ? ' (detected)' : ''}
                </option>
              ))}
            </select>
            <div className="mt-1 text-xs text-gray-500">
              {currentFormat.description}
            </div>
          </div>

          {/* Format Info */}
          <div className="bg-[#1e1e2e] border border-[#444] rounded p-3 text-xs text-gray-400">
            <div className="grid grid-cols-2 gap-2">
              <div>Linedef size: <span className="text-white">{currentFormat.linedefSize} bytes</span></div>
              <div>Thing size: <span className="text-white">{currentFormat.thingSize} bytes</span></div>
              <div>Linedef args: <span className="text-white">{currentFormat.hasArgs ? 'Yes' : 'No'}</span></div>
              <div>Thing TID: <span className="text-white">{currentFormat.hasTid ? 'Yes' : 'No'}</span></div>
            </div>
          </div>

          <div className="mt-3 text-xs text-gray-500">
            Double-click to open with auto-detected format, or select and click Open
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 p-4 border-t border-[#444]">
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!selectedMap}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Open
          </button>
        </div>
      </div>
    </div>
  );
}
