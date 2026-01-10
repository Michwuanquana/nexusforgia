import * as PIXI from 'pixi.js';
import { MapData } from '../../core/map/MapData';
import { Camera } from '../Camera';

export class VertexLayer {
  container: PIXI.Container;
  private graphics: PIXI.Graphics;

  private readonly colors = {
    normal: 0x00ff00,
    selected: 0xff8800,
    highlighted: 0x00ffff,
  };

  constructor() {
    this.container = new PIXI.Container();
    this.graphics = new PIXI.Graphics();
    this.container.addChild(this.graphics);
  }

  render(
    map: MapData,
    camera: Camera,
    showVertices: boolean,
    selectedIds?: Set<number>,
    highlightedId?: number | null
  ): void {
    this.graphics.clear();

    if (!showVertices) return;

    const baseSize = Math.max(2, 4 / camera.zoom);

    for (const [id, vertex] of map.vertices) {
      const isSelected = selectedIds?.has(id) ?? false;
      const isHighlighted = highlightedId === id;

      let color = this.colors.normal;
      let size = baseSize;

      if (isSelected) {
        color = this.colors.selected;
        size = baseSize * 1.5;
      }
      if (isHighlighted) {
        color = this.colors.highlighted;
        size = baseSize * 2;
      }

      this.graphics.rect(
        vertex.x - size / 2,
        vertex.y - size / 2,
        size,
        size
      );
      this.graphics.fill({ color });
    }
  }
}
