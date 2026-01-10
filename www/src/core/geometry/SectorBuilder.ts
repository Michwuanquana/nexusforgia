// SectorBuilder - Auto sector detection from closed loops
import type { MapData } from '../map/MapData';
import type { Linedef, Sector, Sidedef } from '../map/types';

/**
 * Polygon representation for sector detection
 */
interface Loop {
  vertices: number[]; // Vertex IDs in order
  linedefs: number[]; // Linedef IDs in order
  winding: 'cw' | 'ccw';
  area: number;
}

export class SectorBuilder {
  /**
   * Detect all closed loops in the map and create sectors
   */
  static detectAndCreateSectors(map: MapData): Sector[] {
    const loops = this.detectClosedLoops(map);
    const sectors: Sector[] = [];

    for (const loop of loops) {
      const sector = this.createSectorFromLoop(map, loop);
      if (sector) {
        sectors.push(sector);
      }
    }

    return sectors;
  }

  /**
   * Detect all closed loops of linedefs
   */
  static detectClosedLoops(map: MapData): Loop[] {
    const loops: Loop[] = [];
    const visited = new Set<string>();

    // For each vertex, try to find loops starting from it
    for (const [vertexId] of map.vertices) {
      const vertex = map.vertices.get(vertexId);
      if (!vertex || vertex.linedefs.size === 0) continue;

      // Try each connected linedef as a starting edge
      for (const linedefId of vertex.linedefs) {
        const linedef = map.linedefs.get(linedefId);
        if (!linedef) continue;

        // Try both directions
        for (const startVertex of [linedef.v1, linedef.v2]) {
          const loopKey = `${startVertex}-${linedefId}`;
          if (visited.has(loopKey)) continue;

          const loop = this.traceLoop(map, startVertex, linedefId);
          if (loop && loop.vertices.length >= 3) {
            // Mark all edges in this loop as visited
            for (let i = 0; i < loop.linedefs.length; i++) {
              const vid = loop.vertices[i];
              const lid = loop.linedefs[i];
              visited.add(`${vid}-${lid}`);
            }

            loops.push(loop);
          }
        }
      }
    }

    return loops;
  }

  /**
   * Trace a loop starting from a vertex along a linedef
   */
  private static traceLoop(
    map: MapData,
    startVertexId: number,
    firstLinedefId: number
  ): Loop | null {
    const vertices: number[] = [startVertexId];
    const linedefs: number[] = [firstLinedefId];

    let currentVertexId = startVertexId;
    let currentLinedefId = firstLinedefId;

    // Follow the path
    for (let steps = 0; steps < 10000; steps++) {
      const linedef = map.linedefs.get(currentLinedefId);
      if (!linedef) break;

      // Move to the next vertex
      const nextVertexId = linedef.v1 === currentVertexId ? linedef.v2 : linedef.v1;

      // Check if we've completed the loop
      if (nextVertexId === startVertexId && vertices.length >= 3) {
        const winding = this.determineWinding(map, vertices);
        const area = this.calculateArea(map, vertices);
        return { vertices, linedefs, winding, area };
      }

      // If we've already visited this vertex in this trace, it's not a valid loop
      if (vertices.includes(nextVertexId)) {
        break;
      }

      const nextVertex = map.vertices.get(nextVertexId);
      if (!nextVertex) break;

      // Find the next linedef (turn right/left at the vertex)
      const nextLinedefId = this.findNextLinedef(
        map,
        currentLinedefId,
        nextVertexId,
        'right' // Always turn right to trace outer boundary
      );

      if (nextLinedefId === null) break;

      vertices.push(nextVertexId);
      linedefs.push(nextLinedefId);

      currentVertexId = nextVertexId;
      currentLinedefId = nextLinedefId;
    }

    return null;
  }

  /**
   * Find the next linedef when traversing a loop
   * direction: 'right' or 'left' - which way to turn at the vertex
   */
  private static findNextLinedef(
    map: MapData,
    currentLinedefId: number,
    vertexId: number,
    direction: 'right' | 'left'
  ): number | null {
    const currentLinedef = map.linedefs.get(currentLinedefId);
    if (!currentLinedef) return null;

    const vertex = map.vertices.get(vertexId);
    if (!vertex) return null;

    // Get incoming direction
    const v1 = map.vertices.get(currentLinedef.v1);
    const v2 = map.vertices.get(currentLinedef.v2);
    if (!v1 || !v2) return null;

    const incomingAngle =
      currentLinedef.v2 === vertexId
        ? Math.atan2(v2.y - v1.y, v2.x - v1.x)
        : Math.atan2(v1.y - v2.y, v1.x - v2.x);

    // Find all connected linedefs except the current one
    const candidates: Array<{ id: number; angle: number; angleDiff: number }> = [];

    for (const linedefId of vertex.linedefs) {
      if (linedefId === currentLinedefId) continue;

      const linedef = map.linedefs.get(linedefId);
      if (!linedef) continue;

      const otherV1 = map.vertices.get(linedef.v1);
      const otherV2 = map.vertices.get(linedef.v2);
      if (!otherV1 || !otherV2) continue;

      // Outgoing angle from this vertex
      const outgoingAngle =
        linedef.v1 === vertexId
          ? Math.atan2(otherV2.y - otherV1.y, otherV2.x - otherV1.x)
          : Math.atan2(otherV1.y - otherV2.y, otherV1.x - otherV2.x);

      let angleDiff = outgoingAngle - incomingAngle;

      // Normalize to [0, 2π)
      while (angleDiff < 0) angleDiff += 2 * Math.PI;
      while (angleDiff >= 2 * Math.PI) angleDiff -= 2 * Math.PI;

      candidates.push({ id: linedefId, angle: outgoingAngle, angleDiff });
    }

    if (candidates.length === 0) return null;

    // Sort by angle difference
    // For 'right' turn, we want the smallest positive angle
    // For 'left' turn, we want the largest angle
    if (direction === 'right') {
      candidates.sort((a, b) => a.angleDiff - b.angleDiff);
      return candidates[0].id;
    } else {
      candidates.sort((a, b) => b.angleDiff - a.angleDiff);
      return candidates[0].id;
    }
  }

  /**
   * Determine winding order of a polygon
   */
  static determineWinding(map: MapData, vertexIds: number[]): 'cw' | 'ccw' {
    let sum = 0;

    for (let i = 0; i < vertexIds.length; i++) {
      const v1 = map.vertices.get(vertexIds[i]);
      const v2 = map.vertices.get(vertexIds[(i + 1) % vertexIds.length]);

      if (!v1 || !v2) continue;

      sum += (v2.x - v1.x) * (v2.y + v1.y);
    }

    return sum > 0 ? 'cw' : 'ccw';
  }

  /**
   * Calculate area of a polygon (used for sorting nested loops)
   */
  private static calculateArea(map: MapData, vertexIds: number[]): number {
    let area = 0;

    for (let i = 0; i < vertexIds.length; i++) {
      const v1 = map.vertices.get(vertexIds[i]);
      const v2 = map.vertices.get(vertexIds[(i + 1) % vertexIds.length]);

      if (!v1 || !v2) continue;

      area += v1.x * v2.y - v2.x * v1.y;
    }

    return Math.abs(area) / 2;
  }

  /**
   * Create a sector from a detected loop
   */
  private static createSectorFromLoop(map: MapData, loop: Loop): Sector | null {
    // Check if this loop already has a sector assigned
    const firstLinedef = map.linedefs.get(loop.linedefs[0]);
    if (!firstLinedef) return null;

    // Determine which side this loop is on
    const isClockwise = loop.winding === 'cw';

    // Check if all linedefs in this loop already have the appropriate sidedef
    // If so, skip creating a sector for this loop
    let allSidesAssigned = true;
    for (const linedefId of loop.linedefs) {
      const linedef = map.linedefs.get(linedefId);
      if (!linedef) continue;

      const linedefV1Index = loop.vertices.findIndex((vid) => vid === linedef.v1);
      const linedefV2Index = loop.vertices.findIndex((vid) => vid === linedef.v2);
      const isForward =
        linedefV2Index === (linedefV1Index + 1) % loop.vertices.length ||
        (linedefV1Index === loop.vertices.length - 1 && linedefV2Index === 0);

      // Check if the appropriate side is already assigned
      if (isClockwise === isForward) {
        if (linedef.frontSidedef === null) allSidesAssigned = false;
      } else {
        if (linedef.backSidedef === null) allSidesAssigned = false;
      }
    }

    if (allSidesAssigned) {
      return null; // This loop already has sectors
    }

    // Create sector
    const sectorId = map.getNextId('sector');
    const sector: Sector = {
      id: sectorId,
      floorHeight: 0,
      ceilingHeight: 128,
      floorTexture: 'FLOOR0_1',
      ceilingTexture: 'CEIL1_1',
      lightLevel: 160,
      special: 0,
      tag: 0,
      linedefs: new Set(loop.linedefs),
      boundingBox: null,
      triangles: null,
    };

    // Create sidedefs for each linedef in the loop
    for (const linedefId of loop.linedefs) {
      const linedef = map.linedefs.get(linedefId);
      if (!linedef) continue;

      // Determine if this linedef's direction matches the loop direction
      const linedefV1Index = loop.vertices.findIndex((vid) => vid === linedef.v1);
      const linedefV2Index = loop.vertices.findIndex((vid) => vid === linedef.v2);

      const isForward =
        linedefV2Index === (linedefV1Index + 1) % loop.vertices.length ||
        (linedefV1Index === loop.vertices.length - 1 && linedefV2Index === 0);

      // Check if this side already has a sidedef
      const needsFront = isClockwise === isForward;
      if (needsFront && linedef.frontSidedef !== null) continue;
      if (!needsFront && linedef.backSidedef !== null) continue;

      // Create sidedef
      const sidedefId = map.getNextId('sidedef');
      const sidedef: Sidedef = {
        id: sidedefId,
        offsetX: 0,
        offsetY: 0,
        upperTexture: '-',
        lowerTexture: '-',
        middleTexture: 'STONE',
        sector: sectorId,
      };

      map.sidedefs.set(sidedefId, sidedef);

      // Assign to the correct side
      if (needsFront) {
        // Right side (front)
        linedef.frontSidedef = sidedefId;
        linedef.frontSector = sectorId;
      } else {
        // Left side (back)
        linedef.backSidedef = sidedefId;
        linedef.backSector = sectorId;
      }

      // Update two-sided flag
      if (linedef.frontSidedef !== null && linedef.backSidedef !== null) {
        linedef.flags |= 0x0004; // TWOSIDED
      }
    }

    return sector;
  }

  /**
   * Detect sectors only for linedefs connected to specific vertices
   * This is more efficient than detecting all sectors
   */
  static detectSectorsForAffectedArea(
    map: MapData,
    affectedLinedefs: Set<number>
  ): Sector[] {
    const loops: Loop[] = [];
    const visited = new Set<string>();

    // Only check linedefs that need sectors (missing front or back sidedef)
    const linedefsToCheck = Array.from(affectedLinedefs).filter(id => {
      const l = map.linedefs.get(id);
      return l && (l.frontSidedef === null || l.backSidedef === null);
    });

    if (linedefsToCheck.length === 0) return [];

    // Collect vertices from affected linedefs
    const affectedVertices = new Set<number>();
    for (const linedefId of linedefsToCheck) {
      const linedef = map.linedefs.get(linedefId);
      if (linedef) {
        affectedVertices.add(linedef.v1);
        affectedVertices.add(linedef.v2);
      }
    }

    // For each affected vertex, try to find loops
    for (const vertexId of affectedVertices) {
      const vertex = map.vertices.get(vertexId);
      if (!vertex || vertex.linedefs.size === 0) continue;

      for (const linedefId of vertex.linedefs) {
        const linedef = map.linedefs.get(linedefId);
        if (!linedef) continue;

        for (const startVertex of [linedef.v1, linedef.v2]) {
          const loopKey = `${startVertex}-${linedefId}`;
          if (visited.has(loopKey)) continue;

          const loop = this.traceLoop(map, startVertex, linedefId);
          if (loop && loop.vertices.length >= 3) {
            for (let i = 0; i < loop.linedefs.length; i++) {
              const vid = loop.vertices[i];
              const lid = loop.linedefs[i];
              visited.add(`${vid}-${lid}`);
            }
            loops.push(loop);
          }
        }
      }
    }

    const sectors: Sector[] = [];
    for (const loop of loops) {
      const sector = this.createSectorFromLoop(map, loop);
      if (sector) {
        sectors.push(sector);
      }
    }

    return sectors;
  }

  /**
   * Split an existing sector with a new linedef
   */
  static splitSector(
    map: MapData,
    sector: Sector,
    dividingLinedef: Linedef
  ): [Sector, Sector] | null {
    // This is complex - for now, just re-detect all sectors
    // A proper implementation would:
    // 1. Find which linedefs are now on each side of the dividing line
    // 2. Create two new sectors
    // 3. Update sidedef references

    // For MVP, we can implement this later
    console.warn('splitSector not yet implemented - re-run sector detection');
    return null;
  }
}
