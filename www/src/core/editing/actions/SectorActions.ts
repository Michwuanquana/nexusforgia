import type { Action } from '../interfaces';
import type { MapData } from '../../map/MapData';
import type { Sector, Linedef, Sidedef } from '../../map/types';
import { SectorBuilder } from '../../geometry/SectorBuilder';

export class DeleteSectorsAction implements Action {
  readonly name = 'Delete Sectors';
  private map: MapData;
  private sectorIds: number[];
  private deletedSectors: Map<number, Sector> = new Map();
  private deletedSidedefs: Map<number, Sidedef> = new Map();
  private deletedLinedefs: Map<number, Linedef> = new Map();
  private modifiedLinedefs: Map<number, { frontSidedef: number | null; backSidedef: number | null }> = new Map();

  constructor(map: MapData, sectorIds: number[]) {
    this.map = map;
    this.sectorIds = sectorIds;
  }

  execute(): void {
    const sectorIdSet = new Set(this.sectorIds);

    // Find all sidedefs that reference these sectors
    const sidedefsToDelete = new Set<number>();
    for (const [id, sidedef] of this.map.sidedefs) {
      if (sectorIdSet.has(sidedef.sector)) {
        sidedefsToDelete.add(id);
        this.deletedSidedefs.set(id, { ...sidedef });
      }
    }

    // Find linedefs that will be affected
    for (const [id, linedef] of this.map.linedefs) {
      const frontDeleted = linedef.frontSidedef !== null && sidedefsToDelete.has(linedef.frontSidedef);
      const backDeleted = linedef.backSidedef !== null && sidedefsToDelete.has(linedef.backSidedef);

      if (frontDeleted && backDeleted) {
        // Both sides deleted - delete the linedef
        this.deletedLinedefs.set(id, { ...linedef });
      } else if (frontDeleted || backDeleted) {
        // One side deleted - update the linedef
        this.modifiedLinedefs.set(id, {
          frontSidedef: linedef.frontSidedef,
          backSidedef: linedef.backSidedef,
        });

        if (frontDeleted) {
          linedef.frontSidedef = null;
          linedef.frontSector = null;
        }
        if (backDeleted) {
          linedef.backSidedef = null;
          linedef.backSector = null;
        }
      }
    }

    // Delete linedefs
    for (const id of this.deletedLinedefs.keys()) {
      const linedef = this.map.linedefs.get(id);
      if (linedef) {
        const v1 = this.map.vertices.get(linedef.v1);
        const v2 = this.map.vertices.get(linedef.v2);
        if (v1) v1.linedefs.delete(id);
        if (v2) v2.linedefs.delete(id);
      }
      this.map.linedefs.delete(id);
    }

    // Delete sidedefs
    for (const id of sidedefsToDelete) {
      this.map.sidedefs.delete(id);
    }

    // Delete sectors
    for (const id of this.sectorIds) {
      const sector = this.map.sectors.get(id);
      if (sector) {
        this.deletedSectors.set(id, {
          ...sector,
          linedefs: new Set(sector.linedefs)
        });
        this.map.sectors.delete(id);
      }
    }
  }

  undo(): void {
    // Restore sectors
    for (const [id, sector] of this.deletedSectors) {
      this.map.sectors.set(id, {
        ...sector,
        linedefs: new Set(sector.linedefs)
      });
    }

    // Restore sidedefs
    for (const [id, sidedef] of this.deletedSidedefs) {
      this.map.sidedefs.set(id, { ...sidedef });
    }

    // Restore modified linedefs
    for (const [id, data] of this.modifiedLinedefs) {
      const linedef = this.map.linedefs.get(id);
      if (linedef) {
        linedef.frontSidedef = data.frontSidedef;
        linedef.backSidedef = data.backSidedef;

        // Restore sector references
        if (linedef.frontSidedef !== null) {
          const sidedef = this.map.sidedefs.get(linedef.frontSidedef);
          if (sidedef) linedef.frontSector = sidedef.sector;
        }
        if (linedef.backSidedef !== null) {
          const sidedef = this.map.sidedefs.get(linedef.backSidedef);
          if (sidedef) linedef.backSector = sidedef.sector;
        }
      }
    }

    // Restore deleted linedefs
    for (const [id, linedef] of this.deletedLinedefs) {
      this.map.linedefs.set(id, { ...linedef });

      const v1 = this.map.vertices.get(linedef.v1);
      const v2 = this.map.vertices.get(linedef.v2);
      if (v1) v1.linedefs.add(id);
      if (v2) v2.linedefs.add(id);
    }
  }
}

/**
 * DetectSectorsAction - Automatically detect and create sectors from closed linedef loops
 */
export class DetectSectorsAction implements Action {
  readonly name = 'Detect Sectors';
  private map: MapData;

  // State for undo
  private createdSectorIds: number[] = [];
  private createdSidedefIds: number[] = [];
  private originalLinedefState: Map<number, {
    frontSidedef: number | null;
    backSidedef: number | null;
    frontSector: number | null;
    backSector: number | null;
    flags: number;
  }> = new Map();

  constructor(map: MapData) {
    this.map = map;
  }

  execute(): void {
    // Store original linedef state
    for (const [id, linedef] of this.map.linedefs) {
      this.originalLinedefState.set(id, {
        frontSidedef: linedef.frontSidedef,
        backSidedef: linedef.backSidedef,
        frontSector: linedef.frontSector,
        backSector: linedef.backSector,
        flags: linedef.flags,
      });
    }

    // Run sector detection
    const sectors = SectorBuilder.detectAndCreateSectors(this.map);

    // Track what was created
    for (const sector of sectors) {
      this.createdSectorIds.push(sector.id);
      this.map.sectors.set(sector.id, sector);
    }

    // Track created sidedefs
    for (const [id] of this.map.sidedefs) {
      if (!this.createdSidedefIds.includes(id)) {
        // Check if this sidedef was created during detection
        const existedBefore = Array.from(this.originalLinedefState.values()).some(
          state => state.frontSidedef === id || state.backSidedef === id
        );
        if (!existedBefore) {
          this.createdSidedefIds.push(id);
        }
      }
    }

    // Calculate bounding boxes for all sectors
    this.map.calculateSectorBoundingBoxes();
  }

  undo(): void {
    // Remove created sectors
    for (const id of this.createdSectorIds) {
      this.map.sectors.delete(id);
    }

    // Remove created sidedefs
    for (const id of this.createdSidedefIds) {
      this.map.sidedefs.delete(id);
    }

    // Restore original linedef state
    for (const [id, state] of this.originalLinedefState) {
      const linedef = this.map.linedefs.get(id);
      if (linedef) {
        linedef.frontSidedef = state.frontSidedef;
        linedef.backSidedef = state.backSidedef;
        linedef.frontSector = state.frontSector;
        linedef.backSector = state.backSector;
        linedef.flags = state.flags;
      }
    }

    // Clear tracking
    this.createdSectorIds = [];
    this.createdSidedefIds = [];
    this.originalLinedefState.clear();
  }
}
