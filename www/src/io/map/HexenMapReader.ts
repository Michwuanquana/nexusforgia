import { MapData } from '../../core/map/MapData';
import type { Vertex, Linedef, Sidedef, Sector, Thing } from '../../core/map/types';
import type { WadLump } from '../wad/WadReader';
import { isHexenFormat, type MapFormatId } from '../../core/map/MapFormat';

export class HexenMapReader {
  static read(lumps: Map<string, WadLump>, mapName: string, format?: MapFormatId): MapData {
    const map = new MapData();
    map.name = mapName;

    // Use provided format or detect from BEHAVIOR lump
    const isHexen = format ? isHexenFormat(format) : lumps.has('BEHAVIOR');

    // Store format in map for later reference
    map.format = format || (isHexen ? 'hexen' : 'boom_doom2');

    // Read VERTEXES
    const vertexLump = lumps.get('VERTEXES');
    if (vertexLump) {
      this.readVertices(map, vertexLump.data);
    }

    // Read SECTORS
    const sectorLump = lumps.get('SECTORS');
    if (sectorLump) {
      this.readSectors(map, sectorLump.data);
    }

    // Read SIDEDEFS
    const sidedefLump = lumps.get('SIDEDEFS');
    if (sidedefLump) {
      this.readSidedefs(map, sidedefLump.data);
    }

    // Read LINEDEFS (Doom: 14 bytes, Hexen: 16 bytes)
    const linedefLump = lumps.get('LINEDEFS');
    if (linedefLump) {
      this.readLinedefs(map, linedefLump.data, isHexen);
    }

    // Read THINGS (Doom: 10 bytes, Hexen: 20 bytes)
    const thingLump = lumps.get('THINGS');
    if (thingLump) {
      this.readThings(map, thingLump.data, isHexen);
    }

    // Read BEHAVIOR lump (compiled ACS) if present
    const behaviorLump = lumps.get('BEHAVIOR');
    if (behaviorLump && behaviorLump.data.byteLength > 0) {
      map.behaviorLump = behaviorLump.data.slice(0); // Clone the buffer
    }

    // Read SCRIPTS lump (ACS source code) if present
    const scriptsLump = lumps.get('SCRIPTS');
    if (scriptsLump && scriptsLump.data.byteLength > 0) {
      const bytes = new Uint8Array(scriptsLump.data);
      map.scriptsLump = new TextDecoder('utf-8').decode(bytes);
    }

    // Build back-references
    this.buildReferences(map);

    // Calculate sector bounding boxes
    map.calculateSectorBoundingBoxes();

    // Set next IDs
    map.setNextIds(
      map.vertices.size,
      map.linedefs.size,
      map.sidedefs.size,
      map.sectors.size,
      map.things.size
    );

    return map;
  }

  private static readVertices(map: MapData, data: ArrayBuffer): void {
    const view = new DataView(data);
    const count = data.byteLength / 4;

    for (let i = 0; i < count; i++) {
      const offset = i * 4;
      const vertex: Vertex = {
        id: i,
        x: view.getInt16(offset, true),
        y: view.getInt16(offset + 2, true),
        linedefs: new Set(),
      };
      map.vertices.set(i, vertex);
    }
  }

  private static readLinedefs(map: MapData, data: ArrayBuffer, isHexen: boolean): void {
    const view = new DataView(data);
    const stride = isHexen ? 16 : 14;
    const count = data.byteLength / stride;

    for (let i = 0; i < count; i++) {
      const offset = i * stride;

      let linedef: Linedef;

      if (!isHexen) {
        // Doom format
        linedef = {
          id: i,
          v1: view.getUint16(offset, true),
          v2: view.getUint16(offset + 2, true),
          flags: view.getUint16(offset + 4, true),
          special: view.getUint16(offset + 6, true),
          args: [view.getUint16(offset + 8, true), 0, 0, 0, 0], // tag in args[0]
          frontSidedef: view.getUint16(offset + 10, true),
          backSidedef: view.getUint16(offset + 12, true),
          frontSector: null,
          backSector: null,
        };
      } else {
        // Hexen format
        linedef = {
          id: i,
          v1: view.getUint16(offset, true),
          v2: view.getUint16(offset + 2, true),
          flags: view.getUint16(offset + 4, true),
          special: view.getUint8(offset + 6),
          args: [
            view.getUint8(offset + 7),
            view.getUint8(offset + 8),
            view.getUint8(offset + 9),
            view.getUint8(offset + 10),
            view.getUint8(offset + 11),
          ],
          frontSidedef: view.getUint16(offset + 12, true),
          backSidedef: view.getUint16(offset + 14, true),
          frontSector: null,
          backSector: null,
        };
      }

      // Convert 0xFFFF (65535) to null
      if (linedef.frontSidedef === 0xffff) {
        linedef.frontSidedef = null;
      }
      if (linedef.backSidedef === 0xffff) {
        linedef.backSidedef = null;
      }

      map.linedefs.set(i, linedef);
    }
  }

  private static readSidedefs(map: MapData, data: ArrayBuffer): void {
    const view = new DataView(data);
    const count = data.byteLength / 30;

    for (let i = 0; i < count; i++) {
      const offset = i * 30;
      const sidedef: Sidedef = {
        id: i,
        offsetX: view.getInt16(offset, true),
        offsetY: view.getInt16(offset + 2, true),
        upperTexture: this.readString(data, offset + 4, 8),
        lowerTexture: this.readString(data, offset + 12, 8),
        middleTexture: this.readString(data, offset + 20, 8),
        sector: view.getUint16(offset + 28, true),
      };
      map.sidedefs.set(i, sidedef);
    }
  }

  private static readSectors(map: MapData, data: ArrayBuffer): void {
    const view = new DataView(data);
    const count = data.byteLength / 26;

    for (let i = 0; i < count; i++) {
      const offset = i * 26;
      const sector: Sector = {
        id: i,
        floorHeight: view.getInt16(offset, true),
        ceilingHeight: view.getInt16(offset + 2, true),
        floorTexture: this.readString(data, offset + 4, 8),
        ceilingTexture: this.readString(data, offset + 12, 8),
        lightLevel: view.getUint16(offset + 20, true),
        special: view.getUint16(offset + 22, true),
        tag: view.getUint16(offset + 24, true),
        linedefs: new Set(),
        boundingBox: null,
        triangles: null,
      };
      map.sectors.set(i, sector);
    }
  }

  private static readThings(map: MapData, data: ArrayBuffer, isHexen: boolean): void {
    const view = new DataView(data);
    const stride = isHexen ? 20 : 10;
    const count = Math.floor(data.byteLength / stride);

    for (let i = 0; i < count; i++) {
      const offset = i * stride;

      // Bounds check
      if (offset + stride > data.byteLength) break;

      let thing: Thing;

      if (!isHexen) {
        // Doom format
        thing = {
          id: i,
          tid: 0,
          x: view.getInt16(offset, true),
          y: view.getInt16(offset + 2, true),
          z: 0,
          angle: view.getUint16(offset + 4, true),
          type: view.getUint16(offset + 6, true),
          flags: view.getUint16(offset + 8, true),
          special: 0,
          args: [0, 0, 0, 0, 0],
        };
      } else {
        // Hexen format
        thing = {
          id: i,
          tid: view.getUint16(offset, true),
          x: view.getInt16(offset + 2, true),
          y: view.getInt16(offset + 4, true),
          z: view.getInt16(offset + 6, true),
          angle: view.getUint16(offset + 8, true),
          type: view.getUint16(offset + 10, true),
          flags: view.getUint16(offset + 12, true),
          special: view.getUint8(offset + 14),
          args: [
            view.getUint8(offset + 15),
            view.getUint8(offset + 16),
            view.getUint8(offset + 17),
            view.getUint8(offset + 18),
            view.getUint8(offset + 19),
          ],
        };
      }

      map.things.set(i, thing);
    }
  }

  private static readString(
    buffer: ArrayBuffer,
    offset: number,
    length: number
  ): string {
    const bytes = new Uint8Array(buffer, offset, length);
    let str = '';
    for (const byte of bytes) {
      if (byte === 0) break;
      str += String.fromCharCode(byte);
    }
    return str.toUpperCase();
  }

  private static buildReferences(map: MapData): void {
    // Link vertices to linedefs
    for (const linedef of map.linedefs.values()) {
      const v1 = map.vertices.get(linedef.v1);
      const v2 = map.vertices.get(linedef.v2);
      if (v1) v1.linedefs.add(linedef.id);
      if (v2) v2.linedefs.add(linedef.id);

      // Link linedefs to sectors via sidedefs
      if (linedef.frontSidedef !== null) {
        const sidedef = map.sidedefs.get(linedef.frontSidedef);
        if (sidedef) {
          linedef.frontSector = sidedef.sector;
          const sector = map.sectors.get(sidedef.sector);
          if (sector) sector.linedefs.add(linedef.id);
        }
      }
      if (linedef.backSidedef !== null) {
        const sidedef = map.sidedefs.get(linedef.backSidedef);
        if (sidedef) {
          linedef.backSector = sidedef.sector;
          const sector = map.sectors.get(sidedef.sector);
          if (sector) sector.linedefs.add(linedef.id);
        }
      }
    }
  }
}
