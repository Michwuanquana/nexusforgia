import type { Vertex, Linedef, Sidedef, Sector, Thing, BBox } from './types';
import type { MapFormatId } from './MapFormat';

export class MapData {
  name: string = 'MAP01';
  format: MapFormatId = 'boom_doom2';

  vertices: Map<number, Vertex> = new Map();
  linedefs: Map<number, Linedef> = new Map();
  sidedefs: Map<number, Sidedef> = new Map();
  sectors: Map<number, Sector> = new Map();
  things: Map<number, Thing> = new Map();

  // ACS Script data (Hexen format)
  behaviorLump: ArrayBuffer | null = null;  // Compiled ACS bytecode
  scriptsLump: string | null = null;        // ACS source code

  private nextVertexId = 0;
  private nextLinedefId = 0;
  private nextSidedefId = 0;
  private nextSectorId = 0;
  private nextThingId = 0;

  allocateVertexId(): number {
    return this.nextVertexId++;
  }

  allocateLinedefId(): number {
    return this.nextLinedefId++;
  }

  allocateSidedefId(): number {
    return this.nextSidedefId++;
  }

  allocateSectorId(): number {
    return this.nextSectorId++;
  }

  allocateThingId(): number {
    return this.nextThingId++;
  }

  getNextId(type: 'vertex' | 'linedef' | 'sidedef' | 'sector' | 'thing'): number {
    switch (type) {
      case 'vertex':
        return this.allocateVertexId();
      case 'linedef':
        return this.allocateLinedefId();
      case 'sidedef':
        return this.allocateSidedefId();
      case 'sector':
        return this.allocateSectorId();
      case 'thing':
        return this.allocateThingId();
    }
  }

  setNextIds(vertex: number, linedef: number, sidedef: number, sector: number, thing: number): void {
    this.nextVertexId = vertex;
    this.nextLinedefId = linedef;
    this.nextSidedefId = sidedef;
    this.nextSectorId = sector;
    this.nextThingId = thing;
  }

  getVertexLinedefs(vertexId: number): Linedef[] {
    const vertex = this.vertices.get(vertexId);
    if (!vertex) return [];
    return Array.from(vertex.linedefs)
      .map((id) => this.linedefs.get(id))
      .filter((l): l is Linedef => l !== undefined);
  }

  getSectorLinedefs(sectorId: number): Linedef[] {
    return Array.from(this.linedefs.values()).filter(
      (l) => l.frontSector === sectorId || l.backSector === sectorId
    );
  }

  getLinedefVertices(linedef: Linedef): [Vertex, Vertex] | null {
    const v1 = this.vertices.get(linedef.v1);
    const v2 = this.vertices.get(linedef.v2);
    if (!v1 || !v2) return null;
    return [v1, v2];
  }

  findVertexNear(x: number, y: number, radius: number): Vertex | null {
    let closest: Vertex | null = null;
    let closestDist = radius * radius;

    for (const vertex of this.vertices.values()) {
      const dx = vertex.x - x;
      const dy = vertex.y - y;
      const distSq = dx * dx + dy * dy;
      if (distSq < closestDist) {
        closestDist = distSq;
        closest = vertex;
      }
    }

    return closest;
  }

  findLinedefNear(x: number, y: number, radius: number): Linedef | null {
    let closest: Linedef | null = null;
    let closestDist = radius;

    for (const linedef of this.linedefs.values()) {
      const v1 = this.vertices.get(linedef.v1);
      const v2 = this.vertices.get(linedef.v2);
      if (!v1 || !v2) continue;

      const dist = this.pointToLineDistance(x, y, v1.x, v1.y, v2.x, v2.y);
      if (dist < closestDist) {
        closestDist = dist;
        closest = linedef;
      }
    }

    return closest;
  }

  private pointToLineDistance(
    px: number,
    py: number,
    x1: number,
    y1: number,
    x2: number,
    y2: number
  ): number {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const lengthSq = dx * dx + dy * dy;

    if (lengthSq === 0) {
      return Math.sqrt((px - x1) ** 2 + (py - y1) ** 2);
    }

    let t = ((px - x1) * dx + (py - y1) * dy) / lengthSq;
    t = Math.max(0, Math.min(1, t));

    const nearestX = x1 + t * dx;
    const nearestY = y1 + t * dy;

    return Math.sqrt((px - nearestX) ** 2 + (py - nearestY) ** 2);
  }

  getBoundingBox(): BBox {
    let minX = Infinity,
      minY = Infinity;
    let maxX = -Infinity,
      maxY = -Infinity;

    for (const v of this.vertices.values()) {
      minX = Math.min(minX, v.x);
      minY = Math.min(minY, v.y);
      maxX = Math.max(maxX, v.x);
      maxY = Math.max(maxY, v.y);
    }

    if (!isFinite(minX)) {
      return { minX: -1000, minY: -1000, maxX: 1000, maxY: 1000 };
    }

    return { minX, minY, maxX, maxY };
  }

  calculateSectorBoundingBoxes(): void {
    for (const sector of this.sectors.values()) {
      let minX = Infinity, minY = Infinity;
      let maxX = -Infinity, maxY = -Infinity;

      // Find all linedefs belonging to this sector
      for (const linedef of this.linedefs.values()) {
        if (linedef.frontSector === sector.id || linedef.backSector === sector.id) {
          const v1 = this.vertices.get(linedef.v1);
          const v2 = this.vertices.get(linedef.v2);
          if (v1) {
            minX = Math.min(minX, v1.x);
            minY = Math.min(minY, v1.y);
            maxX = Math.max(maxX, v1.x);
            maxY = Math.max(maxY, v1.y);
          }
          if (v2) {
            minX = Math.min(minX, v2.x);
            minY = Math.min(minY, v2.y);
            maxX = Math.max(maxX, v2.x);
            maxY = Math.max(maxY, v2.y);
          }
        }
      }

      if (isFinite(minX)) {
        sector.boundingBox = { minX, minY, maxX, maxY };
      }
    }
  }

  findSectorAt(x: number, y: number): Sector | null {
    // Find smallest sector containing point (to handle nested sectors)
    let bestSector: Sector | null = null;
    let bestArea = Infinity;

    for (const sector of this.sectors.values()) {
      if (!sector.boundingBox) continue;

      const box = sector.boundingBox;
      if (x >= box.minX && x <= box.maxX && y >= box.minY && y <= box.maxY) {
        // Point is inside bounding box, check area
        const area = (box.maxX - box.minX) * (box.maxY - box.minY);
        if (area < bestArea) {
          bestArea = area;
          bestSector = sector;
        }
      }
    }

    return bestSector;
  }

  /**
   * Find vertices that have no linedefs connected
   */
  findOrphanVertices(): number[] {
    const orphans: number[] = [];
    for (const [id, vertex] of this.vertices) {
      if (vertex.linedefs.size === 0) {
        orphans.push(id);
      }
    }
    return orphans;
  }

  /**
   * Find all sidedefs that belong to a sector
   */
  getSidedefsForSector(sectorId: number): Sidedef[] {
    const sidedefs: Sidedef[] = [];
    for (const sidedef of this.sidedefs.values()) {
      if (sidedef.sector === sectorId) {
        sidedefs.push(sidedef);
      }
    }
    return sidedefs;
  }

  /**
   * Check if a linedef is exclusively used by the given sectors
   * (i.e., both front and back sectors are in the set, or only one side exists and it's in the set)
   */
  isLinedefExclusiveToSectors(linedefId: number, sectorIds: Set<number>): boolean {
    const linedef = this.linedefs.get(linedefId);
    if (!linedef) return false;

    const frontInSet = linedef.frontSector !== null && sectorIds.has(linedef.frontSector);
    const backInSet = linedef.backSector !== null && sectorIds.has(linedef.backSector);
    const frontExists = linedef.frontSector !== null;
    const backExists = linedef.backSector !== null;

    // Exclusive if all existing sides are in the set
    if (frontExists && backExists) {
      return frontInSet && backInSet;
    } else if (frontExists) {
      return frontInSet;
    } else if (backExists) {
      return backInSet;
    }
    return false;
  }

  /**
   * Get all sectors that would be affected by changes to the given linedefs
   */
  getAffectedSectors(linedefIds: number[]): Set<number> {
    const affected = new Set<number>();
    for (const id of linedefIds) {
      const linedef = this.linedefs.get(id);
      if (linedef) {
        if (linedef.frontSector !== null) affected.add(linedef.frontSector);
        if (linedef.backSector !== null) affected.add(linedef.backSector);
      }
    }
    return affected;
  }

  /**
   * Check if a sector is still valid (has at least one linedef)
   */
  isSectorValid(sectorId: number): boolean {
    for (const linedef of this.linedefs.values()) {
      if (linedef.frontSector === sectorId || linedef.backSector === sectorId) {
        return true;
      }
    }
    return false;
  }

  validate(): string[] {
    const errors: string[] = [];

    for (const [id, linedef] of this.linedefs) {
      if (!this.vertices.has(linedef.v1)) {
        errors.push(`Linedef ${id}: invalid v1 reference ${linedef.v1}`);
      }
      if (!this.vertices.has(linedef.v2)) {
        errors.push(`Linedef ${id}: invalid v2 reference ${linedef.v2}`);
      }
    }

    for (const [id, sidedef] of this.sidedefs) {
      if (!this.sectors.has(sidedef.sector)) {
        errors.push(`Sidedef ${id}: invalid sector reference ${sidedef.sector}`);
      }
    }

    return errors;
  }

  serialize(): string {
    const data = {
      name: this.name,
      format: this.format,
      vertices: Array.from(this.vertices.entries()).map(([id, v]) => ({ ...v, linedefs: Array.from(v.linedefs) })),
      linedefs: Array.from(this.linedefs.entries()),
      sidedefs: Array.from(this.sidedefs.entries()),
      sectors: Array.from(this.sectors.entries()).map(([id, s]) => ({ ...s, linedefs: Array.from(s.linedefs) })),
      things: Array.from(this.things.entries()),
      nextIds: {
        vertex: this.nextVertexId,
        linedef: this.nextLinedefId,
        sidedef: this.nextSidedefId,
        sector: this.nextSectorId,
        thing: this.nextThingId,
      },
    };
    return JSON.stringify(data);
  }

  deserialize(json: string): void {
    const data = JSON.parse(json);
    this.clear();
    this.name = data.name;
    this.format = data.format || 'boom_doom2';

    for (const v of data.vertices) {
      this.vertices.set(v.id, { ...v, linedefs: new Set(v.linedefs) });
    }
    for (const [id, l] of data.linedefs) {
      this.linedefs.set(id, l);
    }
    for (const [id, s] of data.sidedefs) {
      this.sidedefs.set(id, s);
    }
    for (const s of data.sectors) {
      this.sectors.set(s.id, { ...s, linedefs: new Set(s.linedefs) });
    }
    for (const [id, t] of data.things) {
      this.things.set(id, t);
    }

    const next = data.nextIds;
    this.setNextIds(next.vertex, next.linedef, next.sidedef, next.sector, next.thing);
  }

  clear(): void {
    this.name = 'MAP01';
    this.format = 'boom_doom2';
    this.vertices.clear();
    this.linedefs.clear();
    this.sidedefs.clear();
    this.sectors.clear();
    this.things.clear();
    this.behaviorLump = null;
    this.scriptsLump = null;
    this.nextVertexId = 0;
    this.nextLinedefId = 0;
    this.nextSidedefId = 0;
    this.nextSectorId = 0;
    this.nextThingId = 0;
  }
}
