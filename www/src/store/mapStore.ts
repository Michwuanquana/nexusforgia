import { create } from 'zustand';
import { MapData } from '../core/map/MapData';
import { MapWriter } from '../io/map/MapWriter';
import { WadWriter } from '../io/wad/WadWriter';

interface MapState {
  map: MapData;
  dirty: boolean;

  setMap: (map: MapData) => void;
  markDirty: () => void;
  markClean: () => void;
  saveToLocalStorage: () => void;
  loadFromLocalStorage: () => boolean;
  clearSession: () => void;
  clearAllData: () => void;
  exportToWad: (filename?: string) => void;
}

export const useMapStore = create<MapState>((set, get) => ({
  map: new MapData(),
  dirty: false,

  setMap: (map) => set({ map, dirty: false }),
  markDirty: () => set({ dirty: true }),
  markClean: () => set({ dirty: false }),

  saveToLocalStorage: () => {
    const { map } = get();
    const json = map.serialize();
    localStorage.setItem(`doom_map_${map.name}`, json);
    localStorage.setItem('last_opened_map', map.name);
    set({ dirty: false });
    console.log(`Map ${map.name} saved to localStorage`);
  },

  loadFromLocalStorage: () => {
    const lastMap = localStorage.getItem('last_opened_map');
    if (!lastMap) return false;

    const json = localStorage.getItem(`doom_map_${lastMap}`);
    if (!json) return false;

    const map = new MapData();
    try {
      map.deserialize(json);
      set({ map, dirty: false });
      console.log(`Map ${lastMap} loaded from localStorage`);
      return true;
    } catch (e) {
      console.error('Failed to load map from localStorage', e);
      return false;
    }
  },

  clearSession: () => {
    const { map } = get();
    // Remove current map from localStorage
    if (map.name) {
      localStorage.removeItem(`doom_map_${map.name}`);
    }
    localStorage.removeItem('last_opened_map');
    // Reset to empty map
    set({ map: new MapData(), dirty: false });
    console.log('Session cleared');
  },

  clearAllData: () => {
    // Clear ALL doom-related localStorage data
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('doom_') || key === 'last_opened_map' || key.startsWith('udmf_'))) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));

    // Reset to empty map
    set({ map: new MapData(), dirty: false });
    console.log(`Cleared all data (${keysToRemove.length} items)`);
  },

  exportToWad: (filename?: string) => {
    const { map } = get();
    const mapName = map.name || 'MAP01';
    const wadFilename = filename || `${mapName.toLowerCase()}.wad`;

    try {
      // Convert map to WAD lumps
      const lumps = MapWriter.write(map, mapName, map.format);

      // Create WAD file
      const wadBuffer = WadWriter.write(lumps);

      // Download
      WadWriter.download(wadBuffer, wadFilename);

      console.log(`Exported ${mapName} to ${wadFilename}`);
    } catch (e) {
      console.error('Failed to export WAD:', e);
      throw e;
    }
  },
}));
