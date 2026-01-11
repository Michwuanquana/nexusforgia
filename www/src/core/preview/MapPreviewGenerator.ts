// src/core/preview/MapPreviewGenerator.ts

import { MapData } from '../map/MapData';
import { LinedefFlags } from '../map/types';
import {
  type PreviewOptions,
  type PreviewColorScheme,
  DEFAULT_PREVIEW_OPTIONS,
} from './types';

interface MapTransform {
  scale: number;
  offsetX: number;
  offsetY: number;
  minX: number;
  minY: number;
  maxY: number;
}

type CanvasFactory = (width: number, height: number) => HTMLCanvasElement | OffscreenCanvas;

export class MapPreviewGenerator {
  /**
   * Generate preview as Canvas element
   */
  static generateCanvas(
    map: MapData,
    options: Partial<PreviewOptions> = {},
    canvasFactory?: CanvasFactory
  ): HTMLCanvasElement | OffscreenCanvas {
    const opts = { ...DEFAULT_PREVIEW_OPTIONS, ...options };

    let canvas: HTMLCanvasElement | OffscreenCanvas;
    if (canvasFactory) {
      canvas = canvasFactory(opts.width, opts.height);
    } else if (typeof OffscreenCanvas !== 'undefined') {
      canvas = new OffscreenCanvas(opts.width, opts.height);
    } else if (typeof document !== 'undefined') {
      canvas = document.createElement('canvas');
      canvas.width = opts.width;
      canvas.height = opts.height;
    } else {
      throw new Error('Environment does not support Canvas creation');
    }

    const ctx = canvas.getContext('2d', {
      alpha: false,
      willReadFrequently: false,
    }) as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null;

    if (!ctx) {
      throw new Error('Failed to get 2D context');
    }

    // Enable anti-aliasing
    if (opts.antialias) {
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
    }

    this.render(ctx, map, opts);

    return canvas;
  }

  /**
   * Generate preview as data URL (base64 PNG)
   */
  static generateDataURL(
    map: MapData,
    options: Partial<PreviewOptions> = {},
    canvasFactory?: CanvasFactory
  ): string {
    const canvas = this.generateCanvas(map, options, canvasFactory);

    if (canvas instanceof HTMLCanvasElement) {
      return canvas.toDataURL('image/png');
    }

    // OffscreenCanvas doesn't have toDataURL, need to convert via blob
    // This is sync fallback - for async use generateBlob
    throw new Error('OffscreenCanvas does not support sync toDataURL. Use generateBlob instead.');
  }

  /**
   * Generate preview as Blob (for upload/storage)
   */
  static async generateBlob(
    map: MapData,
    options: Partial<PreviewOptions> = {},
    canvasFactory?: CanvasFactory
  ): Promise<Blob> {
    const canvas = this.generateCanvas(map, options, canvasFactory);

    if (canvas instanceof OffscreenCanvas) {
      return canvas.convertToBlob({ type: 'image/png' });
    }

    return new Promise((resolve, reject) => {
      (canvas as HTMLCanvasElement).toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('Failed to create blob'))),
        'image/png'
      );
    });
  }

  /**
   * Main render function
   */
  private static render(
    ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
    map: MapData,
    opts: PreviewOptions
  ): void {
    const { width, height, padding, backgroundColor } = opts;

    // Clear background
    ctx.fillStyle = this.colorToCSS(backgroundColor);
    ctx.fillRect(0, 0, width, height);

    // Get map bounds
    const bounds = map.getBoundingBox();
    if (!bounds || !isFinite(bounds.minX)) {
      // Empty map
      return;
    }

    // Calculate transform (map coords -> canvas coords)
    const transform = this.calculateTransform(bounds, width, height, padding);

    // Render layers in order
    if (opts.layers.sectors && opts.colors.sectorFill) {
      this.renderSectors(ctx, map, transform, opts);
    }

    if (opts.layers.linedefs) {
      this.renderLinedefs(ctx, map, transform, opts);
    }

    if (opts.layers.vertices) {
      this.renderVertices(ctx, map, transform, opts);
    }

    if (opts.layers.things || opts.layers.playerStartsOnly) {
      this.renderThings(ctx, map, transform, opts);
    }
  }

  /**
   * Calculate transform from map coordinates to canvas coordinates
   */
  private static calculateTransform(
    bounds: { minX: number; minY: number; maxX: number; maxY: number },
    canvasWidth: number,
    canvasHeight: number,
    padding: number
  ): MapTransform {
    const mapWidth = bounds.maxX - bounds.minX;
    const mapHeight = bounds.maxY - bounds.minY;

    // Handle edge case of single point or line
    const safeMapWidth = Math.max(mapWidth, 1);
    const safeMapHeight = Math.max(mapHeight, 1);

    const availableWidth = canvasWidth - padding * 2;
    const availableHeight = canvasHeight - padding * 2;

    // Scale to fit, maintaining aspect ratio
    const scaleX = availableWidth / safeMapWidth;
    const scaleY = availableHeight / safeMapHeight;
    const scale = Math.min(scaleX, scaleY);

    // Center the map
    const offsetX = padding + (availableWidth - safeMapWidth * scale) / 2;
    const offsetY = padding + (availableHeight - safeMapHeight * scale) / 2;

    return {
      scale,
      offsetX,
      offsetY,
      minX: bounds.minX,
      minY: bounds.minY,
      maxY: bounds.maxY,
    };
  }

  /**
   * Transform map coordinate to canvas coordinate
   */
  private static mapToCanvas(
    x: number,
    y: number,
    transform: MapTransform
  ): { x: number; y: number } {
    return {
      x: transform.offsetX + (x - transform.minX) * transform.scale,
      // Flip Y axis (map Y increases up, canvas Y increases down)
      y: transform.offsetY + (transform.maxY - y) * transform.scale,
    };
  }

  /**
   * Render linedefs
   */
  private static renderLinedefs(
    ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
    map: MapData,
    transform: MapTransform,
    opts: PreviewOptions
  ): void {
    const baseWidth = Math.max(1, opts.lineScale * transform.scale * 0.5);

    ctx.lineCap = 'round';
    ctx.lineWidth = baseWidth;

    for (const linedef of map.linedefs.values()) {
      const v1 = map.vertices.get(linedef.v1);
      const v2 = map.vertices.get(linedef.v2);
      if (!v1 || !v2) continue;

      const p1 = this.mapToCanvas(v1.x, v1.y, transform);
      const p2 = this.mapToCanvas(v2.x, v2.y, transform);

      // Determine line color based on properties
      const color = this.getLinedefColor(linedef, opts.colors);

      ctx.strokeStyle = this.colorToCSS(color);
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
    }
  }

  /**
   * Determine linedef color based on its properties
   */
  private static getLinedefColor(
    linedef: {
      flags: number;
      special: number;
      backSidedef: number | null;
    },
    colors: PreviewColorScheme
  ): number {
    // Secret lines
    if (linedef.flags & LinedefFlags.SECRET) {
      return colors.secret;
    }

    // Lines with action specials
    if (linedef.special !== 0) {
      return colors.actionSpecial;
    }

    // One-sided (solid wall)
    if (linedef.backSidedef === null) {
      return colors.oneSided;
    }

    // Two-sided (passable)
    return colors.twoSided;
  }

  /**
   * Render sector floor fills
   */
  private static renderSectors(
    ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
    map: MapData,
    transform: MapTransform,
    opts: PreviewOptions
  ): void {
    if (!opts.colors.sectorFill) return;

    ctx.fillStyle = this.colorToCSS(opts.colors.sectorFill);

    for (const sector of map.sectors.values()) {
      if (!sector.triangles || sector.triangles.length === 0) continue;

      // Draw triangulated sector
      for (let i = 0; i < sector.triangles.length; i += 3) {
        const v0 = map.vertices.get(sector.triangles[i]);
        const v1 = map.vertices.get(sector.triangles[i + 1]);
        const v2 = map.vertices.get(sector.triangles[i + 2]);

        if (!v0 || !v1 || !v2) continue;

        const p0 = this.mapToCanvas(v0.x, v0.y, transform);
        const p1 = this.mapToCanvas(v1.x, v1.y, transform);
        const p2 = this.mapToCanvas(v2.x, v2.y, transform);

        ctx.beginPath();
        ctx.moveTo(p0.x, p0.y);
        ctx.lineTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.closePath();
        ctx.fill();
      }
    }
  }

  /**
   * Render vertices as dots
   */
  private static renderVertices(
    ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
    map: MapData,
    transform: MapTransform,
    opts: PreviewOptions
  ): void {
    const radius = Math.max(1.5, transform.scale * 2);
    ctx.fillStyle = this.colorToCSS(opts.colors.oneSided);

    for (const vertex of map.vertices.values()) {
      const p = this.mapToCanvas(vertex.x, vertex.y, transform);

      ctx.beginPath();
      ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  /**
   * Render things (player starts, monsters, items)
   */
  private static renderThings(
    ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
    map: MapData,
    transform: MapTransform,
    opts: PreviewOptions
  ): void {
    const radius = Math.max(3, transform.scale * 16);

    for (const thing of map.things.values()) {
      // Filter by thing type
      const category = this.categorizeThingType(thing.type);

      if (opts.layers.playerStartsOnly && category !== 'player') {
        continue;
      }

      const color = this.getThingColor(category, opts.colors);
      const p = this.mapToCanvas(thing.x, thing.y, transform);

      ctx.fillStyle = this.colorToCSS(color);

      if (category === 'player') {
        // Draw arrow for player start (shows facing direction)
        this.drawPlayerArrow(ctx, p.x, p.y, thing.angle, radius);
      } else {
        // Draw circle for other things
        ctx.beginPath();
        ctx.arc(p.x, p.y, radius * 0.6, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  /**
   * Draw arrow indicating player start direction
   */
  private static drawPlayerArrow(
    ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
    x: number,
    y: number,
    angle: number,
    size: number
  ): void {
    const rad = (angle * Math.PI) / 180;

    // Arrow points in facing direction
    const tipX = x + Math.cos(rad) * size;
    const tipY = y - Math.sin(rad) * size; // Canvas Y is flipped

    // Base points
    const baseAngle1 = rad + Math.PI * 0.8;
    const baseAngle2 = rad - Math.PI * 0.8;
    const baseLen = size * 0.7;

    const base1X = x + Math.cos(baseAngle1) * baseLen;
    const base1Y = y - Math.sin(baseAngle1) * baseLen;
    const base2X = x + Math.cos(baseAngle2) * baseLen;
    const base2Y = y - Math.sin(baseAngle2) * baseLen;

    ctx.beginPath();
    ctx.moveTo(tipX, tipY);
    ctx.lineTo(base1X, base1Y);
    ctx.lineTo(x, y);
    ctx.lineTo(base2X, base2Y);
    ctx.closePath();
    ctx.fill();
  }

  /**
   * Categorize thing type into player/monster/item
   */
  private static categorizeThingType(
    type: number
  ): 'player' | 'monster' | 'item' | 'other' {
    // Player starts (Doom/Hexen)
    if (type >= 1 && type <= 4) return 'player';
    if (type === 11) return 'player'; // Deathmatch start

    // Common monsters (Doom)
    const monsters = [3004, 9, 3001, 3002, 58, 3006, 3005, 69, 3003, 68, 71, 66, 67, 64, 65, 7, 16];
    if (monsters.includes(type)) {
      return 'monster';
    }

    // Common items (Doom)
    const items = [
      2011, 2012, 2013, 2014, 2015, 2018, 2019, 8,
      2002, 2003, 2001, 2006, 2005, 2004, 17,
      2007, 2008, 2022, 2023, 2024, 2025, 2026, 83,
    ];
    if (items.includes(type)) {
      return 'item';
    }

    return 'other';
  }

  /**
   * Get color for thing based on category
   */
  private static getThingColor(
    category: 'player' | 'monster' | 'item' | 'other',
    colors: PreviewColorScheme
  ): number {
    switch (category) {
      case 'player':
        return colors.playerStart;
      case 'monster':
        return colors.monsters;
      case 'item':
        return colors.items;
      default:
        return colors.twoSided;
    }
  }

  /**
   * Convert hex color to CSS string
   */
  private static colorToCSS(color: number): string {
    return `#${color.toString(16).padStart(6, '0')}`;
  }
}
