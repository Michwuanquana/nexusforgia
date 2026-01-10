import type { Action } from '../interfaces';
import type { MapData } from '../../map/MapData';
import type { Sector, Linedef, Sidedef, Vertex } from '../../map/types';
import { LinedefFlags } from '../../map/types';
import { SectorBuilder } from '../../geometry/SectorBuilder';

/**
 * SmartDeleteSectorsAction - Intelligently delete sectors and clean up geometry
 *
 * When deleting sectors:
 * 1. Linedefs exclusive to deleted sectors are removed
 * 2. Shared linedefs are flipped to face the surviving sector
 * 3. Shared linedefs get a middle texture if they become one-sided
 * 4. Orphan vertices (no linedefs) are removed
 */
export class SmartDeleteSectorsAction implements Action {
  readonly name = 'Smart Delete Sectors';
  private map: MapData;
  private sectorIds: number[];

  // Undo state
  private deletedSectors: Map<number, Sector> = new Map();
  private deletedSidedefs: Map<number, Sidedef> = new Map();
  private deletedLinedefs: Map<number, Linedef> = new Map();
  private deletedVertices: Map<number, Vertex> = new Map();
  private modifiedLinedefs: Map<number, {
    v1: number;
    v2: number;
    flags: number;
    frontSidedef: number | null;
    backSidedef: number | null;
    frontSector: number | null;
    backSector: number | null;
  }> = new Map();
  private modifiedSidedefs: Map<number, {
    middleTexture: string;
  }> = new Map();

  constructor(map: MapData, sectorIds: number[]) {
    this.map = map;
    this.sectorIds = sectorIds;
  }

  execute(): void {
    const sectorIdSet = new Set(this.sectorIds);

    // Store sectors before deletion
    for (const id of this.sectorIds) {
      const sector = this.map.sectors.get(id);
      if (sector) {
        this.deletedSectors.set(id, {
          ...sector,
          linedefs: new Set(sector.linedefs)
        });
      }
    }

    // Find all sidedefs that reference deleted sectors
    const sidedefsToDelete = new Set<number>();
    for (const [id, sidedef] of this.map.sidedefs) {
      if (sectorIdSet.has(sidedef.sector)) {
        sidedefsToDelete.add(id);
        this.deletedSidedefs.set(id, { ...sidedef });
      }
    }

    // Track vertices that might become orphans
    const potentialOrphanVertices = new Set<number>();

    // Categorize and process linedefs
    for (const [id, linedef] of this.map.linedefs) {
      const frontDeleted = linedef.frontSidedef !== null && sidedefsToDelete.has(linedef.frontSidedef);
      const backDeleted = linedef.backSidedef !== null && sidedefsToDelete.has(linedef.backSidedef);

      if (frontDeleted && backDeleted) {
        // EXCLUSIVE: Both sides belong to deleted sectors - delete linedef
        this.deletedLinedefs.set(id, { ...linedef });
        potentialOrphanVertices.add(linedef.v1);
        potentialOrphanVertices.add(linedef.v2);
      } else if (frontDeleted || backDeleted) {
        // SHARED: One side survives - need to adjust
        this.modifiedLinedefs.set(id, {
          v1: linedef.v1,
          v2: linedef.v2,
          flags: linedef.flags,
          frontSidedef: linedef.frontSidedef,
          backSidedef: linedef.backSidedef,
          frontSector: linedef.frontSector,
          backSector: linedef.backSector,
        });

        if (frontDeleted) {
          // Front side is being deleted, back side survives
          // Flip the linedef so the surviving side becomes the front
          const backSidedef = linedef.backSidedef;
          const backSector = linedef.backSector;

          // Swap vertices (flips direction)
          const tempV = linedef.v1;
          linedef.v1 = linedef.v2;
          linedef.v2 = tempV;

          // Move back sidedef to front
          linedef.frontSidedef = backSidedef;
          linedef.frontSector = backSector;
          linedef.backSidedef = null;
          linedef.backSector = null;

          // Clear two-sided flag
          linedef.flags &= ~LinedefFlags.TWOSIDED;

          // Ensure middle texture on the surviving sidedef
          if (backSidedef !== null) {
            const sidedef = this.map.sidedefs.get(backSidedef);
            if (sidedef && sidedef.middleTexture === '-') {
              this.modifiedSidedefs.set(backSidedef, { middleTexture: sidedef.middleTexture });
              // Pick a texture: prefer upper/lower, fallback to default
              sidedef.middleTexture = sidedef.upperTexture !== '-' ? sidedef.upperTexture
                : sidedef.lowerTexture !== '-' ? sidedef.lowerTexture
                : 'STONE2';
            }
          }
        } else if (backDeleted) {
          // Back side is being deleted, front side survives
          linedef.backSidedef = null;
          linedef.backSector = null;

          // Clear two-sided flag
          linedef.flags &= ~LinedefFlags.TWOSIDED;

          // Ensure middle texture on the surviving sidedef
          if (linedef.frontSidedef !== null) {
            const sidedef = this.map.sidedefs.get(linedef.frontSidedef);
            if (sidedef && sidedef.middleTexture === '-') {
              this.modifiedSidedefs.set(linedef.frontSidedef, { middleTexture: sidedef.middleTexture });
              sidedef.middleTexture = sidedef.upperTexture !== '-' ? sidedef.upperTexture
                : sidedef.lowerTexture !== '-' ? sidedef.lowerTexture
                : 'STONE2';
            }
          }
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
      this.map.sectors.delete(id);
    }

    // Find and delete orphan vertices
    for (const vertexId of potentialOrphanVertices) {
      const vertex = this.map.vertices.get(vertexId);
      if (vertex && vertex.linedefs.size === 0) {
        this.deletedVertices.set(vertexId, {
          ...vertex,
          linedefs: new Set(vertex.linedefs)
        });
        this.map.vertices.delete(vertexId);
      }
    }

    // Update sector linedefs sets for surviving sectors
    for (const sector of this.map.sectors.values()) {
      sector.linedefs.clear();
    }
    for (const linedef of this.map.linedefs.values()) {
      if (linedef.frontSector !== null) {
        const sector = this.map.sectors.get(linedef.frontSector);
        if (sector) sector.linedefs.add(linedef.id);
      }
      if (linedef.backSector !== null) {
        const sector = this.map.sectors.get(linedef.backSector);
        if (sector) sector.linedefs.add(linedef.id);
      }
    }

    // Recalculate bounding boxes
    this.map.calculateSectorBoundingBoxes();
  }

  undo(): void {
    // Restore vertices
    for (const [id, vertex] of this.deletedVertices) {
      this.map.vertices.set(id, {
        ...vertex,
        linedefs: new Set(vertex.linedefs)
      });
    }

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

    // Restore sidedef middle textures
    for (const [id, data] of this.modifiedSidedefs) {
      const sidedef = this.map.sidedefs.get(id);
      if (sidedef) {
        sidedef.middleTexture = data.middleTexture;
      }
    }

    // Restore modified linedefs
    for (const [id, data] of this.modifiedLinedefs) {
      const linedef = this.map.linedefs.get(id);
      if (linedef) {
        linedef.v1 = data.v1;
        linedef.v2 = data.v2;
        linedef.flags = data.flags;
        linedef.frontSidedef = data.frontSidedef;
        linedef.backSidedef = data.backSidedef;
        linedef.frontSector = data.frontSector;
        linedef.backSector = data.backSector;
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

    // Rebuild sector linedef sets
    for (const sector of this.map.sectors.values()) {
      sector.linedefs.clear();
    }
    for (const linedef of this.map.linedefs.values()) {
      if (linedef.frontSector !== null) {
        const sector = this.map.sectors.get(linedef.frontSector);
        if (sector) sector.linedefs.add(linedef.id);
      }
      if (linedef.backSector !== null) {
        const sector = this.map.sectors.get(linedef.backSector);
        if (sector) sector.linedefs.add(linedef.id);
      }
    }

    // Recalculate bounding boxes
    this.map.calculateSectorBoundingBoxes();
  }
}

/**
 * SmartDeleteLinedefsAction - Delete linedefs and clean up affected geometry
 *
 * When deleting linedefs:
 * 1. Delete associated sidedefs
 * 2. Delete orphan vertices
 * 3. Recalculate affected sectors (merge if boundary removed)
 */
export class SmartDeleteLinedefsAction implements Action {
  readonly name = 'Smart Delete Linedefs';
  private map: MapData;
  private linedefIds: number[];

  // Undo state
  private deletedLinedefs: Map<number, Linedef> = new Map();
  private deletedSidedefs: Map<number, Sidedef> = new Map();
  private deletedVertices: Map<number, Vertex> = new Map();
  private deletedSectors: Map<number, Sector> = new Map();
  private createdSectors: number[] = [];
  private createdSidedefs: number[] = [];
  private originalLinedefState: Map<number, {
    frontSidedef: number | null;
    backSidedef: number | null;
    frontSector: number | null;
    backSector: number | null;
    flags: number;
  }> = new Map();

  constructor(map: MapData, linedefIds: number[]) {
    this.map = map;
    this.linedefIds = linedefIds;
  }

  execute(): void {
    const linedefIdSet = new Set(this.linedefIds);

    // Track affected sectors before deletion
    const affectedSectorIds = new Set<number>();

    // Collect linedefs, sidedefs to delete, and track orphan vertices
    const potentialOrphanVertices = new Set<number>();

    for (const id of this.linedefIds) {
      const linedef = this.map.linedefs.get(id);
      if (!linedef) continue;

      // Store for undo
      this.deletedLinedefs.set(id, { ...linedef });

      // Track affected sectors
      if (linedef.frontSector !== null) affectedSectorIds.add(linedef.frontSector);
      if (linedef.backSector !== null) affectedSectorIds.add(linedef.backSector);

      // Store sidedefs
      if (linedef.frontSidedef !== null) {
        const sidedef = this.map.sidedefs.get(linedef.frontSidedef);
        if (sidedef) {
          this.deletedSidedefs.set(linedef.frontSidedef, { ...sidedef });
        }
      }
      if (linedef.backSidedef !== null) {
        const sidedef = this.map.sidedefs.get(linedef.backSidedef);
        if (sidedef) {
          this.deletedSidedefs.set(linedef.backSidedef, { ...sidedef });
        }
      }

      // Track potential orphan vertices
      potentialOrphanVertices.add(linedef.v1);
      potentialOrphanVertices.add(linedef.v2);
    }

    // Store original state of all linedefs for potential sector rebuilding
    for (const [id, linedef] of this.map.linedefs) {
      if (!linedefIdSet.has(id)) {
        this.originalLinedefState.set(id, {
          frontSidedef: linedef.frontSidedef,
          backSidedef: linedef.backSidedef,
          frontSector: linedef.frontSector,
          backSector: linedef.backSector,
          flags: linedef.flags,
        });
      }
    }

    // Delete linedefs
    for (const id of this.linedefIds) {
      const linedef = this.map.linedefs.get(id);
      if (linedef) {
        // Remove from vertex references
        const v1 = this.map.vertices.get(linedef.v1);
        const v2 = this.map.vertices.get(linedef.v2);
        if (v1) v1.linedefs.delete(id);
        if (v2) v2.linedefs.delete(id);

        // Delete associated sidedefs
        if (linedef.frontSidedef !== null) {
          this.map.sidedefs.delete(linedef.frontSidedef);
        }
        if (linedef.backSidedef !== null) {
          this.map.sidedefs.delete(linedef.backSidedef);
        }

        this.map.linedefs.delete(id);
      }
    }

    // Delete orphan vertices
    for (const vertexId of potentialOrphanVertices) {
      const vertex = this.map.vertices.get(vertexId);
      if (vertex && vertex.linedefs.size === 0) {
        this.deletedVertices.set(vertexId, {
          ...vertex,
          linedefs: new Set()
        });
        this.map.vertices.delete(vertexId);
      }
    }

    // Delete affected sectors that are now invalid
    for (const sectorId of affectedSectorIds) {
      const sector = this.map.sectors.get(sectorId);
      if (!sector) continue;

      // Check if sector still has any linedefs
      let hasLinedefs = false;
      for (const linedef of this.map.linedefs.values()) {
        if (linedef.frontSector === sectorId || linedef.backSector === sectorId) {
          hasLinedefs = true;
          break;
        }
      }

      if (!hasLinedefs) {
        // Delete sector and its remaining sidedefs
        this.deletedSectors.set(sectorId, {
          ...sector,
          linedefs: new Set(sector.linedefs)
        });

        // Delete any sidedefs pointing to this sector
        for (const [sidedefId, sidedef] of this.map.sidedefs) {
          if (sidedef.sector === sectorId) {
            if (!this.deletedSidedefs.has(sidedefId)) {
              this.deletedSidedefs.set(sidedefId, { ...sidedef });
            }
            this.map.sidedefs.delete(sidedefId);
          }
        }

        this.map.sectors.delete(sectorId);
      }
    }

    // Rebuild sector references in remaining linedefs
    for (const linedef of this.map.linedefs.values()) {
      // Check front sidedef
      if (linedef.frontSidedef !== null) {
        const sidedef = this.map.sidedefs.get(linedef.frontSidedef);
        if (sidedef && this.map.sectors.has(sidedef.sector)) {
          linedef.frontSector = sidedef.sector;
        } else {
          linedef.frontSidedef = null;
          linedef.frontSector = null;
        }
      }
      // Check back sidedef
      if (linedef.backSidedef !== null) {
        const sidedef = this.map.sidedefs.get(linedef.backSidedef);
        if (sidedef && this.map.sectors.has(sidedef.sector)) {
          linedef.backSector = sidedef.sector;
        } else {
          linedef.backSidedef = null;
          linedef.backSector = null;
        }
      }
    }

    // Try to detect merged sectors from remaining geometry
    if (affectedSectorIds.size > 0 && this.map.linedefs.size > 0) {
      // Find linedefs in affected area that don't have sectors assigned
      const orphanedLinedefs: number[] = [];
      for (const linedef of this.map.linedefs.values()) {
        if (linedef.frontSidedef === null && linedef.backSidedef === null) {
          orphanedLinedefs.push(linedef.id);
        }
      }

      if (orphanedLinedefs.length > 0) {
        // Run sector detection for affected area
        const newSectors = SectorBuilder.detectAndCreateSectors(this.map);
        for (const sector of newSectors) {
          this.createdSectors.push(sector.id);
          this.map.sectors.set(sector.id, sector);
        }

        // Track newly created sidedefs
        for (const [id] of this.map.sidedefs) {
          if (!this.deletedSidedefs.has(id)) {
            const wasOriginal = Array.from(this.originalLinedefState.values()).some(
              state => state.frontSidedef === id || state.backSidedef === id
            );
            if (!wasOriginal) {
              this.createdSidedefs.push(id);
            }
          }
        }
      }
    }

    // Rebuild sector linedefs sets
    for (const sector of this.map.sectors.values()) {
      sector.linedefs.clear();
    }
    for (const linedef of this.map.linedefs.values()) {
      if (linedef.frontSector !== null) {
        const sector = this.map.sectors.get(linedef.frontSector);
        if (sector) sector.linedefs.add(linedef.id);
      }
      if (linedef.backSector !== null) {
        const sector = this.map.sectors.get(linedef.backSector);
        if (sector) sector.linedefs.add(linedef.id);
      }
    }

    this.map.calculateSectorBoundingBoxes();
  }

  undo(): void {
    // Remove created sectors
    for (const id of this.createdSectors) {
      this.map.sectors.delete(id);
    }

    // Remove created sidedefs
    for (const id of this.createdSidedefs) {
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

    // Restore vertices
    for (const [id, vertex] of this.deletedVertices) {
      this.map.vertices.set(id, {
        ...vertex,
        linedefs: new Set()
      });
    }

    // Restore sidedefs
    for (const [id, sidedef] of this.deletedSidedefs) {
      this.map.sidedefs.set(id, { ...sidedef });
    }

    // Restore sectors
    for (const [id, sector] of this.deletedSectors) {
      this.map.sectors.set(id, {
        ...sector,
        linedefs: new Set(sector.linedefs)
      });
    }

    // Restore linedefs
    for (const [id, linedef] of this.deletedLinedefs) {
      this.map.linedefs.set(id, { ...linedef });

      // Restore vertex references
      const v1 = this.map.vertices.get(linedef.v1);
      const v2 = this.map.vertices.get(linedef.v2);
      if (v1) v1.linedefs.add(id);
      if (v2) v2.linedefs.add(id);
    }

    // Rebuild sector linedefs sets
    for (const sector of this.map.sectors.values()) {
      sector.linedefs.clear();
    }
    for (const linedef of this.map.linedefs.values()) {
      if (linedef.frontSector !== null) {
        const sector = this.map.sectors.get(linedef.frontSector);
        if (sector) sector.linedefs.add(linedef.id);
      }
      if (linedef.backSector !== null) {
        const sector = this.map.sectors.get(linedef.backSector);
        if (sector) sector.linedefs.add(linedef.id);
      }
    }

    this.map.calculateSectorBoundingBoxes();
  }
}

/**
 * SmartDeleteVerticesAction - Delete vertices and cascade to linedefs/sectors
 *
 * When deleting vertices:
 * 1. Delete all connected linedefs (using SmartDeleteLinedefs logic)
 * 2. Cascade to sector recalculation
 */
export class SmartDeleteVerticesAction implements Action {
  readonly name = 'Smart Delete Vertices';
  private map: MapData;
  private vertexIds: number[];

  // We delegate to SmartDeleteLinedefsAction for the cascade
  private linedefAction: SmartDeleteLinedefsAction | null = null;
  private deletedVertices: Map<number, Vertex> = new Map();

  constructor(map: MapData, vertexIds: number[]) {
    this.map = map;
    this.vertexIds = vertexIds;
  }

  execute(): void {
    // Collect all linedefs connected to these vertices
    const linedefsToDelete = new Set<number>();

    for (const vertexId of this.vertexIds) {
      const vertex = this.map.vertices.get(vertexId);
      if (vertex) {
        // Store vertex for direct undo
        this.deletedVertices.set(vertexId, {
          ...vertex,
          linedefs: new Set(vertex.linedefs)
        });

        // Collect connected linedefs
        for (const linedefId of vertex.linedefs) {
          linedefsToDelete.add(linedefId);
        }
      }
    }

    // If there are linedefs to delete, use SmartDeleteLinedefsAction
    if (linedefsToDelete.size > 0) {
      this.linedefAction = new SmartDeleteLinedefsAction(
        this.map,
        Array.from(linedefsToDelete)
      );
      this.linedefAction.execute();
    }

    // Delete any vertices that weren't deleted by the linedef action
    // (in case they had no linedefs)
    for (const vertexId of this.vertexIds) {
      if (this.map.vertices.has(vertexId)) {
        this.map.vertices.delete(vertexId);
      }
    }
  }

  undo(): void {
    // Undo linedef deletion first (this restores linedefs and their vertices)
    if (this.linedefAction) {
      this.linedefAction.undo();
    }

    // Restore any vertices that weren't restored by linedef action
    for (const [id, vertex] of this.deletedVertices) {
      if (!this.map.vertices.has(id)) {
        this.map.vertices.set(id, {
          ...vertex,
          linedefs: new Set(vertex.linedefs)
        });
      }
    }
  }
}
