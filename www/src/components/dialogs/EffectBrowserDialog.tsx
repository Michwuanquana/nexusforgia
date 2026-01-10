import { useState, useMemo, useEffect, useRef } from 'react';
import {
  getSectorEffectsForFormat,
  getEffectCategories,
  type SectorEffect,
} from '../../data/sectorEffects';
import { useEscapeKey } from '../../hooks/useEscapeKey';

interface EffectBrowserDialogProps {
  open: boolean;
  currentEffect: number;
  mapFormat: string;
  onSelect: (effectId: number) => void;
  onCancel: () => void;
}

export function EffectBrowserDialog({
  open,
  currentEffect,
  mapFormat,
  onSelect,
  onCancel,
}: EffectBrowserDialogProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedEffect, setSelectedEffect] = useState<number>(currentEffect);
  const [activeTab, setActiveTab] = useState<'predefined' | 'generalized'>('predefined');
  const [generalizedValues, setGeneralizedValues] = useState<Map<string, number>>(new Map());
  const listRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEscapeKey(onCancel, open);

  // Get effects and generalized options for current format
  const { effects, generalized } = useMemo(
    () => getSectorEffectsForFormat(mapFormat),
    [mapFormat]
  );

  // Get unique categories
  const categories = useMemo(() => ['All', ...getEffectCategories(effects)], [effects]);

  // Filter effects based on search and category
  const filteredEffects = useMemo(() => {
    return effects.filter((effect) => {
      const matchesSearch =
        searchQuery === '' ||
        effect.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        effect.id.toString().includes(searchQuery);

      const matchesCategory =
        selectedCategory === 'All' || effect.category === selectedCategory;

      return matchesSearch && matchesCategory;
    });
  }, [effects, searchQuery, selectedCategory]);

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setSelectedEffect(currentEffect);
      setSearchQuery('');
      setSelectedCategory('All');

      // Check if current effect is predefined or generalized
      const isPredefined = effects.some((e) => e.id === currentEffect);
      if (!isPredefined && generalized) {
        setActiveTab('generalized');
        // Decode current effect into generalized values
        const values = new Map<string, number>();
        for (const option of generalized) {
          for (const bit of option.bits) {
            if ((currentEffect & bit.value) === bit.value && bit.value > 0) {
              values.set(option.name, bit.value);
              break;
            }
          }
          if (!values.has(option.name)) {
            values.set(option.name, 0);
          }
        }
        setGeneralizedValues(values);
      } else {
        setActiveTab('predefined');
      }

      // Scroll to selected effect
      setTimeout(() => {
        const selectedElement = listRef.current?.querySelector('[data-selected="true"]');
        selectedElement?.scrollIntoView({ block: 'center' });
      }, 50);
    }
  }, [open, currentEffect, effects, generalized]);

  // Calculate generalized effect value
  const generalizedEffectValue = useMemo(() => {
    let value = 0;
    for (const v of generalizedValues.values()) {
      value += v;
    }
    return value;
  }, [generalizedValues]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onCancel();
    } else if (e.key === 'Enter') {
      if (activeTab === 'predefined') {
        onSelect(selectedEffect);
      } else {
        onSelect(generalizedEffectValue);
      }
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const currentIndex = filteredEffects.findIndex((e) => e.id === selectedEffect);
      let newIndex = currentIndex;

      if (e.key === 'ArrowDown') {
        newIndex = Math.min(currentIndex + 1, filteredEffects.length - 1);
      } else {
        newIndex = Math.max(currentIndex - 1, 0);
      }

      if (newIndex !== currentIndex && filteredEffects[newIndex]) {
        setSelectedEffect(filteredEffects[newIndex].id);
        // Scroll into view
        const element = listRef.current?.querySelector(`[data-effect-id="${filteredEffects[newIndex].id}"]`);
        element?.scrollIntoView({ block: 'nearest' });
      }
    }
  };

  const handleConfirm = () => {
    if (activeTab === 'predefined') {
      onSelect(selectedEffect);
    } else {
      onSelect(generalizedEffectValue);
    }
  };

  const handleGeneralizedChange = (optionName: string, value: number) => {
    setGeneralizedValues((prev) => {
      const next = new Map(prev);
      next.set(optionName, value);
      return next;
    });
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={onCancel}
      onKeyDown={handleKeyDown}
    >
      <div
        className="bg-[#2a2a3e] border border-[#444] rounded-lg shadow-xl w-[600px] max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#444]">
          <h2 className="text-lg font-semibold text-white">Effect Browser</h2>
          <button onClick={onCancel} className="text-gray-400 hover:text-white transition-colors">
            ✕
          </button>
        </div>

        {/* Tabs (only show if generalized is available) */}
        {generalized && (
          <div className="flex border-b border-[#444]">
            <button
              className={`px-4 py-2 text-sm ${
                activeTab === 'predefined'
                  ? 'bg-[#3a3a5e] text-white border-b-2 border-blue-500'
                  : 'text-gray-400 hover:text-white'
              }`}
              onClick={() => setActiveTab('predefined')}
            >
              Predefined Effects
            </button>
            <button
              className={`px-4 py-2 text-sm ${
                activeTab === 'generalized'
                  ? 'bg-[#3a3a5e] text-white border-b-2 border-blue-500'
                  : 'text-gray-400 hover:text-white'
              }`}
              onClick={() => setActiveTab('generalized')}
            >
              Generalized (Boom)
            </button>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {activeTab === 'predefined' ? (
            <>
              {/* Search and filter */}
              <div className="p-3 border-b border-[#333] flex gap-2">
                <input
                  type="text"
                  placeholder="Search effects..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 px-3 py-2 bg-[#1e1e2e] border border-[#444] rounded text-white focus:outline-none focus:border-blue-500"
                  autoFocus
                />
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="px-3 py-2 bg-[#1e1e2e] border border-[#444] rounded text-white focus:outline-none focus:border-blue-500"
                >
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              {/* Effects list */}
              <div ref={listRef} className="flex-1 overflow-y-auto p-2">
                {filteredEffects.length === 0 ? (
                  <div className="text-center text-gray-400 py-8">No effects found</div>
                ) : (
                  <div className="space-y-1">
                    {filteredEffects.map((effect) => (
                      <EffectItem
                        key={effect.id}
                        effect={effect}
                        selected={selectedEffect === effect.id}
                        onSelect={() => setSelectedEffect(effect.id)}
                        onDoubleClick={() => onSelect(effect.id)}
                      />
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            /* Generalized effects tab */
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {generalized?.map((option) => (
                <div key={option.name}>
                  <label className="block text-sm text-gray-400 mb-1">{option.name}</label>
                  <select
                    value={generalizedValues.get(option.name) ?? 0}
                    onChange={(e) => handleGeneralizedChange(option.name, Number(e.target.value))}
                    className="w-full px-3 py-2 bg-[#1e1e2e] border border-[#444] rounded text-white focus:outline-none focus:border-blue-500"
                  >
                    {option.bits.map((bit) => (
                      <option key={bit.value} value={bit.value}>
                        {bit.name}
                      </option>
                    ))}
                  </select>
                </div>
              ))}

              {/* Preview of generalized value */}
              <div className="mt-4 p-3 bg-[#1e1e2e] rounded border border-[#444]">
                <div className="text-sm text-gray-400">Resulting Effect ID:</div>
                <div className="text-2xl font-mono text-white">{generalizedEffectValue}</div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-[#444]">
          <div className="text-sm text-gray-400">
            {activeTab === 'predefined' ? (
              <>
                {filteredEffects.length} effects • Selected: {selectedEffect}
              </>
            ) : (
              <>Generalized Effect: {generalizedEffectValue}</>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={onCancel}
              className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
            >
              Select
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface EffectItemProps {
  effect: SectorEffect;
  selected: boolean;
  onSelect: () => void;
  onDoubleClick: () => void;
}

function EffectItem({ effect, selected, onSelect, onDoubleClick }: EffectItemProps) {
  return (
    <div
      data-effect-id={effect.id}
      data-selected={selected}
      className={`flex items-center gap-3 px-3 py-2 rounded cursor-pointer ${
        selected ? 'bg-blue-600 text-white' : 'hover:bg-[#3a3a5e] text-gray-200'
      }`}
      onClick={onSelect}
      onDoubleClick={onDoubleClick}
    >
      <span className="font-mono text-sm w-12 text-right opacity-60">{effect.id}</span>
      <span className="flex-1">{effect.name}</span>
      <span
        className={`text-xs px-2 py-0.5 rounded ${
          selected ? 'bg-blue-500' : 'bg-[#444]'
        }`}
      >
        {effect.category}
      </span>
    </div>
  );
}
