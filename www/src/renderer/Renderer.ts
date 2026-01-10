import * as PIXI from 'pixi.js';
import { Camera } from './Camera';
import { GridLayer } from './layers/GridLayer';
import { SectorLayer } from './layers/SectorLayer';
import { LinedefLayer } from './layers/LinedefLayer';
import { VertexLayer } from './layers/VertexLayer';
import { ThingLayer } from './layers/ThingLayer';
import { OverlayLayer } from './layers/OverlayLayer';
import type { SelectionBox } from './layers/OverlayLayer';
import { MapData } from '../core/map/MapData';
import type { SectorViewMode } from '../store/editorStore';

export interface RenderOptions {
  showGrid: boolean;
  showVertices: boolean;
  showThings: boolean;
  sectorViewMode: SectorViewMode;
  gridSize: number;
  selectedVertices?: Set<number>;
  selectedLinedefs?: Set<number>;
  selectedSectors?: Set<number>;
  selectedThings?: Set<number>;
  highlightedVertex?: number | null;
  highlightedLinedef?: number | null;
  highlightedSector?: number | null;
  highlightedThing?: number | null;
  selectionBox?: SelectionBox | null;
  drawingLine?: { startX: number; startY: number; endX: number; endY: number } | null;
}

export class Renderer {
  app: PIXI.Application;
  camera: Camera;

  private gridLayer: GridLayer;
  private sectorLayer: SectorLayer;
  private linedefLayer: LinedefLayer;
  private vertexLayer: VertexLayer;
  private thingLayer: ThingLayer;
  private overlayLayer: OverlayLayer;

  private worldContainer: PIXI.Container;
  private initialized = false;
  private renderCallback: (() => void) | null = null;

  constructor() {
    this.app = new PIXI.Application();
    this.camera = new Camera(800, 600);

    this.gridLayer = new GridLayer();
    this.sectorLayer = new SectorLayer();
    this.linedefLayer = new LinedefLayer();
    this.vertexLayer = new VertexLayer();
    this.thingLayer = new ThingLayer();
    this.overlayLayer = new OverlayLayer();

    this.worldContainer = new PIXI.Container();
  }

  async init(canvas: HTMLCanvasElement): Promise<void> {
    if (this.initialized) return;

    await this.app.init({
      canvas,
      resizeTo: canvas.parentElement!,
      antialias: true,
      backgroundColor: 0x1a1a2e,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
    });

    this.camera.setScreenSize(this.app.screen.width, this.app.screen.height);

    this.app.stage.addChild(this.worldContainer);

    // Add layers in render order (back to front)
    this.worldContainer.addChild(this.gridLayer.container);
    this.worldContainer.addChild(this.sectorLayer.container);
    this.worldContainer.addChild(this.linedefLayer.container);
    this.worldContainer.addChild(this.vertexLayer.container);
    this.worldContainer.addChild(this.thingLayer.container);
    this.worldContainer.addChild(this.overlayLayer.container);

    // Set up texture loading callback to trigger re-render
    this.sectorLayer.setTextureLoadedCallback(() => {
      this.requestRender();
    });

    this.initialized = true;
  }

  resize(): void {
    if (!this.initialized) return;
    this.camera.setScreenSize(this.app.screen.width, this.app.screen.height);
    this.updateCamera();
  }

  updateCamera(): void {
    if (!this.initialized) return;

    this.worldContainer.position.set(
      this.app.screen.width / 2 - this.camera.x * this.camera.zoom,
      this.app.screen.height / 2 + this.camera.y * this.camera.zoom
    );
    this.worldContainer.scale.set(this.camera.zoom, -this.camera.zoom);
  }

  render(map: MapData, options: RenderOptions): void {
    if (!this.initialized) return;

    this.updateCamera();

    this.gridLayer.render(this.camera, options.gridSize, options.showGrid);
    this.sectorLayer.render(
      map,
      this.camera,
      options.sectorViewMode,
      options.selectedSectors,
      options.highlightedSector
    );
    this.linedefLayer.render(
      map,
      this.camera,
      options.selectedLinedefs,
      options.highlightedLinedef
    );
    this.vertexLayer.render(
      map,
      this.camera,
      options.showVertices,
      options.selectedVertices,
      options.highlightedVertex
    );
    this.thingLayer.render(
      map,
      this.camera,
      options.showThings,
      options.selectedThings,
      options.highlightedThing
    );
    this.overlayLayer.render(this.camera, options.selectionBox, options.drawingLine);

    // Force PIXI to re-render the canvas
    this.app.render();
  }

  screenToWorld(screenX: number, screenY: number): { x: number; y: number } {
    return this.camera.screenToWorld(screenX, screenY);
  }

  worldToScreen(worldX: number, worldY: number): { x: number; y: number } {
    return this.camera.worldToScreen(worldX, worldY);
  }

  fitToMap(map: MapData): void {
    const bounds = map.getBoundingBox();
    this.camera.fitToBounds(bounds);
    this.updateCamera();
  }

  setRenderCallback(callback: () => void): void {
    this.renderCallback = callback;
  }

  requestRender(): void {
    if (this.renderCallback) {
      this.renderCallback();
    }
    // Force PIXI to re-render
    this.app.render();
  }

  getCamera(): { x: number; y: number; zoom: number } {
    return {
      x: this.camera.x,
      y: this.camera.y,
      zoom: this.camera.zoom,
    };
  }

  setCamera(x: number, y: number, zoom: number): void {
    this.camera.x = x;
    this.camera.y = y;
    this.camera.zoom = zoom;
    this.updateCamera();
    this.requestRender();
  }

  destroy(): void {
    this.app.destroy(true);
    this.initialized = false;
  }

  /**
   * Clear cached geometry data (call when map geometry changes)
   */
  invalidateSectorCache(): void {
    this.sectorLayer.clearCache();
  }

  /**
   * Clear cached texture data (call when WAD changes)
   */
  invalidateTextureCache(): void {
    this.sectorLayer.clearTextureCache();
  }
}
