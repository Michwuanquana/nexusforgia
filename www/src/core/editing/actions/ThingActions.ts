import type { Action } from '../interfaces';
import type { MapData } from '../../map/MapData';
import type { Thing } from '../../map/types';

export class CreateThingAction implements Action {
  readonly name = 'Create Thing';
  private map: MapData;
  private x: number;
  private y: number;
  private type: number;
  private angle: number;
  private createdId: number | null = null;

  constructor(map: MapData, x: number, y: number, type: number = 1, angle: number = 0) {
    this.map = map;
    this.x = x;
    this.y = y;
    this.type = type;
    this.angle = angle;
  }

  execute(): void {
    const id = this.createdId ?? this.map.allocateThingId();
    this.createdId = id;

    const thing: Thing = {
      id,
      tid: 0,
      x: this.x,
      y: this.y,
      z: 0,
      angle: this.angle,
      type: this.type,
      flags: 7, // Easy + Medium + Hard
      special: 0,
      args: [0, 0, 0, 0, 0],
    };

    this.map.things.set(id, thing);
  }

  undo(): void {
    if (this.createdId !== null) {
      this.map.things.delete(this.createdId);
    }
  }

  getCreatedId(): number | null {
    return this.createdId;
  }
}

export class DeleteThingsAction implements Action {
  readonly name = 'Delete Things';
  private map: MapData;
  private thingIds: number[];
  private deletedData: Map<number, Thing> = new Map();

  constructor(map: MapData, thingIds: number[]) {
    this.map = map;
    this.thingIds = thingIds;
  }

  execute(): void {
    for (const id of this.thingIds) {
      const thing = this.map.things.get(id);
      if (thing) {
        this.deletedData.set(id, { ...thing });
        this.map.things.delete(id);
      }
    }
  }

  undo(): void {
    for (const [id, thing] of this.deletedData) {
      this.map.things.set(id, { ...thing });
    }
  }
}

export class MoveThingsAction implements Action {
  readonly name = 'Move Things';
  private map: MapData;
  private thingIds: number[];
  private dx: number;
  private dy: number;

  constructor(map: MapData, thingIds: number[], dx: number, dy: number) {
    this.map = map;
    this.thingIds = thingIds;
    this.dx = dx;
    this.dy = dy;
  }

  execute(): void {
    for (const id of this.thingIds) {
      const thing = this.map.things.get(id);
      if (thing) {
        thing.x += this.dx;
        thing.y += this.dy;
      }
    }
  }

  undo(): void {
    for (const id of this.thingIds) {
      const thing = this.map.things.get(id);
      if (thing) {
        thing.x -= this.dx;
        thing.y -= this.dy;
      }
    }
  }
}
