import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Grid, type CellComponentProps, type GridImperativeAPI } from 'react-window';
import { useTextureStore } from '../../store/textureStore';
import { useEscapeKey } from '../../hooks/useEscapeKey';

type TextureCategory = 'all' | 'flats' | 'textures' | 'used' | 'unused';

interface TextureBrowserDialogProps {
  open: boolean;
  type: 'flat' | 'texture' | 'all';
  currentTexture?: string;
  usedTextures?: Set<string>; // Optional: textures used in current map
  onSelect: (textureName: string) => void;
  onCancel: () => void;
}

const ITEM_SIZE = 110; // Each cell size including padding
const MIN_COLUMNS = 3;
const MAX_COLUMNS = 8;

export function TextureBrowserDialog({
  open,
  type,
  currentTexture,
  usedTextures,
  onSelect,
  onCancel,
}: TextureBrowserDialogProps) {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string>(currentTexture || '');
  const [category, setCategory] = useState<TextureCategory>('all');
  const [gridWidth, setGridWidth] = useState(600);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const gridRef = useRef<GridImperativeAPI>(null);
  const gridContainerRef = useRef<HTMLDivElement>(null);

  const { getAllFlats, getAllTextures, loaded } = useTextureStore();

  // Close on Escape
  useEscapeKey(onCancel, open);

  // Calculate column count based on grid width
  const columnCount = useMemo(() => {
    const cols = Math.floor(gridWidth / ITEM_SIZE);
    return Math.max(MIN_COLUMNS, Math.min(MAX_COLUMNS, cols));
  }, [gridWidth]);

  // Get all items based on type prop
  const allItems = useMemo(() => {
    if (type === 'flat') return getAllFlats();
    if (type === 'texture') return getAllTextures();
    return [...getAllFlats(), ...getAllTextures()];
  }, [type, getAllFlats, getAllTextures]);

  // Filter by category
  const categorizedItems = useMemo(() => {
    switch (category) {
      case 'flats':
        return allItems.filter(t => t.type === 'flat');
      case 'textures':
        return allItems.filter(t => t.type === 'texture');
      case 'used':
        if (!usedTextures) return allItems;
        return allItems.filter(t => usedTextures.has(t.name));
      case 'unused':
        if (!usedTextures) return allItems;
        return allItems.filter(t => !usedTextures.has(t.name));
      default:
        return allItems;
    }
  }, [allItems, category, usedTextures]);

  // Filter by search
  const filteredItems = useMemo(() => {
    if (!search) return categorizedItems;
    const searchUpper = search.toUpperCase();
    return categorizedItems.filter(t => t.name.includes(searchUpper));
  }, [categorizedItems, search]);

  // Calculate row count for virtualized grid
  const rowCount = Math.ceil(filteredItems.length / Math.max(columnCount, 1));

  // Observe grid container size
  useEffect(() => {
    if (!gridContainerRef.current) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setGridWidth(entry.contentRect.width);
      }
    });

    observer.observe(gridContainerRef.current);
    return () => observer.disconnect();
  }, [open]);

  // Reset selection when dialog opens
  useEffect(() => {
    if (open) {
      setSelected(currentTexture || '');
      setSearch('');
      // Focus search input
      setTimeout(() => searchInputRef.current?.focus(), 100);

      // Scroll to selected item
      if (currentTexture && gridRef.current && columnCount > 0) {
        const index = filteredItems.findIndex(t => t.name === currentTexture);
        if (index >= 0) {
          const row = Math.floor(index / columnCount);
          gridRef.current.scrollToRow({ index: row });
        }
      }
    }
  }, [open, currentTexture]);

  // Scroll to selected when selection changes
  useEffect(() => {
    if (selected && gridRef.current && columnCount > 0) {
      const index = filteredItems.findIndex(t => t.name === selected);
      if (index >= 0) {
        const row = Math.floor(index / columnCount);
        gridRef.current.scrollToRow({ index: row });
      }
    }
  }, [selected, filteredItems, columnCount]);

  const handleSelect = () => {
    if (selected) {
      onSelect(selected);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && selected) {
      onSelect(selected);
    } else if (e.key === 'Escape') {
      onCancel();
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault();
      const currentIndex = filteredItems.findIndex(t => t.name === selected);
      let newIndex = currentIndex;

      switch (e.key) {
        case 'ArrowDown':
          newIndex = Math.min(currentIndex + columnCount, filteredItems.length - 1);
          break;
        case 'ArrowUp':
          newIndex = Math.max(currentIndex - columnCount, 0);
          break;
        case 'ArrowRight':
          newIndex = Math.min(currentIndex + 1, filteredItems.length - 1);
          break;
        case 'ArrowLeft':
          newIndex = Math.max(currentIndex - 1, 0);
          break;
      }

      if (newIndex >= 0 && newIndex < filteredItems.length) {
        setSelected(filteredItems[newIndex].name);
      }
    }
  };

  // Cell renderer for virtualized grid - needs to be stable for react-window
  const Cell = useCallback(({ columnIndex, rowIndex, style }: CellComponentProps) => {
    const index = rowIndex * columnCount + columnIndex;
    if (index >= filteredItems.length) {
      return <div style={style} />;
    }

    const tex = filteredItems[index];
    const isSelected = selected === tex.name;

    return (
      <div style={style} className="p-1">
        <div
          onClick={() => setSelected(tex.name)}
          onDoubleClick={() => onSelect(tex.name)}
          className={`flex flex-col items-center p-2 rounded cursor-pointer transition-colors h-full ${
            isSelected
              ? 'bg-blue-600 ring-2 ring-blue-400'
              : 'bg-[#1e1e2e] hover:bg-[#363650]'
          }`}
        >
          <div className="w-16 h-16 flex items-center justify-center bg-black/30 rounded overflow-hidden flex-shrink-0">
            <img
              src={tex.thumbnailUrl}
              alt={tex.name}
              className="max-w-full max-h-full object-contain"
              style={{ imageRendering: 'pixelated' }}
              loading="lazy"
            />
          </div>
          <div className="mt-1 text-xs font-mono text-center truncate w-full" title={tex.name}>
            {tex.name}
          </div>
          {tex.type === 'texture' && (
            <div className="text-[10px] text-blue-400">TEX</div>
          )}
        </div>
      </div>
    );
  }, [filteredItems, selected, onSelect, columnCount]);

  if (!open) return null;

  const title = type === 'flat' ? 'Browse Flats' : type === 'texture' ? 'Browse Textures' : 'Browse All';

  // Category options based on type prop
  const categoryOptions: { value: TextureCategory; label: string }[] = [
    { value: 'all', label: `All (${allItems.length})` },
  ];

  if (type === 'all') {
    const flatCount = allItems.filter(t => t.type === 'flat').length;
    const texCount = allItems.filter(t => t.type === 'texture').length;
    categoryOptions.push({ value: 'flats', label: `Flats (${flatCount})` });
    categoryOptions.push({ value: 'textures', label: `Textures (${texCount})` });
  }

  if (usedTextures) {
    const usedCount = allItems.filter(t => usedTextures.has(t.name)).length;
    categoryOptions.push({ value: 'used', label: `Used in Map (${usedCount})` });
    categoryOptions.push({ value: 'unused', label: `Unused (${allItems.length - usedCount})` });
  }

  // Calculate grid dimensions
  const gridHeight = 400;
  const actualGridWidth = columnCount * ITEM_SIZE;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onCancel}
      onKeyDown={handleKeyDown}
    >
      <div
        className="bg-[#2a2a3e] border border-[#444] rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#444] flex-shrink-0">
          <h2 className="text-lg font-semibold text-white">{title}</h2>
          <button onClick={onCancel} className="text-gray-400 hover:text-white transition-colors text-xl leading-none px-2">
            &times;
          </button>
        </div>

        {/* Search & Category */}
        <div className="p-4 border-b border-[#444] space-y-2 flex-shrink-0">
          <div className="flex gap-2">
            <input
              ref={searchInputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search textures..."
              className="flex-1 px-3 py-2 bg-[#1e1e2e] border border-[#444] rounded text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="px-3 py-2 bg-[#1e1e2e] border border-[#444] rounded text-gray-400 hover:text-white"
              >
                &times;
              </button>
            )}
          </div>
          <div className="flex gap-2 items-center flex-wrap">
            <label className="text-sm text-gray-400">Category:</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as TextureCategory)}
              className="px-3 py-1.5 bg-[#1e1e2e] border border-[#444] rounded text-white focus:outline-none focus:border-blue-500"
            >
              {categoryOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <span className="text-sm text-gray-500 ml-auto">
              {filteredItems.length} items
            </span>
          </div>
          {!loaded && (
            <div className="text-sm text-yellow-400">
              No textures loaded. Open a WAD file first to browse textures.
            </div>
          )}
        </div>

        {/* Virtualized Grid */}
        <div
          ref={gridContainerRef}
          className="flex-1 p-2 min-h-0 overflow-auto flex justify-center"
          style={{ height: gridHeight }}
        >
          {filteredItems.length === 0 ? (
            <div className="text-gray-500 text-center py-8">
              {search ? 'No textures match your search' : 'No textures available'}
            </div>
          ) : (
            <Grid
              gridRef={gridRef}
              columnCount={columnCount}
              columnWidth={ITEM_SIZE}
              defaultHeight={gridHeight}
              rowCount={rowCount}
              rowHeight={ITEM_SIZE}
              defaultWidth={actualGridWidth}
              className="scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent"
              style={{ overflow: 'auto' }}
              cellComponent={Cell}
              cellProps={{}}
            />
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-[#444] flex-shrink-0 gap-4 flex-wrap">
          <div className="text-sm text-gray-400 min-w-0 flex-shrink">
            {selected ? (
              <span className="truncate block">
                Selected: <span className="text-white font-mono">{selected}</span>
                {filteredItems.find(t => t.name === selected) && (
                  <span className="ml-2 text-gray-500">
                    [{filteredItems.find(t => t.name === selected)!.width}x
                    {filteredItems.find(t => t.name === selected)!.height}]
                    {filteredItems.find(t => t.name === selected)!.type === 'texture' && (
                      <span className="ml-1 text-blue-400">(Composite)</span>
                    )}
                  </span>
                )}
              </span>
            ) : (
              <span className="text-gray-500">Use arrow keys to navigate</span>
            )}
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <button
              onClick={() => onSelect('-')}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors"
            >
              Clear (-)
            </button>
            <button
              onClick={onCancel}
              className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSelect}
              disabled={!selected}
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
