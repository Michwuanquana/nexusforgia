import { useState, useEffect, useCallback } from 'react';
import type { Sector } from '../../core/map/types';
import type { MapData } from '../../core/map/MapData';
import { TextureSelector } from '../common/TextureSelector';
import { ScrubInput } from '../common/ScrubInput';
import { EffectBrowserDialog } from './EffectBrowserDialog';
import { getEffectName } from '../../data/sectorEffects';
import { useEscapeKey } from '../../hooks/useEscapeKey';

interface SectorPropertiesDialogProps {
  open: boolean;
  sectors: Sector[];
  map: MapData;
  onClose: () => void;
  onSave: (updates: Partial<Sector>[]) => void;
}

export function SectorPropertiesDialog({
  open,
  sectors,
  map,
  onClose,
  onSave,
}: SectorPropertiesDialogProps) {
  const [floorHeight, setFloorHeight] = useState('');
  const [ceilingHeight, setCeilingHeight] = useState('');
  const [floorTexture, setFloorTexture] = useState('');
  const [ceilingTexture, setCeilingTexture] = useState('');
  const [lightLevel, setLightLevel] = useState('');
  const [special, setSpecial] = useState('');
  const [tag, setTag] = useState('');
  const [showEffectBrowser, setShowEffectBrowser] = useState(false);

  // Close on Escape (only when effect browser is not open)
  const handleEscape = useCallback(() => {
    if (!showEffectBrowser) onClose();
  }, [showEffectBrowser, onClose]);
  useEscapeKey(handleEscape, open && !showEffectBrowser);

  useEffect(() => {
    if (!open || sectors.length === 0) return;

    // Check if all values are the same for multi-selection
    const first = sectors[0];
    const allSameFloor = sectors.every(s => s.floorHeight === first.floorHeight);
    const allSameCeiling = sectors.every(s => s.ceilingHeight === first.ceilingHeight);
    const allSameFloorTex = sectors.every(s => s.floorTexture === first.floorTexture);
    const allSameCeilingTex = sectors.every(s => s.ceilingTexture === first.ceilingTexture);
    const allSameLight = sectors.every(s => s.lightLevel === first.lightLevel);
    const allSameSpecial = sectors.every(s => s.special === first.special);
    const allSameTag = sectors.every(s => s.tag === first.tag);

    setFloorHeight(allSameFloor ? first.floorHeight.toString() : '');
    setCeilingHeight(allSameCeiling ? first.ceilingHeight.toString() : '');
    setFloorTexture(allSameFloorTex ? first.floorTexture : '');
    setCeilingTexture(allSameCeilingTex ? first.ceilingTexture : '');
    setLightLevel(allSameLight ? first.lightLevel.toString() : '');
    setSpecial(allSameSpecial ? first.special.toString() : '');
    setTag(allSameTag ? first.tag.toString() : '');
  }, [open, sectors]);

  const handleSave = () => {
    const updates: Partial<Sector>[] = [];

    for (const sector of sectors) {
      const update: Partial<Sector> = { id: sector.id };

      if (floorHeight !== '') update.floorHeight = Number(floorHeight);
      if (ceilingHeight !== '') update.ceilingHeight = Number(ceilingHeight);
      if (floorTexture !== '') update.floorTexture = floorTexture.toUpperCase();
      if (ceilingTexture !== '') update.ceilingTexture = ceilingTexture.toUpperCase();
      if (lightLevel !== '') update.lightLevel = Number(lightLevel);
      if (special !== '') update.special = Number(special);
      if (tag !== '') update.tag = Number(tag);

      updates.push(update);
    }

    if (updates.length > 0) {
      onSave(updates);
    }
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!open) return null;

  const title =
    sectors.length === 1
      ? `Sector ${sectors[0].id} Properties`
      : `${sectors.length} Sectors Properties`;

  // Calculate sector height for display
  const sectorHeight = floorHeight !== '' && ceilingHeight !== ''
    ? Number(ceilingHeight) - Number(floorHeight)
    : null;

  const mixedPlaceholder = sectors.length > 1 ? 'Mixed' : '';

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={onClose}
      onKeyDown={handleKeyDown}
    >
      <div
        className="bg-[#2a2a3e] border border-[#444] rounded-lg shadow-xl w-[550px]"
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
        <div className="p-4 space-y-4">
          {/* Ceiling (top) */}
          <div className="grid grid-cols-2 gap-4">
            <TextureSelector
              value={ceilingTexture}
              type="flat"
              onChange={setCeilingTexture}
              label="Ceiling Texture"
              placeholder={mixedPlaceholder}
            />
            <ScrubInput
              value={ceilingHeight}
              onChange={setCeilingHeight}
              label="Ceiling Height"
              placeholder={mixedPlaceholder}
              step={8}
            />
          </div>

          {/* Sector Height indicator */}
          {sectorHeight !== null && (
            <div className="text-center text-sm text-gray-400 py-1 border-t border-b border-[#333]">
              Sector Height: <span className="text-white font-mono">{sectorHeight}</span>
            </div>
          )}

          {/* Floor (bottom) */}
          <div className="grid grid-cols-2 gap-4">
            <TextureSelector
              value={floorTexture}
              type="flat"
              onChange={setFloorTexture}
              label="Floor Texture"
              placeholder={mixedPlaceholder}
            />
            <ScrubInput
              value={floorHeight}
              onChange={setFloorHeight}
              label="Floor Height"
              placeholder={mixedPlaceholder}
              step={8}
            />
          </div>

          {/* Light Level */}
          <div>
            <label className="block text-sm text-gray-400 mb-1">Light Level (0-255)</label>
            <div className="flex gap-2 items-center">
              <input
                type="range"
                value={lightLevel || 160}
                onChange={(e) => setLightLevel(e.target.value)}
                min={0}
                max={255}
                step={8}
                className="flex-1"
              />
              <input
                type="number"
                value={lightLevel}
                onChange={(e) => setLightLevel(e.target.value)}
                placeholder={mixedPlaceholder}
                min={0}
                max={255}
                className="w-20 px-3 py-2 bg-[#1e1e2e] border border-[#444] rounded text-white focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Special & Tag */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Effect</label>
              <button
                onClick={() => setShowEffectBrowser(true)}
                className="w-full px-3 py-2 bg-[#1e1e2e] border border-[#444] rounded text-white text-left hover:border-blue-500 transition-colors"
              >
                {special !== '' ? (
                  <span>
                    <span className="font-mono text-blue-400">{special}</span>
                    <span className="text-gray-400 ml-2">
                      {getEffectName(Number(special), map.format)}
                    </span>
                  </span>
                ) : (
                  <span className="text-gray-500">{mixedPlaceholder || 'Click to select...'}</span>
                )}
              </button>
            </div>
            <ScrubInput
              value={tag}
              onChange={setTag}
              label="Tag"
              placeholder={mixedPlaceholder}
              min={0}
            />
          </div>

          {/* Info for single sector */}
          {sectors.length === 1 && (
            <div className="text-xs text-gray-500 mt-4 p-2 bg-[#1e1e2e] rounded flex gap-4">
              <span>ID: {sectors[0].id}</span>
              <span>Linedefs: {sectors[0].linedefs.size}</span>
            </div>
          )}

          {/* Mixed values indicator */}
          {sectors.length > 1 && (
            <div className="text-xs text-yellow-400 mt-2">
              Editing {sectors.length} sectors. Empty fields will keep their original values.
            </div>
          )}

          {/* Scrub hint */}
          <div className="text-xs text-gray-600 mt-2">
            Tip: Drag on labels to scrub values. Shift: fine, Ctrl: fast. Scroll wheel on inputs.
          </div>
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

      {/* Effect Browser Dialog */}
      <EffectBrowserDialog
        open={showEffectBrowser}
        currentEffect={special !== '' ? Number(special) : 0}
        mapFormat={map.format}
        onSelect={(effectId) => {
          setSpecial(effectId.toString());
          setShowEffectBrowser(false);
        }}
        onCancel={() => setShowEffectBrowser(false)}
      />
    </div>
  );
}