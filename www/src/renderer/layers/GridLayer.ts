import * as PIXI from 'pixi.js';
import { Camera } from '../Camera';

export class GridLayer {
  container: PIXI.Container;
  private graphics: PIXI.Graphics;

  private readonly majorColor = 0x2a2a4a;
  private readonly minorColor = 0x1f1f3a;

  constructor() {
    this.container = new PIXI.Container();
    this.graphics = new PIXI.Graphics();
    this.container.addChild(this.graphics);
  }

  render(camera: Camera, gridSize: number, showGrid: boolean): void {
    this.graphics.clear();

    if (!showGrid) return;

    const bounds = camera.getVisibleBounds();
    const baseWidth = 1 / camera.zoom;

    // Determine grid spacing based on zoom
    let spacing = gridSize;
    while (spacing * camera.zoom < 8) {
      spacing *= 2;
    }
    while (spacing * camera.zoom > 64) {
      spacing /= 2;
    }

    const majorSpacing = spacing * 8;

    // Calculate grid bounds
    const startX = Math.floor(bounds.minX / spacing) * spacing;
    const endX = Math.ceil(bounds.maxX / spacing) * spacing;
    const startY = Math.floor(bounds.minY / spacing) * spacing;
    const endY = Math.ceil(bounds.maxY / spacing) * spacing;

    // Draw minor grid lines
    this.graphics.setStrokeStyle({ width: baseWidth, color: this.minorColor });
    for (let x = startX; x <= endX; x += spacing) {
      if (x % majorSpacing !== 0) {
        this.graphics.moveTo(x, bounds.minY);
        this.graphics.lineTo(x, bounds.maxY);
      }
    }
    for (let y = startY; y <= endY; y += spacing) {
      if (y % majorSpacing !== 0) {
        this.graphics.moveTo(bounds.minX, y);
        this.graphics.lineTo(bounds.maxX, y);
      }
    }
    this.graphics.stroke();

    // Draw major grid lines
    this.graphics.setStrokeStyle({ width: baseWidth * 1.5, color: this.majorColor });
    for (let x = startX; x <= endX; x += majorSpacing) {
      this.graphics.moveTo(x, bounds.minY);
      this.graphics.lineTo(x, bounds.maxY);
    }
    for (let y = startY; y <= endY; y += majorSpacing) {
      this.graphics.moveTo(bounds.minX, y);
      this.graphics.lineTo(bounds.maxX, y);
    }
    this.graphics.stroke();

    // Draw origin axes
    this.graphics.setStrokeStyle({ width: baseWidth * 2, color: 0x4a4a6a });
    this.graphics.moveTo(0, bounds.minY);
    this.graphics.lineTo(0, bounds.maxY);
    this.graphics.moveTo(bounds.minX, 0);
    this.graphics.lineTo(bounds.maxX, 0);
    this.graphics.stroke();
  }
}
