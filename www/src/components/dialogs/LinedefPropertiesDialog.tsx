import { useState, useEffect } from 'react';
import type { Linedef, Sidedef } from '../../core/map/types';
import { LinedefFlags } from '../../core/map/types';
import type { MapData } from '../../core/map/MapData';
import { TextureSelector } from '../common/TextureSelector';
import { useEscapeKey } from '../../hooks/useEscapeKey';

interface SidedefChange {
  action: 'create' | 'update' | 'delete';
  side: 'front' | 'back';
  linedefId: number;
  sidedefId?: number;
  sectorId?: number;
  data?: Partial<Sidedef>;
}

interface LinedefPropertiesDialogProps {
  open: boolean;
  linedefs: Linedef[];
  map: MapData;
  onClose: () => void;
  onSave: (linedefUpdates: Partial<Linedef>[], sidedefUpdates: Partial<Sidedef>[], sidedefChanges?: SidedefChange[]) => void;
}

export function LinedefPropertiesDialog({
  open,
  linedefs,
  map,
  onClose,
  onSave,
}: LinedefPropertiesDialogProps) {
  const [special, setSpecial] = useState('');
  const [args, setArgs] = useState<string[]>(['', '', '', '', '']);
  const [flags, setFlags] = useState<{ [key: string]: boolean }>({});

  // Front sidedef
  const [frontOffsetX, setFrontOffsetX] = useState('');
  const [frontOffsetY, setFrontOffsetY] = useState('');
  const [frontUpper, setFrontUpper] = useState('');
  const [frontLower, setFrontLower] = useState('');
  const [frontMiddle, setFrontMiddle] = useState('');

  // Back sidedef
  const [backOffsetX, setBackOffsetX] = useState('');
  const [backOffsetY, setBackOffsetY] = useState('');
  const [backUpper, setBackUpper] = useState('');
  const [backLower, setBackLower] = useState('');
  const [backMiddle, setBackMiddle] = useState('');

  // Sector assignment
  const [hasFrontSide, setHasFrontSide] = useState(false);
  const [hasBackSide, setHasBackSide] = useState(false);
  const [frontSectorId, setFrontSectorId] = useState('');
  const [backSectorId, setBackSectorId] = useState('');

  // Close on Escape
  useEscapeKey(onClose, open);

  useEffect(() => {
    if (!open || linedefs.length === 0) return;

    // Single selection
    if (linedefs.length === 1) {
      const linedef = linedefs[0];
      setSpecial(linedef.special.toString());
      setArgs(linedef.args.map((a) => a.toString()));

      // Set flags
      const flagStates: { [key: string]: boolean } = {};
      for (const [name, value] of Object.entries(LinedefFlags)) {
        if (name !== 'ACTIVATION_MASK') {
          flagStates[name] = (linedef.flags & value) !== 0;
        }
      }
      setFlags(flagStates);

      // Front sidedef
      const hasFront = linedef.frontSidedef !== null;
      setHasFrontSide(hasFront);
      if (hasFront) {
        const front = map.sidedefs.get(linedef.frontSidedef!);
        if (front) {
          setFrontOffsetX(front.offsetX.toString());
          setFrontOffsetY(front.offsetY.toString());
          setFrontUpper(front.upperTexture);
          setFrontLower(front.lowerTexture);
          setFrontMiddle(front.middleTexture);
          setFrontSectorId(front.sector.toString());
        }
      } else {
        setFrontOffsetX('0');
        setFrontOffsetY('0');
        setFrontUpper('-');
        setFrontLower('-');
        setFrontMiddle('STONE');
        setFrontSectorId('0');
      }

      // Back sidedef
      const hasBack = linedef.backSidedef !== null;
      setHasBackSide(hasBack);
      if (hasBack) {
        const back = map.sidedefs.get(linedef.backSidedef!);
        if (back) {
          setBackOffsetX(back.offsetX.toString());
          setBackOffsetY(back.offsetY.toString());
          setBackUpper(back.upperTexture);
          setBackLower(back.lowerTexture);
          setBackMiddle(back.middleTexture);
          setBackSectorId(back.sector.toString());
        }
      } else {
        setBackOffsetX('0');
        setBackOffsetY('0');
        setBackUpper('-');
        setBackLower('-');
        setBackMiddle('-');
        setBackSectorId('0');
      }
    } else {
      // Multiple selection - reset to empty
      setSpecial('');
      setArgs(['', '', '', '', '']);

      // For flags, show checked if ALL selected linedefs have the flag
      const flagStates: { [key: string]: boolean } = {};
      for (const [name, value] of Object.entries(LinedefFlags)) {
        if (name !== 'ACTIVATION_MASK') {
          flagStates[name] = linedefs.every((l) => (l.flags & value) !== 0);
        }
      }
      setFlags(flagStates);

      // Clear sidedef fields
      setFrontOffsetX('');
      setFrontOffsetY('');
      setFrontUpper('');
      setFrontLower('');
      setFrontMiddle('');
      setBackOffsetX('');
      setBackOffsetY('');
      setBackUpper('');
      setBackLower('');
      setBackMiddle('');

      // Multi-select: check if all have front/back
      setHasFrontSide(linedefs.every(l => l.frontSidedef !== null));
      setHasBackSide(linedefs.every(l => l.backSidedef !== null));
      setFrontSectorId('');
      setBackSectorId('');
    }
  }, [open, linedefs, map]);

  const handleFlagChange = (flagName: string, checked: boolean) => {
    setFlags((prev) => ({ ...prev, [flagName]: checked }));
  };

  const handleSave = () => {
    const linedefUpdates: Partial<Linedef>[] = [];
    const sidedefUpdates: Partial<Sidedef>[] = [];
    const sidedefChanges: SidedefChange[] = [];

    for (const linedef of linedefs) {
      const linedefUpdate: Partial<Linedef> = { id: linedef.id };

      if (special !== '') linedefUpdate.special = Number(special);

      // Args
      const newArgs: [number, number, number, number, number] = [0, 0, 0, 0, 0];
      let hasArgs = false;
      for (let i = 0; i < 5; i++) {
        if (args[i] !== '') {
          newArgs[i] = Number(args[i]);
          hasArgs = true;
        } else if (linedefs.length === 1) {
          newArgs[i] = linedef.args[i];
        }
      }
      if (hasArgs) linedefUpdate.args = newArgs;

      // Flags
      let newFlags = linedefs.length === 1 ? linedef.flags : 0;
      for (const [name, value] of Object.entries(LinedefFlags)) {
        if (name !== 'ACTIVATION_MASK') {
          if (flags[name]) {
            newFlags |= value;
          } else {
            newFlags &= ~value;
          }
        }
      }
      linedefUpdate.flags = newFlags;

      linedefUpdates.push(linedefUpdate);

      // Front sidedef changes
      const hadFront = linedef.frontSidedef !== null;
      if (hasFrontSide && !hadFront) {
        // Create new front sidedef
        sidedefChanges.push({
          action: 'create',
          side: 'front',
          linedefId: linedef.id,
          sectorId: frontSectorId !== '' ? Number(frontSectorId) : 0,
          data: {
            offsetX: Number(frontOffsetX) || 0,
            offsetY: Number(frontOffsetY) || 0,
            upperTexture: frontUpper || '-',
            lowerTexture: frontLower || '-',
            middleTexture: frontMiddle || 'STONE',
          }
        });
      } else if (!hasFrontSide && hadFront) {
        // Delete front sidedef
        sidedefChanges.push({
          action: 'delete',
          side: 'front',
          linedefId: linedef.id,
          sidedefId: linedef.frontSidedef!,
        });
      } else if (hasFrontSide && hadFront) {
        // Update front sidedef
        const frontUpdate: Partial<Sidedef> = { id: linedef.frontSidedef! };
        if (frontOffsetX !== '') frontUpdate.offsetX = Number(frontOffsetX);
        if (frontOffsetY !== '') frontUpdate.offsetY = Number(frontOffsetY);
        if (frontUpper !== '') frontUpdate.upperTexture = frontUpper.toUpperCase();
        if (frontLower !== '') frontUpdate.lowerTexture = frontLower.toUpperCase();
        if (frontMiddle !== '') frontUpdate.middleTexture = frontMiddle.toUpperCase();
        if (frontSectorId !== '' && linedefs.length === 1) {
          frontUpdate.sector = Number(frontSectorId);
        }
        sidedefUpdates.push(frontUpdate);
      }

      // Back sidedef changes
      const hadBack = linedef.backSidedef !== null;
      if (hasBackSide && !hadBack) {
        // Create new back sidedef
        sidedefChanges.push({
          action: 'create',
          side: 'back',
          linedefId: linedef.id,
          sectorId: backSectorId !== '' ? Number(backSectorId) : 0,
          data: {
            offsetX: Number(backOffsetX) || 0,
            offsetY: Number(backOffsetY) || 0,
            upperTexture: backUpper || '-',
            lowerTexture: backLower || '-',
            middleTexture: backMiddle || '-',
          }
        });
      } else if (!hasBackSide && hadBack) {
        // Delete back sidedef
        sidedefChanges.push({
          action: 'delete',
          side: 'back',
          linedefId: linedef.id,
          sidedefId: linedef.backSidedef!,
        });
      } else if (hasBackSide && hadBack) {
        // Update back sidedef
        const backUpdate: Partial<Sidedef> = { id: linedef.backSidedef! };
        if (backOffsetX !== '') backUpdate.offsetX = Number(backOffsetX);
        if (backOffsetY !== '') backUpdate.offsetY = Number(backOffsetY);
        if (backUpper !== '') backUpdate.upperTexture = backUpper.toUpperCase();
        if (backLower !== '') backUpdate.lowerTexture = backLower.toUpperCase();
        if (backMiddle !== '') backUpdate.middleTexture = backMiddle.toUpperCase();
        if (backSectorId !== '' && linedefs.length === 1) {
          backUpdate.sector = Number(backSectorId);
        }
        sidedefUpdates.push(backUpdate);
      }
    }

    if (linedefUpdates.length > 0 || sidedefUpdates.length > 0 || sidedefChanges.length > 0) {
      onSave(linedefUpdates, sidedefUpdates, sidedefChanges);
    }
    onClose();
  };

  if (!open) return null;

  const title =
    linedefs.length === 1
      ? `Linedef ${linedefs[0].id} Properties`
      : `${linedefs.length} Linedefs Properties`;

  // Get list of available sectors for dropdown
  const sectorList = Array.from(map.sectors.values()).map(s => s.id).sort((a, b) => a - b);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-[#2a2a3e] border border-[#444] rounded-lg shadow-xl w-[700px] max-h-[85vh] overflow-y-auto"
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
          {/* Special & Args */}
          <div className="grid grid-cols-6 gap-2">
            <div className="col-span-1">
              <label className="block text-sm text-gray-400 mb-1">Special</label>
              <input
                type="number"
                value={special}
                onChange={(e) => setSpecial(e.target.value)}
                className="w-full px-3 py-2 bg-[#1e1e2e] border border-[#444] rounded text-white"
              />
            </div>
            {args.map((arg, i) => (
              <div key={i}>
                <label className="block text-xs text-gray-400 mb-1">Arg{i}</label>
                <input
                  type="number"
                  value={arg}
                  onChange={(e) => {
                    const newArgs = [...args];
                    newArgs[i] = e.target.value;
                    setArgs(newArgs);
                  }}
                  className="w-full px-2 py-2 bg-[#1e1e2e] border border-[#444] rounded text-white text-sm"
                />
              </div>
            ))}
          </div>

          {/* Flags */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">Flags</label>
            <div className="grid grid-cols-3 gap-2">
              {Object.entries(LinedefFlags).map(([name, _value]) => {
                if (name === 'ACTIVATION_MASK') return null;
                return (
                  <label key={name} className="flex items-center text-sm text-white cursor-pointer">
                    <input
                      type="checkbox"
                      checked={flags[name] || false}
                      onChange={(e) => handleFlagChange(name, e.target.checked)}
                      className="mr-2"
                    />
                    {name.replace(/_/g, ' ')}
                  </label>
                );
              })}
            </div>
          </div>

          {/* Sidedefs */}
          <div className="grid grid-cols-2 gap-4">
            {/* Front Sidedef */}
            <div className={`border border-[#444] rounded p-3 ${!hasFrontSide ? 'opacity-60' : ''}`}>
              <div className="flex items-center justify-between mb-3">
                <label className="flex items-center text-white font-semibold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasFrontSide}
                    onChange={(e) => setHasFrontSide(e.target.checked)}
                    className="mr-2"
                  />
                  Front Sidedef
                </label>
              </div>
              {hasFrontSide && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Sector ID</label>
                    <select
                      value={frontSectorId}
                      onChange={(e) => setFrontSectorId(e.target.value)}
                      className="w-full px-2 py-1 bg-[#1e1e2e] border border-[#444] rounded text-white text-sm"
                    >
                      {sectorList.length === 0 && <option value="0">0 (new)</option>}
                      {sectorList.map(id => (
                        <option key={id} value={id}>{id}</option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">X Offset</label>
                      <input
                        type="number"
                        value={frontOffsetX}
                        onChange={(e) => setFrontOffsetX(e.target.value)}
                        className="w-full px-2 py-1 bg-[#1e1e2e] border border-[#444] rounded text-white text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Y Offset</label>
                      <input
                        type="number"
                        value={frontOffsetY}
                        onChange={(e) => setFrontOffsetY(e.target.value)}
                        className="w-full px-2 py-1 bg-[#1e1e2e] border border-[#444] rounded text-white text-sm"
                      />
                    </div>
                  </div>
                  {linedefs.length === 1 && (
                    <>
                      <TextureSelector
                        value={frontUpper}
                        type="texture"
                        onChange={setFrontUpper}
                        label="Upper"
                      />
                      <TextureSelector
                        value={frontMiddle}
                        type="texture"
                        onChange={setFrontMiddle}
                        label="Middle"
                      />
                      <TextureSelector
                        value={frontLower}
                        type="texture"
                        onChange={setFrontLower}
                        label="Lower"
                      />
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Back Sidedef */}
            <div className={`border border-[#444] rounded p-3 ${!hasBackSide ? 'opacity-60' : ''}`}>
              <div className="flex items-center justify-between mb-3">
                <label className="flex items-center text-white font-semibold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasBackSide}
                    onChange={(e) => setHasBackSide(e.target.checked)}
                    className="mr-2"
                  />
                  Back Sidedef
                </label>
              </div>
              {hasBackSide && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Sector ID</label>
                    <select
                      value={backSectorId}
                      onChange={(e) => setBackSectorId(e.target.value)}
                      className="w-full px-2 py-1 bg-[#1e1e2e] border border-[#444] rounded text-white text-sm"
                    >
                      {sectorList.length === 0 && <option value="0">0 (new)</option>}
                      {sectorList.map(id => (
                        <option key={id} value={id}>{id}</option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">X Offset</label>
                      <input
                        type="number"
                        value={backOffsetX}
                        onChange={(e) => setBackOffsetX(e.target.value)}
                        className="w-full px-2 py-1 bg-[#1e1e2e] border border-[#444] rounded text-white text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Y Offset</label>
                      <input
                        type="number"
                        value={backOffsetY}
                        onChange={(e) => setBackOffsetY(e.target.value)}
                        className="w-full px-2 py-1 bg-[#1e1e2e] border border-[#444] rounded text-white text-sm"
                      />
                    </div>
                  </div>
                  {linedefs.length === 1 && (
                    <>
                      <TextureSelector
                        value={backUpper}
                        type="texture"
                        onChange={setBackUpper}
                        label="Upper"
                      />
                      <TextureSelector
                        value={backMiddle}
                        type="texture"
                        onChange={setBackMiddle}
                        label="Middle"
                      />
                      <TextureSelector
                        value={backLower}
                        type="texture"
                        onChange={setBackLower}
                        label="Lower"
                      />
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Multi-select note */}
          {linedefs.length > 1 && (
            <div className="text-xs text-yellow-400">
              Editing {linedefs.length} linedefs. Texture selectors only available for single selection.
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
