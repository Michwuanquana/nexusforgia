import * as PIXI from 'pixi.js';
import earcut from 'earcut';
import { MapData } from '../../core/map/MapData';
import { Camera } from '../Camera';
import type { Sector } from '../../core/map/types';
import type { SectorViewMode } from '../../store/editorStore';
import { useTextureStore } from '../../store/textureStore';

interface SectorGeometry {
  vertices: number[]; // flat array [x1, y1, x2, y2, ...]
  triangles: number[]; // indices into vertices
}

export class SectorLayer {
  container: PIXI.Container;
  private graphics: PIXI.Graphics;
  private geometryCache: Map<number, SectorGeometry> = new Map();
  private pixiTextureCache: Map<string, PIXI.Texture> = new Map();
  private pendingTextures: Set<string> = new Set();
  private onTextureLoaded: (() => void) | null = null;

  constructor() {
    this.container = new PIXI.Container();
    this.graphics = new PIXI.Graphics();
    this.container.addChild(this.graphics);
  }

  /**
   * Set callback to be called when a texture finishes loading
   */
  setTextureLoadedCallback(callback: () => void): void {
    this.onTextureLoaded = callback;
  }

  /**
   * Get or create a PIXI texture from a flat texture name
   */
  private getPixiTexture(flatName: string): PIXI.Texture | null {
    const upperName = flatName.toUpperCase();

    // Check cache first
    if (this.pixiTextureCache.has(upperName)) {
      return this.pixiTextureCache.get(upperName) || null;
    }

    // If already pending, skip
    if (this.pendingTextures.has(upperName)) {
      return null;
    }

    // Get flat info from texture store
    const flatInfo = useTextureStore.getState().getFlat(upperName);
    if (!flatInfo || !flatInfo.thumbnailUrl) {
      return null;
    }

    // Create PIXI texture from the data URL
    // For PIXI v8, we need to create texture from ImageBitmap or use canvas
    try {
      // Mark as pending to avoid duplicate loads
      this.pendingTextures.add(upperName);

      // Create an image element and load the data URL
      const img = new Image();
      img.crossOrigin = 'anonymous';

      img.onload = () => {
        // Create canvas to draw the image
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0);

        // Create texture from canvas (PIXI v8 compatible)
        const texture = PIXI.Texture.from(canvas);
        this.pixiTextureCache.set(upperName, texture);
        this.pendingTextures.delete(upperName);

        // Trigger re-render
        if (this.onTextureLoaded) {
          this.onTextureLoaded();
        }
      };

      img.onerror = () => {
        this.pendingTextures.delete(upperName);
      };

      img.src = flatInfo.thumbnailUrl;
      return null; // Return null for now, will be available after load
    } catch {
      this.pendingTextures.delete(upperName);
      return null;
    }
  }

  /**
   * Clear texture cache (call when WAD changes)
   */
  clearTextureCache(): void {
    // Destroy old textures to free GPU memory
    for (const texture of this.pixiTextureCache.values()) {
      texture.destroy();
    }
    this.pixiTextureCache.clear();
    this.pendingTextures.clear();
  }

  /**
   * Build sector polygon from its linedefs
   */
  private buildSectorGeometry(map: MapData, sectorId: number): SectorGeometry | null {
    const linedefs = map.getSectorLinedefs(sectorId);
    if (linedefs.length === 0) return null;

    // Build edge list - each edge with its direction relative to this sector
    const edges: Array<{ v1: number; v2: number }> = [];

    for (const linedef of linedefs) {
      const isFront = linedef.frontSector === sectorId;

      if (isFront) {
        // Front side faces right, so sector is on the right
        edges.push({ v1: linedef.v1, v2: linedef.v2 });
      } else {
        // Back side, sector is on the left - reverse direction
        edges.push({ v1: linedef.v2, v2: linedef.v1 });
      }
    }

    if (edges.length < 3) return null;

    // Build loops from edges
    const loops: number[][] = [];
    const usedEdges = new Set<number>();

    while (usedEdges.size < edges.length) {
      // Find an unused edge to start a new loop
      let startIdx = -1;
      for (let i = 0; i < edges.length; i++) {
        if (!usedEdges.has(i)) {
          startIdx = i;
          break;
        }
      }
      if (startIdx === -1) break;

      const loop: number[] = [];
      let currentEdgeIdx = startIdx;
      let iterations = 0;
      const maxIterations = edges.length * 2;

      while (iterations < maxIterations) {
        iterations++;

        if (usedEdges.has(currentEdgeIdx)) {
          // We've completed a loop
          break;
        }

        usedEdges.add(currentEdgeIdx);
        const edge = edges[currentEdgeIdx];
        loop.push(edge.v1);

        // Find next edge that starts where this one ends
        let nextIdx = -1;
        for (let i = 0; i < edges.length; i++) {
          if (!usedEdges.has(i) && edges[i].v1 === edge.v2) {
            nextIdx = i;
            break;
          }
        }

        if (nextIdx === -1) {
          // Check if loop closes back to start
          if (edges[startIdx].v1 === edge.v2) {
            break; // Loop complete
          }
          break; // Dead end
        }

        currentEdgeIdx = nextIdx;
      }

      if (loop.length >= 3) {
        loops.push(loop);
      }
    }

    if (loops.length === 0) return null;

    // Sort loops by area - largest first (outer boundary)
    const loopsWithArea = loops.map(loop => {
      let area = 0;
      for (let i = 0; i < loop.length; i++) {
        const v1 = map.vertices.get(loop[i]);
        const v2 = map.vertices.get(loop[(i + 1) % loop.length]);
        if (v1 && v2) {
          area += (v2.x - v1.x) * (v2.y + v1.y);
        }
      }
      return { loop, area: Math.abs(area) };
    });

    loopsWithArea.sort((a, b) => b.area - a.area);

    // Build flat vertex array and hole indices for earcut
    const flatVertices: number[] = [];
    const holeIndices: number[] = [];

    for (let i = 0; i < loopsWithArea.length; i++) {
      if (i > 0) {
        holeIndices.push(flatVertices.length / 2);
      }

      for (const vertexId of loopsWithArea[i].loop) {
        const vertex = map.vertices.get(vertexId);
        if (vertex) {
          flatVertices.push(vertex.x, vertex.y);
        }
      }
    }

    if (flatVertices.length < 6) return null; // Need at least 3 vertices

    // Triangulate with earcut
    const triangles = earcut(flatVertices, holeIndices.length > 0 ? holeIndices : undefined);

    return { vertices: flatVertices, triangles };
  }

  /**
   * Get or build cached geometry for a sector
   */
  private getGeometry(map: MapData, sectorId: number): SectorGeometry | null {
    if (!this.geometryCache.has(sectorId)) {
      const geom = this.buildSectorGeometry(map, sectorId);
      if (geom) {
        this.geometryCache.set(sectorId, geom);
      }
      return geom;
    }
    return this.geometryCache.get(sectorId) || null;
  }

  /**
   * Clear geometry cache (call when map changes)
   */
  clearCache(): void {
    this.geometryCache.clear();
  }

  /**
   * Get color for sector based on view mode
   */
  private getSectorColor(sector: Sector, viewMode: SectorViewMode): { color: number; alpha: number } {
    switch (viewMode) {
      case 'floor': {
        // Color based on floor height - blue (low) to red (high)
        const h = sector.floorHeight;
        const normalized = Math.max(0, Math.min(1, (h + 512) / 1024)); // -512 to 512 range
        const r = Math.floor(normalized * 255);
        const b = Math.floor((1 - normalized) * 255);
        const g = Math.floor(Math.abs(0.5 - normalized) * 2 * 100 + 50);
        return { color: (r << 16) | (g << 8) | b, alpha: 0.4 };
      }

      case 'ceiling': {
        // Color based on ceiling height - green (low) to yellow (high)
        const h = sector.ceilingHeight;
        const normalized = Math.max(0, Math.min(1, (h + 128) / 640)); // -128 to 512 range
        const r = Math.floor(normalized * 255);
        const g = Math.floor(200 - normalized * 100);
        const b = Math.floor((1 - normalized) * 100);
        return { color: (r << 16) | (g << 8) | b, alpha: 0.4 };
      }

      case 'brightness': {
        // Grayscale based on light level (0-255)
        const l = Math.max(0, Math.min(255, sector.lightLevel));
        const gray = Math.floor(l * 0.8 + 30); // Range 30-234 to keep some contrast
        return { color: (gray << 16) | (gray << 8) | gray, alpha: 0.5 };
      }

      case 'none':
      default:
        return { color: 0x000000, alpha: 0 };
    }
  }

  render(
    map: MapData,
    _camera: Camera,
    viewMode: SectorViewMode,
    selectedIds?: Set<number>,
    highlightedId?: number | null
  ): void {
    this.graphics.clear();

    // Always rebuild geometry - vertex positions may have changed
    // This is fast enough for interactive use
    this.geometryCache.clear();

    // Render sector fills based on view mode
    if (viewMode !== 'none') {
      for (const [id, sector] of map.sectors) {
        const geom = this.getGeometry(map, id);
        if (!geom || geom.triangles.length === 0) continue;

        // Draw triangulated polygon path
        for (let i = 0; i < geom.triangles.length; i += 3) {
          const i0 = geom.triangles[i] * 2;
          const i1 = geom.triangles[i + 1] * 2;
          const i2 = geom.triangles[i + 2] * 2;

          this.graphics.moveTo(geom.vertices[i0], geom.vertices[i0 + 1]);
          this.graphics.lineTo(geom.vertices[i1], geom.vertices[i1 + 1]);
          this.graphics.lineTo(geom.vertices[i2], geom.vertices[i2 + 1]);
          this.graphics.closePath();
        }

        // Try to fill with texture for floor/ceiling mode
        let filled = false;
        if (viewMode === 'floor' || viewMode === 'ceiling') {
          const textureName = viewMode === 'floor' ? sector.floorTexture : sector.ceilingTexture;
          const texture = this.getPixiTexture(textureName);

          if (texture) {
            // Use texture fill with tiling
            const matrix = new PIXI.Matrix();
            // Scale texture to 64x64 in world units (Doom flat size)
            matrix.scale(1, 1);

            this.graphics.fill({
              texture,
              matrix,
              alpha: 0.8,
            });
            filled = true;
          }
        }

        // Fallback to color fill if no texture or brightness mode
        if (!filled) {
          const { color, alpha } = this.getSectorColor(sector, viewMode);
          this.graphics.fill({ color, alpha });
        }
      }
    }

    // Render selection/highlight overlays
    for (const [id] of map.sectors) {
      const isSelected = selectedIds?.has(id) ?? false;
      const isHighlighted = highlightedId === id;

      if (!isSelected && !isHighlighted) continue;

      // Get sector linedefs for outline
      const linedefs = map.getSectorLinedefs(id);
      if (linedefs.length === 0) continue;

      let color = 0x4444aa;
      let alpha = 0.2;
      let lineWidth = 4;

      if (isSelected) {
        color = 0xff8800;
        alpha = 0.35;
        lineWidth = 6;
      }
      if (isHighlighted) {
        color = 0x00ffff;
        alpha = 0.35;
        lineWidth = 6;
      }

      // Draw each linedef that belongs to this sector
      for (const linedef of linedefs) {
        const v1 = map.vertices.get(linedef.v1);
        const v2 = map.vertices.get(linedef.v2);
        if (!v1 || !v2) continue;

        // Determine which side faces this sector
        const isFront = linedef.frontSector === id;
        const isBack = linedef.backSector === id;

        if (isFront || isBack) {
          // Draw a thick highlight on the sector side
          const dx = v2.x - v1.x;
          const dy = v2.y - v1.y;
          const len = Math.sqrt(dx * dx + dy * dy);
          if (len === 0) continue;

          // Normal pointing into sector
          let nx = -dy / len;
          let ny = dx / len;
          if (isBack) {
            nx = -nx;
            ny = -ny;
          }

          const offset = 4;
          this.graphics.moveTo(v1.x + nx * offset, v1.y + ny * offset);
          this.graphics.lineTo(v2.x + nx * offset, v2.y + ny * offset);
          this.graphics.stroke({ width: lineWidth, color, alpha });
        }
      }
    }
  }
}
