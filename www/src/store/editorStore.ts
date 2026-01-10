import { create } from 'zustand';
import { DEFAULT_THING_TYPE } from '../data/thingTypes';

export type EditorMode = 'vertex' | 'linedef' | 'sector' | 'thing' | 'draw';
export type SectorViewMode = 'none' | 'floor' | 'ceiling' | 'brightness';

interface CursorPosition {
  x: number;
  y: number;
  snappedX: number;
  snappedY: number;
}

interface EditorState {
  mode: EditorMode;
  gridSize: number;
  snapToGrid: boolean;
  showGrid: boolean;
  showThings: boolean;
  showVertices: boolean;
  sectorViewMode: SectorViewMode;
  cursorPosition: CursorPosition | null;
  lastThingType: number; // Last used thing type for inserting new things

  setMode: (mode: EditorMode) => void;
  setGridSize: (size: number) => void;
  toggleSnapToGrid: () => void;
  toggleShowGrid: () => void;
  toggleShowThings: () => void;
  toggleShowVertices: () => void;
  setSectorViewMode: (mode: SectorViewMode) => void;
  cycleSectorViewMode: () => void;
  setCursorPosition: (pos: CursorPosition | null) => void;
  setLastThingType: (type: number) => void;
}

export const useEditorStore = create<EditorState>((set) => ({
  mode: 'vertex',
  gridSize: 32,
  snapToGrid: true,
  showGrid: true,
  showThings: true,
  showVertices: true,
  sectorViewMode: 'floor',
  cursorPosition: null,
  lastThingType: DEFAULT_THING_TYPE,

  setMode: (mode) => set({ mode }),
  setGridSize: (gridSize) => set({ gridSize }),
  toggleSnapToGrid: () => set((s) => ({ snapToGrid: !s.snapToGrid })),
  toggleShowGrid: () => set((s) => ({ showGrid: !s.showGrid })),
  toggleShowThings: () => set((s) => ({ showThings: !s.showThings })),
  toggleShowVertices: () => set((s) => ({ showVertices: !s.showVertices })),
  setSectorViewMode: (sectorViewMode) => set({ sectorViewMode }),
  cycleSectorViewMode: () => set((s) => {
    const modes: SectorViewMode[] = ['none', 'floor', 'ceiling', 'brightness'];
    const currentIndex = modes.indexOf(s.sectorViewMode);
    const nextIndex = (currentIndex + 1) % modes.length;
    return { sectorViewMode: modes[nextIndex] };
  }),
  setCursorPosition: (cursorPosition) => set({ cursorPosition }),
  setLastThingType: (lastThingType) => set({ lastThingType }),
}));
