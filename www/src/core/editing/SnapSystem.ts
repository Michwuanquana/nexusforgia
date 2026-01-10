import type { Vec2, SnapConfig, SnapResult } from './interfaces';
import type { MapData } from '../map/MapData';
import type { Vertex } from '../map/types';

export class SnapSystem {
  config: SnapConfig = {
    gridSize: 32,
    snapToGrid: true,
    snapToVertices: true,
    snapToLines: true,
    snapDistance: 8,
  };
  map: MapData;

  constructor(map: MapData) {
    this.map = map;
  }

  setConfig(config: Partial<SnapConfig>): void {
    Object.assign(this.config, config);
  }

  getConfig(): SnapConfig {
    return { ...this.config };
  }

  snap(pos: Vec2, cameraZoom: number, excludeVertices?: Set<number>): SnapResult {
    const snapDist = this.config.snapDistance / cameraZoom;

    // Priority: Vertex > Line > Grid
    if (this.config.snapToVertices) {
      const vertex = this.findNearestVertex(pos, snapDist, excludeVertices);
      if (vertex) {
        return {
          position: { x: vertex.x, y: vertex.y },
          snappedTo: 'vertex',
          snapTarget: { id: vertex.id, type: 'vertex' },
        };
      }
    }

    if (this.config.snapToLines) {
      const lineSnap = this.findNearestLinePoint(pos, snapDist, excludeVertices);
      if (lineSnap) {
        return {
          position: lineSnap.point,
          snappedTo: 'line',
          snapTarget: { id: lineSnap.linedefId, type: 'linedef' },
        };
      }
    }

    if (this.config.snapToGrid) {
      return {
        position: this.snapToGrid(pos),
        snappedTo: 'grid',
      };
    }

    return { position: pos, snappedTo: 'none' };
  }

  snapToGrid(pos: Vec2): Vec2 {
    return {
      x: Math.round(pos.x / this.config.gridSize) * this.config.gridSize,
      y: Math.round(pos.y / this.config.gridSize) * this.config.gridSize,
    };
  }

  private findNearestVertex(pos: Vec2, maxDistance: number, exclude?: Set<number>): Vertex | null {
    let nearest: Vertex | null = null;
    let nearestDist = maxDistance;

    for (const v of this.map.vertices.values()) {
      if (exclude?.has(v.id)) continue;
      const dist = Math.hypot(v.x - pos.x, v.y - pos.y);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = v;
      }
    }

    return nearest;
  }

  private findNearestLinePoint(
    pos: Vec2,
    maxDistance: number,
    excludeVertices?: Set<number>
  ): { point: Vec2; linedefId: number } | null {
    let nearest: { point: Vec2; linedefId: number } | null = null;
    let nearestDist = maxDistance;

    for (const line of this.map.linedefs.values()) {
      const v1 = this.map.vertices.get(line.v1);
      const v2 = this.map.vertices.get(line.v2);
      if (!v1 || !v2) continue;

      if (excludeVertices?.has(v1.id) || excludeVertices?.has(v2.id)) continue;

      const closest = this.closestPointOnLine(pos, v1, v2);
      const dist = Math.hypot(closest.x - pos.x, closest.y - pos.y);

      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = { point: closest, linedefId: line.id };
      }
    }

    return nearest;
  }

  private closestPointOnLine(p: Vec2, a: Vec2, b: Vec2): Vec2 {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len2 = dx * dx + dy * dy;

    if (len2 === 0) return a;

    const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2));

    return {
      x: a.x + t * dx,
      y: a.y + t * dy,
    };
  }
}
