// src/core/preview/PreviewCache.ts

import { MapData } from '../map/MapData';
import { MapPreviewGenerator } from './MapPreviewGenerator';
import { PreviewOptions } from './types';

interface CachedPreview {
  dataUrl: string;
  timestamp: number;
  hash: string;
}

export class PreviewCache {
  private cache: Map<string, CachedPreview> = new Map();

  /**
   * Generate simple hash from map geometry
   */
  private computeHash(map: MapData): string {
    let hash = 0;

    // Hash vertex positions
    for (const v of map.vertices.values()) {
      hash = ((hash << 5) - hash + v.x) | 0;
      hash = ((hash << 5) - hash + v.y) | 0;
    }

    // Hash linedef connections
    for (const l of map.linedefs.values()) {
      hash = ((hash << 5) - hash + l.v1) | 0;
      hash = ((hash << 5) - hash + l.v2) | 0;
    }

    return hash.toString(16);
  }

  /**
   * Get or generate preview
   */
  getPreview(
    mapName: string,
    map: MapData,
    options?: Partial<PreviewOptions>
  ): string {
    const hash = this.computeHash(map);
    const cached = this.cache.get(mapName);

    if (cached && cached.hash === hash) {
      return cached.dataUrl;
    }

    // Need HTMLCanvasElement for toDataURL
    const canvas = MapPreviewGenerator.generateCanvas(map, options, (w, h) => {
      const c = document.createElement('canvas');
      c.width = w;
      c.height = h;
      return c;
    }) as HTMLCanvasElement;

    const dataUrl = canvas.toDataURL('image/png');

    this.cache.set(mapName, {
      dataUrl,
      timestamp: Date.now(),
      hash,
    });

    return dataUrl;
  }

  /**
   * Invalidate cache for map
   */
  invalidate(mapName: string): void {
    this.cache.delete(mapName);
  }

  /**
   * Clear entire cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache size (number of entries)
   */
  get size(): number {
    return this.cache.size;
  }
}

// Singleton instance for app-wide use
export const previewCache = new PreviewCache();
