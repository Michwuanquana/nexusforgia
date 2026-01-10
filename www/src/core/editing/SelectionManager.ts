import type { SelectionType, BBox, Vec2 } from './interfaces';
import type { MapData } from '../map/MapData';

export interface SelectionState {
  vertices: Set<number>;
  linedefs: Set<number>;
  sectors: Set<number>;
  things: Set<number>;
}

export class SelectionManager {
  private state: SelectionState = {
    vertices: new Set(),
    linedefs: new Set(),
    sectors: new Set(),
    things: new Set(),
  };

  private listeners: Set<() => void> = new Set();

  // === GETTERS ===

  getVertices(): ReadonlySet<number> {
    return this.state.vertices;
  }

  getLinedefs(): ReadonlySet<number> {
    return this.state.linedefs;
  }

  getSectors(): ReadonlySet<number> {
    return this.state.sectors;
  }

  getThings(): ReadonlySet<number> {
    return this.state.things;
  }

  hasSelection(type?: SelectionType): boolean {
    if (type) {
      return this.getSet(type).size > 0;
    }
    return (
      this.state.vertices.size > 0 ||
      this.state.linedefs.size > 0 ||
      this.state.sectors.size > 0 ||
      this.state.things.size > 0
    );
  }

  count(type: SelectionType): number {
    return this.getSet(type).size;
  }

  // === SELECTION OPERATIONS ===

  select(type: SelectionType, id: number, additive: boolean = false): void {
    if (!additive) {
      this.clearAll();
    }
    this.getSet(type).add(id);
    this.notify();
  }

  selectMultiple(type: SelectionType, ids: number[], additive: boolean = false): void {
    if (!additive) {
      this.clearAll();
    }
    const set = this.getSet(type);
    for (const id of ids) {
      set.add(id);
    }
    this.notify();
  }

  deselect(type: SelectionType, id: number): void {
    this.getSet(type).delete(id);
    this.notify();
  }

  toggle(type: SelectionType, id: number): void {
    const set = this.getSet(type);
    if (set.has(id)) {
      set.delete(id);
    } else {
      set.add(id);
    }
    this.notify();
  }

  isSelected(type: SelectionType, id: number): boolean {
    return this.getSet(type).has(id);
  }

  clearAll(): void {
    this.state.vertices.clear();
    this.state.linedefs.clear();
    this.state.sectors.clear();
    this.state.things.clear();
    this.notify();
  }

  clear(type: SelectionType): void {
    this.getSet(type).clear();
    this.notify();
  }

  // === BOX SELECTION ===

  selectInBox(type: SelectionType, box: BBox, map: MapData, additive: boolean = false): number {
    if (!additive) {
      this.clearAll();
    }

    const set = this.getSet(type);
    let count = 0;

    switch (type) {
      case 'vertex':
        for (const [id, v] of map.vertices) {
          if (this.pointInBox(v, box)) {
            set.add(id);
            count++;
          }
        }
        break;

      case 'linedef':
        for (const [id, line] of map.linedefs) {
          const v1 = map.vertices.get(line.v1);
          const v2 = map.vertices.get(line.v2);
          if (v1 && v2 && this.lineIntersectsBox(v1, v2, box)) {
            set.add(id);
            count++;
          }
        }
        break;

      case 'sector':
        for (const [id, sector] of map.sectors) {
          if (sector.boundingBox && this.boxIntersectsBox(sector.boundingBox, box)) {
            set.add(id);
            count++;
          }
        }
        break;

      case 'thing':
        for (const [id, thing] of map.things) {
          if (this.pointInBox(thing, box)) {
            set.add(id);
            count++;
          }
        }
        break;
    }

    this.notify();
    return count;
  }

  // === RELATED SELECTION (Doom Builder style) ===

  selectConnectedLinedefs(map: MapData): void {
    for (const vid of this.state.vertices) {
      const vertex = map.vertices.get(vid);
      if (vertex) {
        for (const lid of vertex.linedefs) {
          this.state.linedefs.add(lid);
        }
      }
    }
    this.notify();
  }

  selectLinedefVertices(map: MapData): void {
    for (const lid of this.state.linedefs) {
      const line = map.linedefs.get(lid);
      if (line) {
        this.state.vertices.add(line.v1);
        this.state.vertices.add(line.v2);
      }
    }
    this.notify();
  }

  selectSectorLinedefs(map: MapData): void {
    for (const sid of this.state.sectors) {
      const sector = map.sectors.get(sid);
      if (sector) {
        for (const lid of sector.linedefs) {
          this.state.linedefs.add(lid);
        }
      }
    }
    this.notify();
  }

  selectAll(type: SelectionType, map: MapData): void {
    const set = this.getSet(type);
    switch (type) {
      case 'vertex':
        for (const id of map.vertices.keys()) set.add(id);
        break;
      case 'linedef':
        for (const id of map.linedefs.keys()) set.add(id);
        break;
      case 'sector':
        for (const id of map.sectors.keys()) set.add(id);
        break;
      case 'thing':
        for (const id of map.things.keys()) set.add(id);
        break;
    }
    this.notify();
  }

  invertSelection(type: SelectionType, map: MapData): void {
    const set = this.getSet(type);
    const collection =
      type === 'vertex'
        ? map.vertices
        : type === 'linedef'
          ? map.linedefs
          : type === 'sector'
            ? map.sectors
            : map.things;

    for (const id of collection.keys()) {
      if (set.has(id)) {
        set.delete(id);
      } else {
        set.add(id);
      }
    }
    this.notify();
  }

  // === HELPERS ===

  private getSet(type: SelectionType): Set<number> {
    switch (type) {
      case 'vertex':
        return this.state.vertices;
      case 'linedef':
        return this.state.linedefs;
      case 'sector':
        return this.state.sectors;
      case 'thing':
        return this.state.things;
    }
  }

  private pointInBox(p: Vec2, box: BBox): boolean {
    return p.x >= box.minX && p.x <= box.maxX && p.y >= box.minY && p.y <= box.maxY;
  }

  private lineIntersectsBox(v1: Vec2, v2: Vec2, box: BBox): boolean {
    if (this.pointInBox(v1, box) || this.pointInBox(v2, box)) {
      return true;
    }
    return (
      this.lineIntersectsLine(v1, v2, { x: box.minX, y: box.minY }, { x: box.maxX, y: box.minY }) ||
      this.lineIntersectsLine(v1, v2, { x: box.maxX, y: box.minY }, { x: box.maxX, y: box.maxY }) ||
      this.lineIntersectsLine(v1, v2, { x: box.maxX, y: box.maxY }, { x: box.minX, y: box.maxY }) ||
      this.lineIntersectsLine(v1, v2, { x: box.minX, y: box.maxY }, { x: box.minX, y: box.minY })
    );
  }

  private lineIntersectsLine(a1: Vec2, a2: Vec2, b1: Vec2, b2: Vec2): boolean {
    const d1 = this.cross(b2.x - b1.x, b2.y - b1.y, a1.x - b1.x, a1.y - b1.y);
    const d2 = this.cross(b2.x - b1.x, b2.y - b1.y, a2.x - b1.x, a2.y - b1.y);
    const d3 = this.cross(a2.x - a1.x, a2.y - a1.y, b1.x - a1.x, b1.y - a1.y);
    const d4 = this.cross(a2.x - a1.x, a2.y - a1.y, b2.x - a1.x, b2.y - a1.y);
    return ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0));
  }

  private cross(ax: number, ay: number, bx: number, by: number): number {
    return ax * by - ay * bx;
  }

  private boxIntersectsBox(a: BBox, b: BBox): boolean {
    return a.minX <= b.maxX && a.maxX >= b.minX && a.minY <= b.maxY && a.maxY >= b.minY;
  }

  // === OBSERVERS ===

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    for (const listener of this.listeners) {
      listener();
    }
  }
}
