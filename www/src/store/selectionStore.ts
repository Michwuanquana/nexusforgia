import { create } from 'zustand';

interface SelectionState {
  vertices: Set<number>;
  linedefs: Set<number>;
  sectors: Set<number>;
  things: Set<number>;

  highlightedVertex: number | null;
  highlightedLinedef: number | null;
  highlightedSector: number | null;
  highlightedThing: number | null;

  selectVertex: (id: number, additive?: boolean) => void;
  selectLinedef: (id: number, additive?: boolean) => void;
  selectSector: (id: number, additive?: boolean) => void;
  selectThing: (id: number, additive?: boolean) => void;

  selectVertices: (ids: number[], additive?: boolean) => void;
  selectLinedefs: (ids: number[], additive?: boolean) => void;
  selectSectors: (ids: number[], additive?: boolean) => void;
  selectThings: (ids: number[], additive?: boolean) => void;

  deselectVertex: (id: number) => void;
  deselectLinedef: (id: number) => void;
  deselectSector: (id: number) => void;
  deselectThing: (id: number) => void;

  setHighlightedVertex: (id: number | null) => void;
  setHighlightedLinedef: (id: number | null) => void;
  setHighlightedSector: (id: number | null) => void;
  setHighlightedThing: (id: number | null) => void;

  clearAll: () => void;
  clearVertices: () => void;
  clearLinedefs: () => void;
  clearSectors: () => void;
  clearThings: () => void;
}

export const useSelectionStore = create<SelectionState>((set) => ({
  vertices: new Set(),
  linedefs: new Set(),
  sectors: new Set(),
  things: new Set(),

  highlightedVertex: null,
  highlightedLinedef: null,
  highlightedSector: null,
  highlightedThing: null,

  selectVertex: (id, additive = false) =>
    set((s) => ({
      vertices: additive ? new Set([...s.vertices, id]) : new Set([id]),
      linedefs: additive ? s.linedefs : new Set(),
      sectors: additive ? s.sectors : new Set(),
      things: additive ? s.things : new Set(),
    })),

  selectLinedef: (id, additive = false) =>
    set((s) => ({
      vertices: additive ? s.vertices : new Set(),
      linedefs: additive ? new Set([...s.linedefs, id]) : new Set([id]),
      sectors: additive ? s.sectors : new Set(),
      things: additive ? s.things : new Set(),
    })),

  selectSector: (id, additive = false) =>
    set((s) => ({
      vertices: additive ? s.vertices : new Set(),
      linedefs: additive ? s.linedefs : new Set(),
      sectors: additive ? new Set([...s.sectors, id]) : new Set([id]),
      things: additive ? s.things : new Set(),
    })),

  selectThing: (id, additive = false) =>
    set((s) => ({
      vertices: additive ? s.vertices : new Set(),
      linedefs: additive ? s.linedefs : new Set(),
      sectors: additive ? s.sectors : new Set(),
      things: additive ? new Set([...s.things, id]) : new Set([id]),
    })),

  selectVertices: (ids, additive = false) =>
    set((s) => ({
      vertices: additive ? new Set([...s.vertices, ...ids]) : new Set(ids),
      linedefs: additive ? s.linedefs : new Set(),
      sectors: additive ? s.sectors : new Set(),
      things: additive ? s.things : new Set(),
    })),

  selectLinedefs: (ids, additive = false) =>
    set((s) => ({
      vertices: additive ? s.vertices : new Set(),
      linedefs: additive ? new Set([...s.linedefs, ...ids]) : new Set(ids),
      sectors: additive ? s.sectors : new Set(),
      things: additive ? s.things : new Set(),
    })),

  selectSectors: (ids, additive = false) =>
    set((s) => ({
      vertices: additive ? s.vertices : new Set(),
      linedefs: additive ? s.linedefs : new Set(),
      sectors: additive ? new Set([...s.sectors, ...ids]) : new Set(ids),
      things: additive ? s.things : new Set(),
    })),

  selectThings: (ids, additive = false) =>
    set((s) => ({
      vertices: additive ? s.vertices : new Set(),
      linedefs: additive ? s.linedefs : new Set(),
      sectors: additive ? s.sectors : new Set(),
      things: additive ? new Set([...s.things, ...ids]) : new Set(ids),
    })),

  deselectVertex: (id) =>
    set((s) => {
      const newSet = new Set(s.vertices);
      newSet.delete(id);
      return { vertices: newSet };
    }),

  deselectLinedef: (id) =>
    set((s) => {
      const newSet = new Set(s.linedefs);
      newSet.delete(id);
      return { linedefs: newSet };
    }),

  deselectSector: (id) =>
    set((s) => {
      const newSet = new Set(s.sectors);
      newSet.delete(id);
      return { sectors: newSet };
    }),

  deselectThing: (id) =>
    set((s) => {
      const newSet = new Set(s.things);
      newSet.delete(id);
      return { things: newSet };
    }),

  setHighlightedVertex: (id) => set({ highlightedVertex: id }),
  setHighlightedLinedef: (id) => set({ highlightedLinedef: id }),
  setHighlightedSector: (id) => set({ highlightedSector: id }),
  setHighlightedThing: (id) => set({ highlightedThing: id }),

  clearAll: () =>
    set({
      vertices: new Set(),
      linedefs: new Set(),
      sectors: new Set(),
      things: new Set(),
    }),

  clearVertices: () => set({ vertices: new Set() }),
  clearLinedefs: () => set({ linedefs: new Set() }),
  clearSectors: () => set({ sectors: new Set() }),
  clearThings: () => set({ things: new Set() }),
}));
