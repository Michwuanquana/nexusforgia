import { useState } from 'react';
import { MAP_FORMATS, type MapFormatId } from '../../core/map/MapFormat';
import { useEscapeKey } from '../../hooks/useEscapeKey';

interface NewMapDialogProps {
  open: boolean;
  onConfirm: (mapName: string, format: MapFormatId) => void;
  onCancel: () => void;
}

export function NewMapDialog({ open, onConfirm, onCancel }: NewMapDialogProps) {
  const [mapName, setMapName] = useState('MAP01');
  const [selectedFormat, setSelectedFormat] = useState<MapFormatId>('boom_doom2');

  // Close on Escape
  useEscapeKey(onCancel, open);

  if (!open) return null;

  const currentFormat = MAP_FORMATS[selectedFormat];

  const handleConfirm = () => {
    if (mapName.trim()) {
      onConfirm(mapName.trim().toUpperCase(), selectedFormat);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleConfirm();
    } else if (e.key === 'Escape') {
      onCancel();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onCancel}>
      <div
        className="bg-[#2a2a3e] border border-[#444] rounded-lg shadow-xl w-[400px]"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#444]">
          <h2 className="text-lg font-semibold text-white">New Map</h2>
          <button onClick={onCancel} className="text-gray-400 hover:text-white transition-colors">
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          {/* Map Name */}
          <div className="mb-4">
            <label className="block text-sm text-gray-400 mb-2">Map Name</label>
            <input
              type="text"
              value={mapName}
              onChange={(e) => setMapName(e.target.value)}
              className="w-full px-3 py-2 bg-[#1e1e2e] border border-[#444] rounded text-white font-mono"
              placeholder="MAP01"
              autoFocus
            />
          </div>

          {/* Format Selection */}
          <div className="mb-4">
            <label className="block text-sm text-gray-400 mb-2">Map Format</label>
            <select
              value={selectedFormat}
              onChange={(e) => setSelectedFormat(e.target.value as MapFormatId)}
              className="w-full px-3 py-2 bg-[#1e1e2e] border border-[#444] rounded text-white"
            >
              {Object.entries(MAP_FORMATS).map(([id, format]) => (
                <option key={id} value={id}>
                  {format.name}
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
            disabled={!mapName.trim()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Create
          </button>
        </div>
      </div>
    </div>
  );
}
