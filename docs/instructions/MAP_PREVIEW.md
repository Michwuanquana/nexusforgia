# Map Preview Generation

## Overview

Map preview (automap-style thumbnail) is generated from map geometry data. It's used in:
- Map list in WAD browser
- Map selection dialog
- Session thumbnails
- Export previews

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     MapPreviewGenerator                      │
├─────────────────────────────────────────────────────────────┤
│  Input:                                                      │
│  ├── MapData (vertices, linedefs, things)                   │
│  ├── PreviewOptions (size, colors, layers)                  │
│  └── Output format (canvas | dataURL | blob)                │
│                                                              │
│  Output:                                                     │
│  ├── HTMLCanvasElement                                      │
│  ├── data:image/png;base64,...                              │
│  └── Blob (for storage/upload)                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Implementation

### Core Types

```typescript
// src/core/preview/types.ts

export interface PreviewOptions {
  /** Output dimensions in pixels */
  width: number;
  height: number;

  /** Padding around map bounds (in pixels) */
  padding: number;

  /** Background color (hex) */
  backgroundColor: number;

  /** Color scheme for map elements */
  colors: PreviewColorScheme;

  /** Which layers to render */
  layers: PreviewLayers;

  /** Line width multiplier (1.0 = default) */
  lineScale: number;

  /** Anti-aliasing */
  antialias: boolean;
}

export interface PreviewColorScheme {
  /** One-sided walls (solid) */
  oneSided: number;

  /** Two-sided walls (passable) */
  twoSided: number;

  /** Lines with action specials */
  actionSpecial: number;

  /** Secret walls */
  secret: number;

  /** Player start positions */
  playerStart: number;

  /** Monster things */
  monsters: number;

  /** Item pickups */
  items: number;

  /** Sector floor fill (optional) */
  sectorFill?: number;
}

export interface PreviewLayers {
  /** Render sector fills */
  sectors: boolean;

  /** Render linedefs */
  linedefs: boolean;

  /** Render vertices */
  vertices: boolean;

  /** Render things */
  things: boolean;

  /** Render player starts only */
  playerStartsOnly: boolean;
}

export const DEFAULT_PREVIEW_OPTIONS: PreviewOptions = {
  width: 256,
  height: 256,
  padding: 10,
  backgroundColor: 0x000000,
  colors: {
    oneSided: 0xffffff,
    twoSided: 0x808080,
    actionSpecial: 0xffff00,
    secret: 0xff00ff,
    playerStart: 0x00ff00,
    monsters: 0xff0000,
    items: 0x00ffff,
  },
  layers: {
    sectors: false,
    linedefs: true,
    vertices: false,
    things: false,
    playerStartsOnly: true,
  },
  lineScale: 1.0,
  antialias: true,
};

/** Classic Doom automap colors */
export const DOOM_AUTOMAP_COLORS: PreviewColorScheme = {
  oneSided: 0xfc0000,    // Red - solid walls
  twoSided: 0xfcfc00,    // Yellow - doors/passable
  actionSpecial: 0xfcfc00,
  secret: 0xfc0000,
  playerStart: 0x00fc00, // Green
  monsters: 0xfc0000,
  items: 0x00fcfc,
};

/** Modern editor style */
export const EDITOR_COLORS: PreviewColorScheme = {
  oneSided: 0xffffff,
  twoSided: 0x808080,
  actionSpecial: 0xffff00,
  secret: 0xff00ff,
  playerStart: 0x00ff00,
  monsters: 0xff4444,
  items: 0x44ffff,
  sectorFill: 0x1a1a2e,
};
```

### Generator Class

```typescript
// src/core/preview/MapPreviewGenerator.ts

import { MapData } from '../map/MapData';
import {
  PreviewOptions,
  DEFAULT_PREVIEW_OPTIONS,
  PreviewColorScheme
} from './types';
import { LinedefFlags } from '../map/types';

export class MapPreviewGenerator {
  /**
   * Generate preview as Canvas element
   */
  static generateCanvas(
    map: MapData,
    options: Partial<PreviewOptions> = {},
    canvasFactory?: (width: number, height: number) => any
  ): any {
    const opts = { ...DEFAULT_PREVIEW_OPTIONS, ...options };

    let canvas;
    if (canvasFactory) {
      canvas = canvasFactory(opts.width, opts.height);
    } else if (typeof OffscreenCanvas !== 'undefined') {
      canvas = new OffscreenCanvas(opts.width, opts.height);
    } else if (typeof document !== 'undefined') {
      canvas = document.createElement('canvas');
    } else {
      throw new Error('Environment does not support Canvas creation');
    }

    // Set dimensions if not set by factory
    if (canvas.width !== opts.width) canvas.width = opts.width;
    if (canvas.height !== opts.height) canvas.height = opts.height;

    const ctx = canvas.getContext('2d', {
      alpha: false,
      willReadFrequently: false
    })!;

    // Enable anti-aliasing
    if (opts.antialias && ctx.imageSmoothingEnabled !== undefined) {
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
    canvasFactory?: (width: number, height: number) => any
  ): string {
    const canvas = this.generateCanvas(map, options, canvasFactory);
    return canvas.toDataURL('image/png');
  }

  /**
   * Generate preview as Blob (for upload/storage)
   */
  static async generateBlob(
    map: MapData,
    options: Partial<PreviewOptions> = {},
    canvasFactory?: (width: number, height: number) => any
  ): Promise<Blob> {
    const canvas = this.generateCanvas(map, options, canvasFactory);

    if (typeof canvas.convertToBlob === 'function') {
      return canvas.convertToBlob({ type: 'image/png' });
    }

    return new Promise((resolve, reject) => {
      if (typeof canvas.toBlob === 'function') {
        canvas.toBlob(
          (blob: any) => blob ? resolve(blob) : reject(new Error('Failed to create blob')),
          'image/png'
        );
      } else {
        reject(new Error('Canvas implementation does not support Blob export'));
      }
    });
  }

  /**
   * Main render function
   */
  private static render(
    ctx: CanvasRenderingContext2D,
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
      maxY: bounds.maxY, // For Y-flip
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
    ctx: CanvasRenderingContext2D,
    map: MapData,
    transform: MapTransform,
    opts: PreviewOptions
  ): void {
    const baseWidth = Math.max(1, opts.lineScale * transform.scale * 0.5);

    for (const linedef of map.linedefs.values()) {
      const v1 = map.vertices.get(linedef.v1);
      const v2 = map.vertices.get(linedef.v2);
      if (!v1 || !v2) continue;

      const p1 = this.mapToCanvas(v1.x, v1.y, transform);
      const p2 = this.mapToCanvas(v2.x, v2.y, transform);

      // Determine line color based on properties
      const color = this.getLinedefColor(linedef, opts.colors);

      ctx.strokeStyle = this.colorToCSS(color);
      ctx.lineWidth = baseWidth;
      ctx.lineCap = 'round';

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
      backSidedef: number | null
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
    ctx: CanvasRenderingContext2D,
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
    ctx: CanvasRenderingContext2D,
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
    ctx: CanvasRenderingContext2D,
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
      ctx.beginPath();

      if (category === 'player') {
        // Draw arrow for player start (shows facing direction)
        this.drawPlayerArrow(ctx, p.x, p.y, thing.angle, radius);
      } else {
        // Draw circle for other things
        ctx.arc(p.x, p.y, radius * 0.6, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  /**
   * Draw arrow indicating player start direction
   */
  private static drawPlayerArrow(
    ctx: CanvasRenderingContext2D,
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
    if ([3004, 9, 3001, 3002, 58, 3006, 3005, 69, 3003, 68, 71, 66, 67, 64, 65, 7, 16].includes(type)) {
      return 'monster';
    }

    // Common items (Doom)
    if ([2011, 2012, 2013, 2014, 2015, 2018, 2019, 8, 2002, 2003, 2001, 2006, 2005, 2004, 17, 2007, 2008, 2022, 2023, 2024, 2025, 2026, 83].includes(type)) {
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
      case 'player': return colors.playerStart;
      case 'monster': return colors.monsters;
      case 'item': return colors.items;
      default: return colors.twoSided;
    }
  }

  /**
   * Convert hex color to CSS string
   */
  private static colorToCSS(color: number): string {
    return `#${color.toString(16).padStart(6, '0')}`;
  }
}

interface MapTransform {
  scale: number;
  offsetX: number;
  offsetY: number;
  minX: number;
  minY: number;
  maxY: number;
}
```

---

## Usage Examples

### Basic Preview

```typescript
import { MapPreviewGenerator } from './core/preview/MapPreviewGenerator';
import { MapData } from './core/map/MapData';

// Generate 256x256 preview
const canvas = MapPreviewGenerator.generateCanvas(map, {
  width: 256,
  height: 256
});

document.body.appendChild(canvas);
```

### Doom-Style Automap

```typescript
import { DOOM_AUTOMAP_COLORS } from './core/preview/types';

const canvas = MapPreviewGenerator.generateCanvas(map, {
  width: 320,
  height: 200,
  backgroundColor: 0x000000,
  colors: DOOM_AUTOMAP_COLORS,
  layers: {
    sectors: false,
    linedefs: true,
    vertices: false,
    things: false,
    playerStartsOnly: false,
  }
});
```

### Full Preview with Things

```typescript
import { EDITOR_COLORS } from './core/preview/types';

const canvas = MapPreviewGenerator.generateCanvas(map, {
  width: 512,
  height: 512,
  backgroundColor: 0x1a1a2e,
  colors: EDITOR_COLORS,
  layers: {
    sectors: true,
    linedefs: true,
    vertices: false,
    things: true,
    playerStartsOnly: false,
  }
});
```

### Save as Blob for Upload

```typescript
const blob = await MapPreviewGenerator.generateBlob(map, {
  width: 256,
  height: 256
});

// Upload to server
const formData = new FormData();
formData.append('preview', blob, 'map-preview.png');
await fetch('/api/upload-preview', { method: 'POST', body: formData });
```

### Data URL for localStorage/IndexedDB

```typescript
const dataUrl = MapPreviewGenerator.generateDataURL(map);

// Store in IndexedDB
await db.put('mapPreviews', {
  mapName: 'MAP01',
  preview: dataUrl,
  timestamp: Date.now()
});

// Display in <img> tag
const img = document.createElement('img');
img.src = dataUrl;
```

### Server-Side (Node.js/Docker)

Using `node-canvas` or similar library:

```typescript
import { createCanvas } from 'canvas';
import { MapPreviewGenerator } from './core/preview/MapPreviewGenerator';

const canvas = MapPreviewGenerator.generateCanvas(map, {
  width: 800,
  height: 600
}, (w, h) => createCanvas(w, h));

const buffer = canvas.toBuffer('image/png');
// Save buffer to file or send to client
```

---

## React Component

```tsx
// src/components/editor/MapPreview.tsx

import { useEffect, useRef, memo } from 'react';
import { MapData } from '../../core/map/MapData';
import { MapPreviewGenerator } from '../../core/preview/MapPreviewGenerator';
import { PreviewOptions } from '../../core/preview/types';

interface MapPreviewProps {
  map: MapData;
  width?: number;
  height?: number;
  options?: Partial<PreviewOptions>;
  className?: string;
}

export const MapPreview = memo(function MapPreview({
  map,
  width = 256,
  height = 256,
  options = {},
  className = ''
}: MapPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = MapPreviewGenerator.generateCanvas(map, {
      width,
      height,
      ...options
    });

    // Copy to our canvas
    const ctx = canvasRef.current.getContext('2d');
    if (ctx) {
      canvasRef.current.width = width;
      canvasRef.current.height = height;
      ctx.drawImage(canvas, 0, 0);
    }
  }, [map, width, height, options]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ imageRendering: 'pixelated' }}
    />
  );
});
```

### Usage in Map List

```tsx
// src/components/dialogs/MapListDialog.tsx

import { MapPreview } from '../editor/MapPreview';

function MapListItem({ mapName, mapData, onSelect }) {
  return (
    <div
      className="flex items-center gap-4 p-2 hover:bg-gray-700 cursor-pointer"
      onClick={() => onSelect(mapName)}
    >
      <MapPreview
        map={mapData}
        width={64}
        height={64}
        options={{ padding: 4 }}
        className="border border-gray-600"
      />
      <div>
        <div className="font-bold">{mapName}</div>
        <div className="text-sm text-gray-400">
          {mapData.linedefs.size} lines, {mapData.sectors.size} sectors
        </div>
      </div>
    </div>
  );
}
```

---

## Caching Strategy

```typescript
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

    const dataUrl = MapPreviewGenerator.generateDataURL(map, options);

    this.cache.set(mapName, {
      dataUrl,
      timestamp: Date.now(),
      hash
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
}
```

---

## OffscreenCanvas (Web Worker)

For large maps, generate previews in a Web Worker:

```typescript
// src/workers/previewWorker.ts

import { MapData } from '../core/map/MapData';
import { PreviewOptions } from '../core/preview/types';

self.onmessage = async (e: MessageEvent) => {
  const { mapData, options } = e.data as {
    mapData: SerializedMapData;
    options: PreviewOptions;
  };

  // Reconstruct MapData from serialized form
  const map = MapData.deserialize(mapData);

  // Use OffscreenCanvas
  const canvas = new OffscreenCanvas(options.width, options.height);
  const ctx = canvas.getContext('2d')!;

  // ... render logic (same as MapPreviewGenerator.render)

  const blob = await canvas.convertToBlob({ type: 'image/png' });
  const arrayBuffer = await blob.arrayBuffer();

  self.postMessage({ arrayBuffer }, [arrayBuffer]);
};
```

---

## Performance Considerations

| Map Size | Vertices | Generation Time (256px) |
|----------|----------|------------------------|
| Small    | <500     | <5ms                   |
| Medium   | 500-2000 | 5-15ms                 |
| Large    | 2000-5000| 15-50ms                |
| Huge     | >5000    | 50-200ms (use worker)  |

**Optimizations:**
1. Skip vertices that fall outside visible bounds
2. Use `OffscreenCanvas` for background generation
3. Cache generated previews with geometry hash
4. Use lower resolution for list thumbnails (64x64)
5. Generate high-res preview only on hover/selection

---

## File Structure

```
src/core/preview/
├── types.ts              # PreviewOptions, color schemes
├── MapPreviewGenerator.ts # Main generator class
└── PreviewCache.ts       # Caching logic

src/components/editor/
└── MapPreview.tsx        # React component

src/workers/
└── previewWorker.ts      # Optional Web Worker
```

---

*Document created: 2026-01-10*
