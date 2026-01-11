import * as PIXI from 'pixi.js';
import { MapData } from '../../core/map/MapData';
import { Camera } from '../Camera';
import { getThingType } from '../../data/thingTypes';

export class ThingLayer {
  container: PIXI.Container;
  private graphics: PIXI.Graphics;

  private readonly colors = {
    player: 0x00ff00,
    monster: 0xff0000,
    item: 0x00ffff,
    decoration: 0x888888,
    selected: 0xff8800,
    highlighted: 0xffff00,
  };

  constructor() {
    this.container = new PIXI.Container();
    this.graphics = new PIXI.Graphics();
    this.container.addChild(this.graphics);
  }

  render(
    map: MapData,
    camera: Camera,
    showThings: boolean,
    selectedIds?: Set<number>,
    highlightedId?: number | null
  ): void {
    this.graphics.clear();

    if (!showThings) return;

    for (const [id, thing] of map.things) {
      const isSelected = selectedIds?.has(id) ?? false;
      const isHighlighted = highlightedId === id;

      // Get thing type info for proper size
      const thingType = getThingType(thing.type);
      const thingWidth = thingType?.width ?? 16;

      // Use actual thing width as radius (width is diameter, so /2 for radius)
      // Things scale naturally with the map (no inverse zoom scaling)
      let radius = thingWidth / 2;

      let color = this.getThingColor(thing.type);

      if (isSelected) {
        color = this.colors.selected;
        radius *= 1.2;
      }
      if (isHighlighted) {
        color = this.colors.highlighted;
        radius *= 1.4;
      }

      // Draw thing circle
      this.graphics.circle(thing.x, thing.y, radius);
      this.graphics.fill({ color, alpha: 0.5 });
      this.graphics.stroke({ width: 1 / camera.zoom, color });

      // Draw direction arrow
      const angleRad = (thing.angle * Math.PI) / 180;
      const arrowLen = radius * 1.2;
      const arrowX = thing.x + Math.cos(angleRad) * arrowLen;
      const arrowY = thing.y + Math.sin(angleRad) * arrowLen;

      this.graphics.moveTo(thing.x, thing.y);
      this.graphics.lineTo(arrowX, arrowY);
      this.graphics.stroke({ width: 2 / camera.zoom, color });
    }
  }

  private getThingColor(type: number): number {
    // Player starts (1-4)
    if (type >= 1 && type <= 4) return this.colors.player;
    // Common monsters
    if (type >= 3001 && type <= 3006) return this.colors.monster;
    // Items/weapons
    if (type >= 2001 && type <= 2050) return this.colors.item;
    // Default
    return this.colors.decoration;
  }
}
