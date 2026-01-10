import type { Action } from '../interfaces';
import type { MapData } from '../../map/MapData';

export class FlipLinedefAction implements Action {
  readonly name = 'Flip Linedef';
  map: MapData;
  linedefIds: number[];

  constructor(map: MapData, linedefIds: number[]) {
    this.map = map;
    this.linedefIds = linedefIds;
  }

  execute(): void {
    for (const id of this.linedefIds) {
      const linedef = this.map.linedefs.get(id);
      if (linedef) {
        // Swap vertices
        [linedef.v1, linedef.v2] = [linedef.v2, linedef.v1];
        // Swap sidedefs
        [linedef.frontSidedef, linedef.backSidedef] = [linedef.backSidedef, linedef.frontSidedef];
        // Swap sectors
        [linedef.frontSector, linedef.backSector] = [linedef.backSector, linedef.frontSector];
      }
    }
  }

  undo(): void {
    // Flipping is its own inverse
    this.execute();
  }
}

export class DeleteLinedefsAction implements Action {
  readonly name = 'Delete Linedefs';
  deletedData: Map<
    number,
    {
      v1: number;
      v2: number;
      flags: number;
      special: number;
      args: [number, number, number, number, number];
      frontSidedef: number | null;
      backSidedef: number | null;
      frontSector: number | null;
      backSector: number | null;
    }
  > = new Map();
  map: MapData;
  linedefIds: number[];

  constructor(map: MapData, linedefIds: number[]) {
    this.map = map;
    this.linedefIds = linedefIds;
  }

  execute(): void {
    for (const id of this.linedefIds) {
      const linedef = this.map.linedefs.get(id);
      if (linedef) {
        this.deletedData.set(id, {
          v1: linedef.v1,
          v2: linedef.v2,
          flags: linedef.flags,
          special: linedef.special,
          args: [...linedef.args] as [number, number, number, number, number],
          frontSidedef: linedef.frontSidedef,
          backSidedef: linedef.backSidedef,
          frontSector: linedef.frontSector,
          backSector: linedef.backSector,
        });

        // Remove from vertex references
        const v1 = this.map.vertices.get(linedef.v1);
        const v2 = this.map.vertices.get(linedef.v2);
        if (v1) v1.linedefs.delete(id);
        if (v2) v2.linedefs.delete(id);

        this.map.linedefs.delete(id);
      }
    }
  }

  undo(): void {
    for (const [id, data] of this.deletedData) {
      this.map.linedefs.set(id, {
        id,
        ...data,
      });

      // Restore vertex references
      const v1 = this.map.vertices.get(data.v1);
      const v2 = this.map.vertices.get(data.v2);
      if (v1) v1.linedefs.add(id);
      if (v2) v2.linedefs.add(id);
    }
  }
}
