import * as PIXI from 'pixi.js';
import { Camera } from '../Camera';

export interface SelectionBox {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

export interface DrawingLine {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

export class OverlayLayer {
  container: PIXI.Container;
  private graphics: PIXI.Graphics;

  constructor() {
    this.container = new PIXI.Container();
    this.graphics = new PIXI.Graphics();
    this.container.addChild(this.graphics);
  }

  render(
    camera: Camera,
    selectionBox?: SelectionBox | null,
    drawingLine?: DrawingLine | null
  ): void {
    this.graphics.clear();

    // Draw selection box
    if (selectionBox) {
      const minX = Math.min(selectionBox.startX, selectionBox.endX);
      const maxX = Math.max(selectionBox.startX, selectionBox.endX);
      const minY = Math.min(selectionBox.startY, selectionBox.endY);
      const maxY = Math.max(selectionBox.startY, selectionBox.endY);

      const width = maxX - minX;
      const height = maxY - minY;

      this.graphics.rect(minX, minY, width, height);
      this.graphics.fill({ color: 0x4488ff, alpha: 0.15 });
      this.graphics.stroke({
        width: 1 / camera.zoom,
        color: 0x4488ff,
        alpha: 0.8,
      });
    }

    // Draw line being drawn (rubber band)
    if (drawingLine) {
      // Dashed line preview
      this.graphics.moveTo(drawingLine.startX, drawingLine.startY);
      this.graphics.lineTo(drawingLine.endX, drawingLine.endY);
      this.graphics.stroke({
        width: 2 / camera.zoom,
        color: 0x00ff00,
        alpha: 0.8,
      });

      // Draw small circle at start point
      this.graphics.circle(drawingLine.startX, drawingLine.startY, 4 / camera.zoom);
      this.graphics.fill({ color: 0x00ff00 });

      // Draw small circle at end point (cursor)
      this.graphics.circle(drawingLine.endX, drawingLine.endY, 4 / camera.zoom);
      this.graphics.stroke({ width: 1 / camera.zoom, color: 0x00ff00 });
    }
  }

  clear(): void {
    this.graphics.clear();
  }
}
