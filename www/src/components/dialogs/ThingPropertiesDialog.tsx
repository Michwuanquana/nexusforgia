import { useState, useEffect } from 'react';
import type { Thing } from '../../core/map/types';
import { ThingFlags } from '../../core/map/types';
import type { MapData } from '../../core/map/MapData';
import { useEscapeKey } from '../../hooks/useEscapeKey';

interface ThingPropertiesDialogProps {
  open: boolean;
  things: Thing[];
  map: MapData;
  onClose: () => void;
  onSave: (updates: Partial<Thing>[]) => void;
}

export function ThingPropertiesDialog({
  open,
  things,
  map,
  onClose,
  onSave,
}: ThingPropertiesDialogProps) {
  const [tid, setTid] = useState('');
  const [x, setX] = useState('');
  const [y, setY] = useState('');
  const [z, setZ] = useState('');
  const [angle, setAngle] = useState('');
  const [type, setType] = useState('');
  const [special, setSpecial] = useState('');
  const [args, setArgs] = useState<string[]>(['', '', '', '', '']);
  const [flags, setFlags] = useState<{ [key: string]: boolean }>({});

  // Close on Escape
  useEscapeKey(onClose, open);

  useEffect(() => {
    if (!open || things.length === 0) return;

    // Single selection
    if (things.length === 1) {
      const thing = things[0];
      setTid(thing.tid.toString());
      setX(thing.x.toString());
      setY(thing.y.toString());
      setZ(thing.z.toString());
      setAngle(thing.angle.toString());
      setType(thing.type.toString());
      setSpecial(thing.special.toString());
      setArgs(thing.args.map((a) => a.toString()));

      // Set flags
      const flagStates: { [key: string]: boolean } = {};
      for (const [name, value] of Object.entries(ThingFlags)) {
        flagStates[name] = (thing.flags & value) !== 0;
      }
      setFlags(flagStates);
    } else {
      // Multiple selection - show empty for mixed values
      setTid('');
      setX('');
      setY('');
      setZ('');
      setAngle('');
      setType('');
      setSpecial('');
      setArgs(['', '', '', '', '']);

      // For flags, show checked if ALL selected things have the flag
      const flagStates: { [key: string]: boolean } = {};
      for (const [name, value] of Object.entries(ThingFlags)) {
        flagStates[name] = things.every((t) => (t.flags & value) !== 0);
      }
      setFlags(flagStates);
    }
  }, [open, things]);

  const handleFlagChange = (flagName: string, checked: boolean) => {
    setFlags((prev) => ({ ...prev, [flagName]: checked }));
  };

  const handleSave = () => {
    const updates: Partial<Thing>[] = [];

    for (const thing of things) {
      const update: Partial<Thing> = { id: thing.id };

      if (tid !== '') update.tid = Number(tid);
      if (x !== '') update.x = Number(x);
      if (y !== '') update.y = Number(y);
      if (z !== '') update.z = Number(z);
      if (angle !== '') update.angle = Number(angle);
      if (type !== '') update.type = Number(type);
      if (special !== '') update.special = Number(special);

      // Args
      const newArgs: [number, number, number, number, number] = [0, 0, 0, 0, 0];
      let hasArgs = false;
      for (let i = 0; i < 5; i++) {
        if (args[i] !== '') {
          newArgs[i] = Number(args[i]);
          hasArgs = true;
        } else if (things.length === 1) {
          newArgs[i] = things[0].args[i];
        }
      }
      if (hasArgs) update.args = newArgs;

      // Flags
      let newFlags = things.length === 1 ? thing.flags : 0;
      for (const [name, value] of Object.entries(ThingFlags)) {
        if (flags[name]) {
          newFlags |= value;
        } else {
          newFlags &= ~value;
        }
      }
      update.flags = newFlags;

      updates.push(update);
    }

    if (updates.length > 0) {
      onSave(updates);
    }
    onClose();
  };

  if (!open) return null;

  const title =
    things.length === 1
      ? `Thing ${things[0].id} Properties`
      : `${things.length} Things Properties`;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-[#2a2a3e] border border-[#444] rounded-lg shadow-xl w-[500px] max-h-[80vh] overflow-y-auto"
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
          {/* Basic Properties */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-gray-400 mb-1">TID</label>
              <input
                type="number"
                value={tid}
                onChange={(e) => setTid(e.target.value)}
                className="w-full px-3 py-2 bg-[#1e1e2e] border border-[#444] rounded text-white"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Type</label>
              <input
                type="number"
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full px-3 py-2 bg-[#1e1e2e] border border-[#444] rounded text-white"
              />
            </div>
          </div>

          {/* Position */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm text-gray-400 mb-1">X</label>
              <input
                type="number"
                value={x}
                onChange={(e) => setX(e.target.value)}
                className="w-full px-3 py-2 bg-[#1e1e2e] border border-[#444] rounded text-white"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Y</label>
              <input
                type="number"
                value={y}
                onChange={(e) => setY(e.target.value)}
                className="w-full px-3 py-2 bg-[#1e1e2e] border border-[#444] rounded text-white"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Z</label>
              <input
                type="number"
                value={z}
                onChange={(e) => setZ(e.target.value)}
                className="w-full px-3 py-2 bg-[#1e1e2e] border border-[#444] rounded text-white"
              />
            </div>
          </div>

          {/* Angle */}
          <div>
            <label className="block text-sm text-gray-400 mb-1">Angle (degrees)</label>
            <input
              type="number"
              value={angle}
              onChange={(e) => setAngle(e.target.value)}
              className="w-full px-3 py-2 bg-[#1e1e2e] border border-[#444] rounded text-white"
            />
          </div>

          {/* Special & Args */}
          <div>
            <label className="block text-sm text-gray-400 mb-1">Special</label>
            <input
              type="number"
              value={special}
              onChange={(e) => setSpecial(e.target.value)}
              className="w-full px-3 py-2 bg-[#1e1e2e] border border-[#444] rounded text-white"
            />
          </div>

          <div className="grid grid-cols-5 gap-2">
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
                  className="w-full px-2 py-1 bg-[#1e1e2e] border border-[#444] rounded text-white text-sm"
                />
              </div>
            ))}
          </div>

          {/* Flags */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">Flags</label>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(ThingFlags).map(([name, _value]) => (
                <label key={name} className="flex items-center text-sm text-white cursor-pointer">
                  <input
                    type="checkbox"
                    checked={flags[name] || false}
                    onChange={(e) => handleFlagChange(name, e.target.checked)}
                    className="mr-2"
                  />
                  {name.replace(/_/g, ' ')}
                </label>
              ))}
            </div>
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
    </div>
  );
}
