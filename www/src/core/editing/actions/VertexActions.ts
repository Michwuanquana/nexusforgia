import type { Action } from '../interfaces';
import type { MapData } from '../../map/MapData';
import type { Vec2 } from '../../map/types';

export class MoveVerticesAction implements Action {
  readonly name = 'Move Vertices';
  dx: number;
  dy: number;
  map: MapData;
  vertexIds: number[];

  constructor(map: MapData, vertexIds: number[], dx: number, dy: number) {
    this.map = map;
    this.vertexIds = vertexIds;
    this.dx = dx;
    this.dy = dy;
  }

  execute(): void {
    for (const id of this.vertexIds) {
      const vertex = this.map.vertices.get(id);
      if (vertex) {
        vertex.x += this.dx;
        vertex.y += this.dy;
      }
    }
  }

  undo(): void {
    for (const id of this.vertexIds) {
      const vertex = this.map.vertices.get(id);
      if (vertex) {
        vertex.x -= this.dx;
        vertex.y -= this.dy;
      }
    }
  }

  canMerge(other: Action): boolean {
    if (!(other instanceof MoveVerticesAction)) return false;
    if (this.vertexIds.length !== other.vertexIds.length) return false;
    return this.vertexIds.every((id, i) => id === other.vertexIds[i]);
  }

  merge(other: Action): void {
    if (other instanceof MoveVerticesAction) {
      this.dx += other.dx;
      this.dy += other.dy;
    }
  }
}

export class CreateVertexAction implements Action {
  readonly name = 'Create Vertex';
  vertexId: number | null = null;
  map: MapData;
  x: number;
  y: number;

  constructor(map: MapData, x: number, y: number) {
    this.map = map;
    this.x = x;
    this.y = y;
  }

  execute(): void {
    if (this.vertexId === null) {
      this.vertexId = this.map.allocateVertexId();
    }
    this.map.vertices.set(this.vertexId, {
      id: this.vertexId,
      x: this.x,
      y: this.y,
      linedefs: new Set(),
    });
  }

  undo(): void {
    if (this.vertexId !== null) {
      this.map.vertices.delete(this.vertexId);
    }
  }

  getVertexId(): number | null {
    return this.vertexId;
  }
}

export class DeleteVerticesAction implements Action {
  readonly name = 'Delete Vertices';
  deletedData: Map<number, { x: number; y: number; linedefs: Set<number> }> = new Map();
  map: MapData;
  vertexIds: number[];

  constructor(map: MapData, vertexIds: number[]) {
    this.map = map;
    this.vertexIds = vertexIds;
  }

  execute(): void {
    for (const id of this.vertexIds) {
      const vertex = this.map.vertices.get(id);
      if (vertex) {
        this.deletedData.set(id, {
          x: vertex.x,
          y: vertex.y,
          linedefs: new Set(vertex.linedefs),
        });
        this.map.vertices.delete(id);
      }
    }
  }

  undo(): void {
    for (const [id, data] of this.deletedData) {
      this.map.vertices.set(id, {
        id,
        x: data.x,
        y: data.y,
        linedefs: new Set(data.linedefs),
      });
    }
  }
}

export class CreateLinedefAction implements Action {
  readonly name = 'Create Linedef';
  linedefId: number | null = null;
  map: MapData;
  v1: number;
  v2: number;

  constructor(map: MapData, v1: number, v2: number) {
    this.map = map;
    this.v1 = v1;
    this.v2 = v2;
  }

  execute(): void {
    if (this.linedefId === null) {
      this.linedefId = this.map.allocateLinedefId();
    }

    this.map.linedefs.set(this.linedefId, {
      id: this.linedefId,
      v1: this.v1,
      v2: this.v2,
      flags: 0,
      special: 0,
      args: [0, 0, 0, 0, 0],
      frontSidedef: null,
      backSidedef: null,
      frontSector: null,
      backSector: null,
    });

    // Update vertex linedef references
    const vertex1 = this.map.vertices.get(this.v1);
    const vertex2 = this.map.vertices.get(this.v2);
    if (vertex1) vertex1.linedefs.add(this.linedefId);
    if (vertex2) vertex2.linedefs.add(this.linedefId);
  }

  undo(): void {
    if (this.linedefId !== null) {
      // Remove from vertex references
      const vertex1 = this.map.vertices.get(this.v1);
      const vertex2 = this.map.vertices.get(this.v2);
      if (vertex1) vertex1.linedefs.delete(this.linedefId);
      if (vertex2) vertex2.linedefs.delete(this.linedefId);

      this.map.linedefs.delete(this.linedefId);
    }
  }

  getLinedefId(): number | null {
    return this.linedefId;
  }
}

export class SplitLinedefAction implements Action {
  readonly name = 'Split Linedef';
  newVertexId: number | null = null;
  newLinedefId: number | null = null;
  oldLinedefV2: number | null = null;
  map: MapData;
  linedefId: number;
  splitPoint: Vec2;

  constructor(map: MapData, linedefId: number, splitPoint: Vec2) {
    this.map = map;
    this.linedefId = linedefId;
    this.splitPoint = splitPoint;
  }

  execute(): void {
    const linedef = this.map.linedefs.get(this.linedefId);
    if (!linedef) return;

    // Create new vertex at split point
    if (this.newVertexId === null) {
      this.newVertexId = this.map.allocateVertexId();
    }
    this.map.vertices.set(this.newVertexId, {
      id: this.newVertexId,
      x: this.splitPoint.x,
      y: this.splitPoint.y,
      linedefs: new Set([this.linedefId]),
    });

    // Store old v2
    this.oldLinedefV2 = linedef.v2;

    // Modify existing linedef to end at new vertex
    linedef.v2 = this.newVertexId;

    // Create new linedef from new vertex to old v2
    if (this.newLinedefId === null) {
      this.newLinedefId = this.map.allocateLinedefId();
    }
    this.map.linedefs.set(this.newLinedefId, {
      id: this.newLinedefId,
      v1: this.newVertexId,
      v2: this.oldLinedefV2,
      flags: linedef.flags,
      special: linedef.special,
      args: [...linedef.args] as [number, number, number, number, number],
      frontSidedef: linedef.frontSidedef,
      backSidedef: linedef.backSidedef,
      frontSector: linedef.frontSector,
      backSector: linedef.backSector,
    });

    // Update vertex references
    const v2 = this.map.vertices.get(this.oldLinedefV2);
    if (v2) {
      v2.linedefs.delete(this.linedefId);
      v2.linedefs.add(this.newLinedefId);
    }
    const newVertex = this.map.vertices.get(this.newVertexId);
    if (newVertex) {
      newVertex.linedefs.add(this.newLinedefId);
    }
  }

  undo(): void {
    if (this.newLinedefId === null || this.newVertexId === null || this.oldLinedefV2 === null) {
      return;
    }

    const linedef = this.map.linedefs.get(this.linedefId);
    if (linedef) {
      linedef.v2 = this.oldLinedefV2;
    }

    // Remove new linedef
    this.map.linedefs.delete(this.newLinedefId);

    // Remove new vertex
    this.map.vertices.delete(this.newVertexId);

    // Restore vertex references
    const v2 = this.map.vertices.get(this.oldLinedefV2);
    if (v2) {
      v2.linedefs.add(this.linedefId);
      v2.linedefs.delete(this.newLinedefId);
    }
  }
}

export class CurveLinedefAction implements Action {
  readonly name = 'Curve Linedef';
  originalV1: number = 0;
  originalV2: number = 0;
  newVertexIds: number[] = [];
  newLinedefIds: number[] = [];
  map: MapData;
  linedefId: number;
  segments: number;
  offset: number; // Curve offset (positive = right, negative = left)

  constructor(map: MapData, linedefId: number, segments: number = 8, offset: number = 32) {
    this.map = map;
    this.linedefId = linedefId;
    this.segments = segments;
    this.offset = offset;
  }

  execute(): void {
    const linedef = this.map.linedefs.get(this.linedefId);
    if (!linedef) return;

    const v1 = this.map.vertices.get(linedef.v1);
    const v2 = this.map.vertices.get(linedef.v2);
    if (!v1 || !v2) return;

    this.originalV1 = linedef.v1;
    this.originalV2 = linedef.v2;

    // Calculate curve points using quadratic Bezier curve
    const midX = (v1.x + v2.x) / 2;
    const midY = (v1.y + v2.y) / 2;

    // Perpendicular direction for control point
    const dx = v2.x - v1.x;
    const dy = v2.y - v1.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len === 0) return;

    const nx = -dy / len;
    const ny = dx / len;

    // Control point offset from midpoint
    const controlX = midX + nx * this.offset;
    const controlY = midY + ny * this.offset;

    // Generate curve points
    const points: Vec2[] = [];
    for (let i = 1; i < this.segments; i++) {
      const t = i / this.segments;
      // Quadratic Bezier: B(t) = (1-t)^2 * P0 + 2(1-t)t * P1 + t^2 * P2
      const mt = 1 - t;
      const x = mt * mt * v1.x + 2 * mt * t * controlX + t * t * v2.x;
      const y = mt * mt * v1.y + 2 * mt * t * controlY + t * t * v2.y;
      points.push({ x: Math.round(x), y: Math.round(y) });
    }

    // Create new vertices for curve points
    for (const point of points) {
      const vertexId = this.map.allocateVertexId();
      this.newVertexIds.push(vertexId);
      this.map.vertices.set(vertexId, {
        id: vertexId,
        x: point.x,
        y: point.y,
        linedefs: new Set(),
      });
    }

    // Modify original linedef to connect v1 to first curve point
    const firstNewVertexId = this.newVertexIds[0];
    const oldV2Vertex = this.map.vertices.get(this.originalV2);
    if (oldV2Vertex) {
      oldV2Vertex.linedefs.delete(this.linedefId);
    }
    linedef.v2 = firstNewVertexId;
    const firstNewVertex = this.map.vertices.get(firstNewVertexId);
    if (firstNewVertex) {
      firstNewVertex.linedefs.add(this.linedefId);
    }

    // Create new linedefs connecting the curve points
    for (let i = 0; i < this.newVertexIds.length; i++) {
      const startV = this.newVertexIds[i];
      const endV = i === this.newVertexIds.length - 1 ? this.originalV2 : this.newVertexIds[i + 1];

      const newLinedefId = this.map.allocateLinedefId();
      this.newLinedefIds.push(newLinedefId);

      this.map.linedefs.set(newLinedefId, {
        id: newLinedefId,
        v1: startV,
        v2: endV,
        flags: linedef.flags,
        special: 0, // Don't copy special to all segments
        args: [0, 0, 0, 0, 0],
        frontSidedef: linedef.frontSidedef,
        backSidedef: linedef.backSidedef,
        frontSector: linedef.frontSector,
        backSector: linedef.backSector,
      });

      // Update vertex references
      const startVertex = this.map.vertices.get(startV);
      const endVertex = this.map.vertices.get(endV);
      if (startVertex) startVertex.linedefs.add(newLinedefId);
      if (endVertex) endVertex.linedefs.add(newLinedefId);
    }
  }

  undo(): void {
    // Delete all new linedefs
    for (const id of this.newLinedefIds) {
      const linedef = this.map.linedefs.get(id);
      if (linedef) {
        const v1 = this.map.vertices.get(linedef.v1);
        const v2 = this.map.vertices.get(linedef.v2);
        if (v1) v1.linedefs.delete(id);
        if (v2) v2.linedefs.delete(id);
      }
      this.map.linedefs.delete(id);
    }

    // Delete all new vertices
    for (const id of this.newVertexIds) {
      this.map.vertices.delete(id);
    }

    // Restore original linedef
    const linedef = this.map.linedefs.get(this.linedefId);
    if (linedef) {
      linedef.v2 = this.originalV2;
      const v2 = this.map.vertices.get(this.originalV2);
      if (v2) v2.linedefs.add(this.linedefId);
    }

    this.newVertexIds = [];
    this.newLinedefIds = [];
  }
}

export class MergeVerticesAction implements Action {
  readonly name = 'Merge Vertices';
  targetId: number;
  deletedVertices: Map<number, { x: number; y: number; linedefs: Set<number> }> = new Map();
  updatedLinedefs: Map<number, { v1: number; v2: number }> = new Map();
  map: MapData;
  vertexIds: number[];

  constructor(map: MapData, vertexIds: number[]) {
    this.map = map;
    this.vertexIds = vertexIds;
    // Use first vertex as target
    this.targetId = vertexIds[0];
  }

  execute(): void {
    const target = this.map.vertices.get(this.targetId);
    if (!target) return;

    // Calculate average position
    let sumX = 0;
    let sumY = 0;
    for (const id of this.vertexIds) {
      const v = this.map.vertices.get(id);
      if (v) {
        sumX += v.x;
        sumY += v.y;
      }
    }
    target.x = sumX / this.vertexIds.length;
    target.y = sumY / this.vertexIds.length;

    // Merge all vertices into target
    for (let i = 1; i < this.vertexIds.length; i++) {
      const id = this.vertexIds[i];
      const vertex = this.map.vertices.get(id);
      if (!vertex) continue;

      // Store vertex data for undo
      this.deletedVertices.set(id, {
        x: vertex.x,
        y: vertex.y,
        linedefs: new Set(vertex.linedefs),
      });

      // Update all linedefs that used this vertex
      for (const linedefId of vertex.linedefs) {
        const linedef = this.map.linedefs.get(linedefId);
        if (linedef) {
          if (!this.updatedLinedefs.has(linedefId)) {
            this.updatedLinedefs.set(linedefId, { v1: linedef.v1, v2: linedef.v2 });
          }
          if (linedef.v1 === id) linedef.v1 = this.targetId;
          if (linedef.v2 === id) linedef.v2 = this.targetId;
          target.linedefs.add(linedefId);
        }
      }

      // Delete the merged vertex
      this.map.vertices.delete(id);
    }
  }

  undo(): void {
    // Restore deleted vertices
    for (const [id, data] of this.deletedVertices) {
      this.map.vertices.set(id, {
        id,
        x: data.x,
        y: data.y,
        linedefs: new Set(data.linedefs),
      });
    }

    // Restore linedef connections
    for (const [linedefId, original] of this.updatedLinedefs) {
      const linedef = this.map.linedefs.get(linedefId);
      if (linedef) {
        linedef.v1 = original.v1;
        linedef.v2 = original.v2;
      }
    }
  }
}
