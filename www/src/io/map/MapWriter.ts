/**
 * Map data writer
 * Converts MapData to binary WAD lumps (Doom/Hexen format)
 */

import { MapData } from '../../core/map/MapData';
import { isHexenFormat, type MapFormatId } from '../../core/map/MapFormat';
import type { WritableLump } from '../wad/WadWriter';

export class MapWriter {
  /**
   * Convert MapData to WAD lumps
   */
  static write(map: MapData, mapName: string, format?: MapFormatId): WritableLump[] {
    const lumps: WritableLump[] = [];
    const isHexen = format ? isHexenFormat(format) : isHexenFormat(map.format);

    // Map marker lump (empty)
    lumps.push({
      name: mapName,
      data: new ArrayBuffer(0),
    });

    // THINGS
    lumps.push({
      name: 'THINGS',
      data: this.writeThings(map, isHexen),
    });

    // LINEDEFS
    lumps.push({
      name: 'LINEDEFS',
      data: this.writeLinedefs(map, isHexen),
    });

    // SIDEDEFS
    lumps.push({
      name: 'SIDEDEFS',
      data: this.writeSidedefs(map),
    });

    // VERTEXES
    lumps.push({
      name: 'VERTEXES',
      data: this.writeVertices(map),
    });

    // SECTORS
    lumps.push({
      name: 'SECTORS',
      data: this.writeSectors(map),
    });

    // BSP lumps - empty placeholders
    // GZDoom and most modern ports will rebuild these automatically
    // For vanilla compatibility, use an external node builder (ZDBSP)
    lumps.push({
      name: 'SEGS',
      data: new ArrayBuffer(0),
    });

    lumps.push({
      name: 'SSECTORS',
      data: new ArrayBuffer(0),
    });

    lumps.push({
      name: 'NODES',
      data: new ArrayBuffer(0),
    });

    lumps.push({
      name: 'REJECT',
      data: new ArrayBuffer(0),
    });

    lumps.push({
      name: 'BLOCKMAP',
      data: new ArrayBuffer(0),
    });

    // For Hexen format, add BEHAVIOR lump (use existing or create empty)
    if (isHexen) {
      lumps.push({
        name: 'BEHAVIOR',
        data: map.behaviorLump ?? this.writeEmptyBehavior(),
      });
    }

    // Add SCRIPTS lump if source code exists
    if (map.scriptsLump) {
      const encoder = new TextEncoder();
      lumps.push({
        name: 'SCRIPTS',
        data: encoder.encode(map.scriptsLump).buffer,
      });
    }

    return lumps;
  }

  /**
   * Write VERTEXES lump
   * Format: 4 bytes per vertex (2x int16)
   */
  private static writeVertices(map: MapData): ArrayBuffer {
    // Create ID mapping for contiguous indices
    const vertexIds = this.getSortedIds(map.vertices);
    const idMap = new Map<number, number>();
    vertexIds.forEach((id, index) => idMap.set(id, index));

    const buffer = new ArrayBuffer(vertexIds.length * 4);
    const view = new DataView(buffer);

    vertexIds.forEach((id, index) => {
      const vertex = map.vertices.get(id)!;
      const offset = index * 4;
      view.setInt16(offset, Math.round(vertex.x), true);
      view.setInt16(offset + 2, Math.round(vertex.y), true);
    });

    return buffer;
  }

  /**
   * Write LINEDEFS lump
   * Doom format: 14 bytes per linedef
   * Hexen format: 16 bytes per linedef
   */
  private static writeLinedefs(map: MapData, isHexen: boolean): ArrayBuffer {
    const linedefIds = this.getSortedIds(map.linedefs);
    const vertexIdMap = this.createIdMap(map.vertices);
    const sidedefIdMap = this.createIdMap(map.sidedefs);

    const stride = isHexen ? 16 : 14;
    const buffer = new ArrayBuffer(linedefIds.length * stride);
    const view = new DataView(buffer);

    linedefIds.forEach((id, index) => {
      const linedef = map.linedefs.get(id)!;
      const offset = index * stride;

      // Vertex indices (remapped)
      const v1 = vertexIdMap.get(linedef.v1) ?? 0;
      const v2 = vertexIdMap.get(linedef.v2) ?? 0;

      // Sidedef indices (remapped, 0xFFFF for none)
      const front = linedef.frontSidedef !== null
        ? (sidedefIdMap.get(linedef.frontSidedef) ?? 0xFFFF)
        : 0xFFFF;
      const back = linedef.backSidedef !== null
        ? (sidedefIdMap.get(linedef.backSidedef) ?? 0xFFFF)
        : 0xFFFF;

      if (!isHexen) {
        // Doom format
        view.setUint16(offset, v1, true);
        view.setUint16(offset + 2, v2, true);
        view.setUint16(offset + 4, linedef.flags, true);
        view.setUint16(offset + 6, linedef.special, true);
        view.setUint16(offset + 8, linedef.args[0], true); // tag
        view.setUint16(offset + 10, front, true);
        view.setUint16(offset + 12, back, true);
      } else {
        // Hexen format
        view.setUint16(offset, v1, true);
        view.setUint16(offset + 2, v2, true);
        view.setUint16(offset + 4, linedef.flags, true);
        view.setUint8(offset + 6, linedef.special);
        view.setUint8(offset + 7, linedef.args[0]);
        view.setUint8(offset + 8, linedef.args[1]);
        view.setUint8(offset + 9, linedef.args[2]);
        view.setUint8(offset + 10, linedef.args[3]);
        view.setUint8(offset + 11, linedef.args[4]);
        view.setUint16(offset + 12, front, true);
        view.setUint16(offset + 14, back, true);
      }
    });

    return buffer;
  }

  /**
   * Write SIDEDEFS lump
   * Format: 30 bytes per sidedef
   */
  private static writeSidedefs(map: MapData): ArrayBuffer {
    const sidedefIds = this.getSortedIds(map.sidedefs);
    const sectorIdMap = this.createIdMap(map.sectors);

    const buffer = new ArrayBuffer(sidedefIds.length * 30);
    const view = new DataView(buffer);
    const bytes = new Uint8Array(buffer);

    sidedefIds.forEach((id, index) => {
      const sidedef = map.sidedefs.get(id)!;
      const offset = index * 30;

      view.setInt16(offset, sidedef.offsetX, true);
      view.setInt16(offset + 2, sidedef.offsetY, true);

      // Textures (8 bytes each, padded with zeros)
      this.writeString(bytes, offset + 4, sidedef.upperTexture, 8);
      this.writeString(bytes, offset + 12, sidedef.lowerTexture, 8);
      this.writeString(bytes, offset + 20, sidedef.middleTexture, 8);

      // Sector index (remapped)
      const sectorIndex = sectorIdMap.get(sidedef.sector) ?? 0;
      view.setUint16(offset + 28, sectorIndex, true);
    });

    return buffer;
  }

  /**
   * Write SECTORS lump
   * Format: 26 bytes per sector
   */
  private static writeSectors(map: MapData): ArrayBuffer {
    const sectorIds = this.getSortedIds(map.sectors);

    const buffer = new ArrayBuffer(sectorIds.length * 26);
    const view = new DataView(buffer);
    const bytes = new Uint8Array(buffer);

    sectorIds.forEach((id, index) => {
      const sector = map.sectors.get(id)!;
      const offset = index * 26;

      view.setInt16(offset, sector.floorHeight, true);
      view.setInt16(offset + 2, sector.ceilingHeight, true);

      // Textures (8 bytes each)
      this.writeString(bytes, offset + 4, sector.floorTexture, 8);
      this.writeString(bytes, offset + 12, sector.ceilingTexture, 8);

      view.setUint16(offset + 20, sector.lightLevel, true);
      view.setUint16(offset + 22, sector.special, true);
      view.setUint16(offset + 24, sector.tag, true);
    });

    return buffer;
  }

  /**
   * Write THINGS lump
   * Doom format: 10 bytes per thing
   * Hexen format: 20 bytes per thing
   */
  private static writeThings(map: MapData, isHexen: boolean): ArrayBuffer {
    const thingIds = this.getSortedIds(map.things);

    const stride = isHexen ? 20 : 10;
    const buffer = new ArrayBuffer(thingIds.length * stride);
    const view = new DataView(buffer);

    thingIds.forEach((id, index) => {
      const thing = map.things.get(id)!;
      const offset = index * stride;

      if (!isHexen) {
        // Doom format
        view.setInt16(offset, Math.round(thing.x), true);
        view.setInt16(offset + 2, Math.round(thing.y), true);
        view.setUint16(offset + 4, thing.angle, true);
        view.setUint16(offset + 6, thing.type, true);
        view.setUint16(offset + 8, thing.flags, true);
      } else {
        // Hexen format
        view.setUint16(offset, thing.tid, true);
        view.setInt16(offset + 2, Math.round(thing.x), true);
        view.setInt16(offset + 4, Math.round(thing.y), true);
        view.setInt16(offset + 6, Math.round(thing.z), true);
        view.setUint16(offset + 8, thing.angle, true);
        view.setUint16(offset + 10, thing.type, true);
        view.setUint16(offset + 12, thing.flags, true);
        view.setUint8(offset + 14, thing.special);
        view.setUint8(offset + 15, thing.args[0]);
        view.setUint8(offset + 16, thing.args[1]);
        view.setUint8(offset + 17, thing.args[2]);
        view.setUint8(offset + 18, thing.args[3]);
        view.setUint8(offset + 19, thing.args[4]);
      }
    });

    return buffer;
  }

  /**
   * Write empty BEHAVIOR lump (required for Hexen format)
   * Minimal ACS object header
   */
  private static writeEmptyBehavior(): ArrayBuffer {
    // Minimal valid BEHAVIOR lump
    // "ACS\0" magic + version + info offset + script count
    const buffer = new ArrayBuffer(8);
    const bytes = new Uint8Array(buffer);
    const view = new DataView(buffer);

    // Magic: "ACS\0"
    bytes[0] = 0x41; // A
    bytes[1] = 0x43; // C
    bytes[2] = 0x53; // S
    bytes[3] = 0x00; // NUL

    // Offset to script directory (points past header = no scripts)
    view.setInt32(4, 8, true);

    return buffer;
  }

  /**
   * Write string to byte array (padded with zeros, uppercase)
   */
  private static writeString(
    bytes: Uint8Array,
    offset: number,
    str: string,
    length: number
  ): void {
    const upper = str.toUpperCase();
    for (let i = 0; i < length; i++) {
      bytes[offset + i] = i < upper.length ? upper.charCodeAt(i) : 0;
    }
  }

  /**
   * Get sorted IDs from a map (for consistent output order)
   */
  private static getSortedIds<T>(map: Map<number, T>): number[] {
    return Array.from(map.keys()).sort((a, b) => a - b);
  }

  /**
   * Create old ID -> new index mapping
   */
  private static createIdMap<T>(map: Map<number, T>): Map<number, number> {
    const ids = this.getSortedIds(map);
    const result = new Map<number, number>();
    ids.forEach((id, index) => result.set(id, index));
    return result;
  }
}
