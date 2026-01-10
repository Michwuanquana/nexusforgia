/**
 * Copy/Paste Manager
 * Handles copying and pasting map elements with proper ID remapping.
 */

import type { MapData } from '../map/MapData';
import type { Vertex, Linedef, Sidedef, Sector, Thing } from '../map/types';
import { useClipboardStore, type ClipboardData } from '../../store/clipboardStore';
import { useSelectionStore } from '../../store/selectionStore';
import { useMapStore } from '../../store/mapStore';

export class CopyPasteManager {
  /**
   * Copy selected elements to clipboard.
   * Copies the selection along with all related elements:
   * - Vertices: copies vertices
   * - Linedefs: copies linedefs + their vertices + sidedefs
   * - Sectors: copies sectors + their linedefs + vertices + sidedefs
   * - Things: copies things
   */
  static copy(map: MapData): boolean {
    const selection = useSelectionStore.getState();

    // Collect all elements to copy
    const vertexIds = new Set(selection.vertices);
    const linedefIds = new Set(selection.linedefs);
    const sectorIds = new Set(selection.sectors);
    const thingIds = new Set(selection.things);

    // If we have sectors selected, add their linedefs
    for (const sectorId of sectorIds) {
      const sector = map.sectors.get(sectorId);
      if (sector) {
        for (const linedefId of sector.linedefs) {
          linedefIds.add(linedefId);
        }
      }
    }

    // Also include linedefs that reference selected sectors via sidedefs
    for (const [linedefId, linedef] of map.linedefs) {
      if (linedef.frontSector !== null && sectorIds.has(linedef.frontSector)) {
        linedefIds.add(linedefId);
      }
      if (linedef.backSector !== null && sectorIds.has(linedef.backSector)) {
        linedefIds.add(linedefId);
      }
    }

    // If we have linedefs selected, add their vertices
    for (const linedefId of linedefIds) {
      const linedef = map.linedefs.get(linedefId);
      if (linedef) {
        vertexIds.add(linedef.v1);
        vertexIds.add(linedef.v2);
      }
    }

    // Check if we have anything to copy
    if (vertexIds.size === 0 && thingIds.size === 0) {
      return false;
    }

    // Collect vertex data
    const vertices: Vertex[] = [];
    for (const id of vertexIds) {
      const vertex = map.vertices.get(id);
      if (vertex) {
        vertices.push({
          ...vertex,
          linedefs: new Set(vertex.linedefs),
        });
      }
    }

    // Collect linedef and sidedef data
    const linedefs: Linedef[] = [];
    const sidedefIds = new Set<number>();

    for (const id of linedefIds) {
      const linedef = map.linedefs.get(id);
      if (linedef) {
        linedefs.push({ ...linedef });
        if (linedef.frontSidedef !== null) {
          sidedefIds.add(linedef.frontSidedef);
        }
        if (linedef.backSidedef !== null) {
          sidedefIds.add(linedef.backSidedef);
        }
      }
    }

    // Collect sidedef data
    const sidedefs: Sidedef[] = [];
    for (const id of sidedefIds) {
      const sidedef = map.sidedefs.get(id);
      if (sidedef) {
        sidedefs.push({ ...sidedef });
        // Ensure the sector is included if sidedef references it
        if (!sectorIds.has(sidedef.sector)) {
          sectorIds.add(sidedef.sector);
        }
      }
    }

    // Collect sector data
    const sectors: Sector[] = [];
    for (const id of sectorIds) {
      const sector = map.sectors.get(id);
      if (sector) {
        sectors.push({
          ...sector,
          linedefs: new Set(sector.linedefs),
        });
      }
    }

    // Collect thing data
    const things: Thing[] = [];
    for (const id of thingIds) {
      const thing = map.things.get(id);
      if (thing) {
        things.push({ ...thing });
      }
    }

    // Calculate center of copied elements
    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;

    for (const vertex of vertices) {
      minX = Math.min(minX, vertex.x);
      minY = Math.min(minY, vertex.y);
      maxX = Math.max(maxX, vertex.x);
      maxY = Math.max(maxY, vertex.y);
    }

    for (const thing of things) {
      minX = Math.min(minX, thing.x);
      minY = Math.min(minY, thing.y);
      maxX = Math.max(maxX, thing.x);
      maxY = Math.max(maxY, thing.y);
    }

    const centerX = isFinite(minX) ? (minX + maxX) / 2 : 0;
    const centerY = isFinite(minY) ? (minY + maxY) / 2 : 0;

    // Store in clipboard
    const clipboardData: ClipboardData = {
      vertices,
      linedefs,
      sidedefs,
      sectors,
      things,
      centerX,
      centerY,
    };

    useClipboardStore.getState().setData(clipboardData);
    console.log(`Copied: ${vertices.length} vertices, ${linedefs.length} linedefs, ${sidedefs.length} sidedefs, ${sectors.length} sectors, ${things.length} things`);

    return true;
  }

  /**
   * Paste clipboard contents at the given position.
   * Creates new elements with remapped IDs.
   */
  static paste(map: MapData, targetX: number, targetY: number): boolean {
    const clipboardData = useClipboardStore.getState().data;
    if (!clipboardData) {
      return false;
    }

    // Calculate offset from clipboard center to target position
    const offsetX = targetX - clipboardData.centerX;
    const offsetY = targetY - clipboardData.centerY;

    // Create ID mappings for remapping references
    const vertexIdMap = new Map<number, number>();
    const linedefIdMap = new Map<number, number>();
    const sidedefIdMap = new Map<number, number>();
    const sectorIdMap = new Map<number, number>();

    // Create new vertices
    const newVertexIds: number[] = [];
    for (const oldVertex of clipboardData.vertices) {
      const newId = map.allocateVertexId();
      vertexIdMap.set(oldVertex.id, newId);

      const newVertex: Vertex = {
        id: newId,
        x: oldVertex.x + offsetX,
        y: oldVertex.y + offsetY,
        linedefs: new Set(), // Will be populated when linedefs are added
      };

      map.vertices.set(newId, newVertex);
      newVertexIds.push(newId);
    }

    // Create new sectors first (sidedefs reference them)
    const newSectorIds: number[] = [];
    for (const oldSector of clipboardData.sectors) {
      const newId = map.allocateSectorId();
      sectorIdMap.set(oldSector.id, newId);

      const newSector: Sector = {
        id: newId,
        floorHeight: oldSector.floorHeight,
        ceilingHeight: oldSector.ceilingHeight,
        floorTexture: oldSector.floorTexture,
        ceilingTexture: oldSector.ceilingTexture,
        lightLevel: oldSector.lightLevel,
        special: oldSector.special,
        tag: oldSector.tag,
        linedefs: new Set(), // Will be populated later
        boundingBox: null,
        triangles: null,
      };

      map.sectors.set(newId, newSector);
      newSectorIds.push(newId);
    }

    // Create new sidedefs
    for (const oldSidedef of clipboardData.sidedefs) {
      const newId = map.allocateSidedefId();
      sidedefIdMap.set(oldSidedef.id, newId);

      const newSectorId = sectorIdMap.get(oldSidedef.sector);
      if (newSectorId === undefined) {
        console.warn(`Sidedef ${oldSidedef.id} references unknown sector ${oldSidedef.sector}`);
        continue;
      }

      const newSidedef: Sidedef = {
        id: newId,
        offsetX: oldSidedef.offsetX,
        offsetY: oldSidedef.offsetY,
        upperTexture: oldSidedef.upperTexture,
        lowerTexture: oldSidedef.lowerTexture,
        middleTexture: oldSidedef.middleTexture,
        sector: newSectorId,
      };

      map.sidedefs.set(newId, newSidedef);
    }

    // Create new linedefs
    const newLinedefIds: number[] = [];
    for (const oldLinedef of clipboardData.linedefs) {
      const newId = map.allocateLinedefId();
      linedefIdMap.set(oldLinedef.id, newId);

      const newV1 = vertexIdMap.get(oldLinedef.v1);
      const newV2 = vertexIdMap.get(oldLinedef.v2);

      if (newV1 === undefined || newV2 === undefined) {
        console.warn(`Linedef ${oldLinedef.id} references missing vertices`);
        continue;
      }

      // Remap sidedef references
      let newFrontSidedef: number | null = null;
      let newBackSidedef: number | null = null;
      let newFrontSector: number | null = null;
      let newBackSector: number | null = null;

      if (oldLinedef.frontSidedef !== null) {
        newFrontSidedef = sidedefIdMap.get(oldLinedef.frontSidedef) ?? null;
      }
      if (oldLinedef.backSidedef !== null) {
        newBackSidedef = sidedefIdMap.get(oldLinedef.backSidedef) ?? null;
      }
      if (oldLinedef.frontSector !== null) {
        newFrontSector = sectorIdMap.get(oldLinedef.frontSector) ?? null;
      }
      if (oldLinedef.backSector !== null) {
        newBackSector = sectorIdMap.get(oldLinedef.backSector) ?? null;
      }

      const newLinedef: Linedef = {
        id: newId,
        v1: newV1,
        v2: newV2,
        flags: oldLinedef.flags,
        special: oldLinedef.special,
        args: [...oldLinedef.args] as [number, number, number, number, number],
        frontSidedef: newFrontSidedef,
        backSidedef: newBackSidedef,
        frontSector: newFrontSector,
        backSector: newBackSector,
      };

      map.linedefs.set(newId, newLinedef);
      newLinedefIds.push(newId);

      // Update vertex linedef sets
      const v1 = map.vertices.get(newV1);
      const v2 = map.vertices.get(newV2);
      if (v1) v1.linedefs.add(newId);
      if (v2) v2.linedefs.add(newId);

      // Update sector linedef sets
      if (newFrontSector !== null) {
        const sector = map.sectors.get(newFrontSector);
        if (sector) sector.linedefs.add(newId);
      }
      if (newBackSector !== null) {
        const sector = map.sectors.get(newBackSector);
        if (sector) sector.linedefs.add(newId);
      }
    }

    // Create new things
    const newThingIds: number[] = [];
    for (const oldThing of clipboardData.things) {
      const newId = map.allocateThingId();

      const newThing: Thing = {
        id: newId,
        tid: 0, // Reset TID for pasted things
        x: oldThing.x + offsetX,
        y: oldThing.y + offsetY,
        z: oldThing.z,
        angle: oldThing.angle,
        type: oldThing.type,
        flags: oldThing.flags,
        special: oldThing.special,
        args: [...oldThing.args] as [number, number, number, number, number],
      };

      map.things.set(newId, newThing);
      newThingIds.push(newId);
    }

    // Recalculate bounding boxes for new sectors
    map.calculateSectorBoundingBoxes();

    // Update selection to the new elements
    const { selectVertices, selectLinedefs, selectSectors, selectThings, clearAll } = useSelectionStore.getState();
    clearAll();

    if (newVertexIds.length > 0) {
      selectVertices(newVertexIds, true);
    }
    if (newLinedefIds.length > 0) {
      selectLinedefs(newLinedefIds, true);
    }
    if (newSectorIds.length > 0) {
      selectSectors(newSectorIds, true);
    }
    if (newThingIds.length > 0) {
      selectThings(newThingIds, true);
    }

    // Mark map as dirty
    useMapStore.getState().markDirty();

    console.log(`Pasted: ${newVertexIds.length} vertices, ${newLinedefIds.length} linedefs, ${newSectorIds.length} sectors, ${newThingIds.length} things`);

    return true;
  }

  /**
   * Cut = Copy + Delete
   */
  static cut(map: MapData): boolean {
    if (!this.copy(map)) {
      return false;
    }

    // Delete selected elements
    this.deleteSelection(map);
    return true;
  }

  /**
   * Delete currently selected elements.
   */
  static deleteSelection(map: MapData): void {
    const selection = useSelectionStore.getState();

    // Delete things
    for (const id of selection.things) {
      map.things.delete(id);
    }

    // Delete sectors (and their sidedefs)
    for (const id of selection.sectors) {
      const sector = map.sectors.get(id);
      if (sector) {
        // Remove sidedefs that reference this sector
        for (const [sidedefId, sidedef] of map.sidedefs) {
          if (sidedef.sector === id) {
            // Update linedefs that reference this sidedef
            for (const [, linedef] of map.linedefs) {
              if (linedef.frontSidedef === sidedefId) {
                linedef.frontSidedef = null;
                linedef.frontSector = null;
              }
              if (linedef.backSidedef === sidedefId) {
                linedef.backSidedef = null;
                linedef.backSector = null;
              }
            }
            map.sidedefs.delete(sidedefId);
          }
        }
        map.sectors.delete(id);
      }
    }

    // Delete linedefs
    for (const id of selection.linedefs) {
      const linedef = map.linedefs.get(id);
      if (linedef) {
        // Remove from vertex linedef sets
        const v1 = map.vertices.get(linedef.v1);
        const v2 = map.vertices.get(linedef.v2);
        if (v1) v1.linedefs.delete(id);
        if (v2) v2.linedefs.delete(id);

        // Remove from sector linedef sets
        if (linedef.frontSector !== null) {
          const sector = map.sectors.get(linedef.frontSector);
          if (sector) sector.linedefs.delete(id);
        }
        if (linedef.backSector !== null) {
          const sector = map.sectors.get(linedef.backSector);
          if (sector) sector.linedefs.delete(id);
        }

        // Delete associated sidedefs
        if (linedef.frontSidedef !== null) {
          map.sidedefs.delete(linedef.frontSidedef);
        }
        if (linedef.backSidedef !== null) {
          map.sidedefs.delete(linedef.backSidedef);
        }

        map.linedefs.delete(id);
      }
    }

    // Delete vertices (only if they have no remaining linedefs)
    for (const id of selection.vertices) {
      const vertex = map.vertices.get(id);
      if (vertex && vertex.linedefs.size === 0) {
        map.vertices.delete(id);
      }
    }

    // Clear selection
    useSelectionStore.getState().clearAll();
    useMapStore.getState().markDirty();
  }
}
