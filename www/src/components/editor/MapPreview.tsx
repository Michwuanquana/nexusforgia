// src/components/editor/MapPreview.tsx

import { useEffect, useRef, memo, useMemo } from 'react';
import { MapData } from '../../core/map/MapData';
import { MapPreviewGenerator } from '../../core/preview/MapPreviewGenerator';
import { PreviewOptions, DEFAULT_PREVIEW_OPTIONS } from '../../core/preview/types';

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
  className = '',
}: MapPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Memoize merged options
  const mergedOptions = useMemo(
    () => ({
      ...DEFAULT_PREVIEW_OPTIONS,
      width,
      height,
      ...options,
    }),
    [width, height, options]
  );

  useEffect(() => {
    if (!canvasRef.current) return;

    // Generate preview using our own canvas to avoid OffscreenCanvas issues
    const sourceCanvas = MapPreviewGenerator.generateCanvas(map, mergedOptions, (w, h) => {
      const c = document.createElement('canvas');
      c.width = w;
      c.height = h;
      return c;
    });

    // Copy to our canvas
    const ctx = canvasRef.current.getContext('2d');
    if (ctx) {
      canvasRef.current.width = width;
      canvasRef.current.height = height;
      ctx.drawImage(sourceCanvas as HTMLCanvasElement, 0, 0);
    }
  }, [map, width, height, mergedOptions]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      width={width}
      height={height}
      style={{ imageRendering: 'pixelated' }}
    />
  );
});
