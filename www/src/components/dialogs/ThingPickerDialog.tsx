import { useState, useEffect, useMemo, useRef } from 'react';
import { THING_TYPES, THING_CATEGORIES, getThingsByCategory, type ThingType } from '../../data/thingTypes';
import { useEscapeKey } from '../../hooks/useEscapeKey';

interface ThingPickerDialogProps {
  open: boolean;
  currentType?: number;
  onSelect: (thingType: ThingType) => void;
  onClose: () => void;
}

export function ThingPickerDialog({
  open,
  currentType,
  onSelect,
  onClose,
}: ThingPickerDialogProps) {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<number | null>(currentType ?? null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close on Escape
  useEscapeKey(onClose, open);

  // Reset on open
  useEffect(() => {
    if (open) {
      setSearch('');
      setSelectedType(currentType ?? null);
      // Find category of current type
      if (currentType) {
        const thing = THING_TYPES.find(t => t.id === currentType);
        if (thing) {
          setSelectedCategory(thing.category);
        }
      }
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  }, [open, currentType]);

  // Filter things by search and category
  const filteredThings = useMemo(() => {
    let things = selectedCategory
      ? getThingsByCategory(selectedCategory)
      : THING_TYPES;

    if (search) {
      const searchLower = search.toLowerCase();
      things = things.filter(t =>
        t.title.toLowerCase().includes(searchLower) ||
        t.id.toString().includes(search)
      );
    }

    return things;
  }, [selectedCategory, search]);

  const selectedThing = selectedType !== null
    ? THING_TYPES.find(t => t.id === selectedType)
    : null;

  const handleSelect = () => {
    if (selectedThing) {
      onSelect(selectedThing);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && selectedThing) {
      onSelect(selectedThing);
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
      onKeyDown={handleKeyDown}
    >
      <div
        className="bg-[#2a2a3e] border border-[#444] rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#444] flex-shrink-0">
          <h2 className="text-lg font-semibold text-white">Select Thing Type</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors text-xl leading-none px-2">
            &times;
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-[#444] flex-shrink-0">
          <input
            ref={searchInputRef}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or type number..."
            className="w-full px-3 py-2 bg-[#1e1e2e] border border-[#444] rounded text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* Content */}
        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* Category sidebar */}
          <div className="w-48 border-r border-[#444] overflow-y-auto flex-shrink-0">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`w-full text-left px-4 py-2 hover:bg-[#363650] transition-colors ${
                selectedCategory === null ? 'bg-blue-600 text-white' : 'text-gray-300'
              }`}
            >
              All ({THING_TYPES.length})
            </button>
            {THING_CATEGORIES.map(cat => {
              const count = getThingsByCategory(cat.id).length;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`w-full text-left px-4 py-2 hover:bg-[#363650] transition-colors flex items-center gap-2 ${
                    selectedCategory === cat.id ? 'bg-blue-600 text-white' : 'text-gray-300'
                  }`}
                >
                  <span
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: cat.color }}
                  />
                  <span className="truncate">{cat.title}</span>
                  <span className="text-xs text-gray-500 ml-auto">({count})</span>
                </button>
              );
            })}
          </div>

          {/* Thing list */}
          <div className="flex-1 overflow-y-auto p-2">
            {filteredThings.length === 0 ? (
              <div className="text-gray-500 text-center py-8">
                No things match your search
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                {filteredThings.map(thing => (
                  <ThingItem
                    key={thing.id}
                    thing={thing}
                    isSelected={selectedType === thing.id}
                    onClick={() => setSelectedType(thing.id)}
                    onDoubleClick={() => onSelect(thing)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-[#444] flex-shrink-0 gap-4">
          <div className="text-sm text-gray-400 min-w-0 flex-shrink">
            {selectedThing ? (
              <span>
                <span className="text-white font-mono">{selectedThing.id}</span>
                {' - '}
                <span className="text-white">{selectedThing.title}</span>
                <span className="text-gray-500 ml-2">
                  ({selectedThing.width}x{selectedThing.height})
                </span>
              </span>
            ) : (
              <span className="text-gray-500">Select a thing type</span>
            )}
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSelect}
              disabled={selectedType === null}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Select
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface ThingItemProps {
  thing: ThingType;
  isSelected: boolean;
  onClick: () => void;
  onDoubleClick: () => void;
}

function ThingItem({ thing, isSelected, onClick, onDoubleClick }: ThingItemProps) {
  return (
    <div
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      className={`flex flex-col items-center p-2 rounded cursor-pointer transition-colors ${
        isSelected
          ? 'bg-blue-600 ring-2 ring-blue-400'
          : 'bg-[#1e1e2e] hover:bg-[#363650]'
      }`}
    >
      {/* Thing circle representation */}
      <div
        className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-mono text-white"
        style={{ backgroundColor: thing.color }}
      >
        {thing.id}
      </div>
      <div className="mt-1 text-xs text-center truncate w-full" title={thing.title}>
        {thing.title}
      </div>
    </div>
  );
}
