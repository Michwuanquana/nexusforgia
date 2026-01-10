import { useState, useEffect } from 'react';
import type { Vertex } from '../../core/map/types';
import type { MapData } from '../../core/map/MapData';
import { useEscapeKey } from '../../hooks/useEscapeKey';

interface VertexPropertiesDialogProps {
  open: boolean;
  vertices: Vertex[];
  map: MapData;
  onClose: () => void;
  onSave: (updates: Partial<Vertex>[]) => void;
}

export function VertexPropertiesDialog({
  open,
  vertices,
  map,
  onClose,
  onSave,
}: VertexPropertiesDialogProps) {
  const [x, setX] = useState('');
  const [y, setY] = useState('');
  const [mixed, setMixed] = useState({ x: false, y: false });

  // Close on Escape
  useEscapeKey(onClose, open);

  useEffect(() => {
    if (!open || vertices.length === 0) return;

    // Single selection - show exact values
    if (vertices.length === 1) {
      setX(vertices[0].x.toString());
      setY(vertices[0].y.toString());
      setMixed({ x: false, y: false });
    } else {
      // Multiple selection - check for mixed values
      const xValues = new Set(vertices.map((v) => v.x));
      const yValues = new Set(vertices.map((v) => v.y));

      setMixed({
        x: xValues.size > 1,
        y: yValues.size > 1,
      });

      if (xValues.size === 1) {
        setX(Array.from(xValues)[0].toString());
      } else {
        setX('');
      }

      if (yValues.size === 1) {
        setY(Array.from(yValues)[0].toString());
      } else {
        setY('');
      }
    }
  }, [open, vertices]);

  const handleSave = () => {
    const updates: Partial<Vertex>[] = [];

    for (const vertex of vertices) {
      const update: Partial<Vertex> = {};

      if (x !== '' && !mixed.x) {
        update.x = Number(x);
      }
      if (y !== '' && !mixed.y) {
        update.y = Number(y);
      }

      if (Object.keys(update).length > 0) {
        updates.push({ ...update, id: vertex.id });
      }
    }

    if (updates.length > 0) {
      onSave(updates);
    }
    onClose();
  };

  if (!open) return null;

  const title =
    vertices.length === 1
      ? `Vertex ${vertices[0].id} Properties`
      : `${vertices.length} Vertices Properties`;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-[#2a2a3e] border border-[#444] rounded-lg shadow-xl w-96"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#444]">
          <h2 className="text-lg font-semibold text-white">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-3">
          {/* Position X */}
          <div>
            <label className="block text-sm text-gray-400 mb-1">
              X Position {mixed.x && <span className="text-yellow-400">(mixed)</span>}
            </label>
            <input
              type="number"
              value={x}
              onChange={(e) => setX(e.target.value)}
              placeholder={mixed.x ? 'Mixed values' : ''}
              className="w-full px-3 py-2 bg-[#1e1e2e] border border-[#444] rounded text-white"
            />
          </div>

          {/* Position Y */}
          <div>
            <label className="block text-sm text-gray-400 mb-1">
              Y Position {mixed.y && <span className="text-yellow-400">(mixed)</span>}
            </label>
            <input
              type="number"
              value={y}
              onChange={(e) => setY(e.target.value)}
              placeholder={mixed.y ? 'Mixed values' : ''}
              className="w-full px-3 py-2 bg-[#1e1e2e] border border-[#444] rounded text-white"
            />
          </div>

          {/* Info */}
          {vertices.length === 1 && (
            <div className="text-xs text-gray-500 mt-4 p-2 bg-[#1e1e2e] rounded">
              <div>Connected linedefs: {vertices[0].linedefs.size}</div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 p-4 border-t border-[#444]">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
