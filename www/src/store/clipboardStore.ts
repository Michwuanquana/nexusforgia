import { create } from 'zustand';
import type { Vertex, Linedef, Sidedef, Sector, Thing } from '../core/map/types';

/**
 * Clipboard data structure for copy/paste operations.
 * Stores a self-contained snapshot of map elements that can be pasted.
 */
export interface ClipboardData {
  vertices: Vertex[];
  linedefs: Linedef[];
  sidedefs: Sidedef[];
  sectors: Sector[];
  things: Thing[];
  // Bounding box center for paste offset calculation
  centerX: number;
  centerY: number;
}

interface ClipboardState {
  data: ClipboardData | null;

  setData: (data: ClipboardData) => void;
  clear: () => void;
  hasData: () => boolean;
}

export const useClipboardStore = create<ClipboardState>((set, get) => ({
  data: null,

  setData: (data) => set({ data }),
  clear: () => set({ data: null }),
  hasData: () => get().data !== null,
}));
