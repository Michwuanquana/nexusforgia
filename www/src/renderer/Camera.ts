export class Camera {
  x: number = 0;
  y: number = 0;
  zoom: number = 1;

  readonly minZoom = 0.05;
  readonly maxZoom = 32;

  private screenWidth: number;
  private screenHeight: number;

  constructor(screenWidth: number, screenHeight: number) {
    this.screenWidth = screenWidth;
    this.screenHeight = screenHeight;
  }

  setScreenSize(width: number, height: number): void {
    this.screenWidth = width;
    this.screenHeight = height;
  }

  pan(dx: number, dy: number): void {
    this.x += dx / this.zoom;
    this.y -= dy / this.zoom;
  }

  zoomAt(factor: number, screenX: number, screenY: number): void {
    const worldBefore = this.screenToWorld(screenX, screenY);

    this.zoom = Math.max(this.minZoom, Math.min(this.maxZoom, this.zoom * factor));

    const worldAfter = this.screenToWorld(screenX, screenY);

    this.x += worldBefore.x - worldAfter.x;
    this.y += worldBefore.y - worldAfter.y;
  }

  screenToWorld(screenX: number, screenY: number): { x: number; y: number } {
    return {
      x: this.x + (screenX - this.screenWidth / 2) / this.zoom,
      y: this.y - (screenY - this.screenHeight / 2) / this.zoom,
    };
  }

  worldToScreen(worldX: number, worldY: number): { x: number; y: number } {
    return {
      x: this.screenWidth / 2 + (worldX - this.x) * this.zoom,
      y: this.screenHeight / 2 - (worldY - this.y) * this.zoom,
    };
  }

  getVisibleBounds(): {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
  } {
    const halfW = this.screenWidth / 2 / this.zoom;
    const halfH = this.screenHeight / 2 / this.zoom;
    return {
      minX: this.x - halfW,
      maxX: this.x + halfW,
      minY: this.y - halfH,
      maxY: this.y + halfH,
    };
  }

  fitToBounds(
    bounds: { minX: number; minY: number; maxX: number; maxY: number },
    padding = 50
  ): void {
    const boundsWidth = bounds.maxX - bounds.minX;
    const boundsHeight = bounds.maxY - bounds.minY;

    this.x = (bounds.minX + bounds.maxX) / 2;
    this.y = (bounds.minY + bounds.maxY) / 2;

    const zoomX = (this.screenWidth - padding * 2) / boundsWidth;
    const zoomY = (this.screenHeight - padding * 2) / boundsHeight;

    this.zoom = Math.max(this.minZoom, Math.min(this.maxZoom, Math.min(zoomX, zoomY)));
  }
}
