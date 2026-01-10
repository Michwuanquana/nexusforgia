import * as PIXI from 'pixi.js';
import { MapData } from '../../core/map/MapData';
import type { Linedef } from '../../core/map/types';
import { Camera } from '../Camera';

export class LinedefLayer {
  container: PIXI.Container;
  private graphics: PIXI.Graphics;

  private readonly colors = {
    oneSided: 0xffffff,
    twoSided: 0x808080,
    actionSpecial: 0xffff00,
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
    selectedIds?: Set<number>,
    highlightedId?: number | null
  ): void {
    this.graphics.clear();

    const baseWidth = Math.max(1, 2 / camera.zoom);

    for (const [id, linedef] of map.linedefs) {
      const v1 = map.vertices.get(linedef.v1);
      const v2 = map.vertices.get(linedef.v2);
      if (!v1 || !v2) continue;

      const isSelected = selectedIds?.has(id) ?? false;
      const isHighlighted = highlightedId === id;
      const color = this.getLineColor(linedef, isSelected, isHighlighted);
      let width = baseWidth;

      if (isSelected) width = baseWidth * 1.5;
      if (isHighlighted) width = baseWidth * 2;

      this.graphics.setStrokeStyle({ width, color });
      this.graphics.moveTo(v1.x, v1.y);
      this.graphics.lineTo(v2.x, v2.y);
      this.graphics.stroke();

      // Draw direction tick for all linedefs (shows front side)
      this.drawDirectionTick(v1, v2, color, baseWidth, linedef.backSidedef === null);
    }
  }

  private getLineColor(
    linedef: Linedef,
    selected: boolean,
    highlighted: boolean
  ): number {
    if (highlighted) return this.colors.highlighted;
    if (selected) return this.colors.selected;
    if (linedef.special !== 0) return this.colors.actionSpecial;
    if (linedef.backSidedef === null) return this.colors.oneSided;
    return this.colors.twoSided;
  }

  private drawDirectionTick(
    v1: { x: number; y: number },
    v2: { x: number; y: number },
    color: number,
    width: number,
    isOneSided: boolean
  ): void {
    const midX = (v1.x + v2.x) / 2;
    const midY = (v1.y + v2.y) / 2;

    const dx = v2.x - v1.x;
    const dy = v2.y - v1.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len === 0) return;

    // Perpendicular direction pointing to the front side
    // In Doom, the front side is on the RIGHT when looking from v1 to v2
    // For Y-up coordinate system: right perpendicular = (dy, -dx)
    const nx = dy / len;
    const ny = -dx / len;

    // Longer tick for one-sided, shorter for two-sided
    const tickLen = isOneSided ? 8 : 4;

    this.graphics.setStrokeStyle({ width, color });
    this.graphics.moveTo(midX, midY);
    this.graphics.lineTo(midX + nx * tickLen, midY + ny * tickLen);
    this.graphics.stroke();
  }
}
