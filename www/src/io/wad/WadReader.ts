export interface WadLump {
  name: string;
  offset: number;
  size: number;
  data: ArrayBuffer;
}

export interface WadFile {
  type: 'IWAD' | 'PWAD';
  lumps: WadLump[];
}

export class WadReader {
  static read(buffer: ArrayBuffer): WadFile {
    const view = new DataView(buffer);

    // Header
    const typeBytes = new Uint8Array(buffer, 0, 4);
    const type = String.fromCharCode(...typeBytes) as 'IWAD' | 'PWAD';
    const numLumps = view.getInt32(4, true);
    const directoryOffset = view.getInt32(8, true);

    // Directory
    const lumps: WadLump[] = [];
    for (let i = 0; i < numLumps; i++) {
      const entryOffset = directoryOffset + i * 16;
      const lumpOffset = view.getInt32(entryOffset, true);
      const lumpSize = view.getInt32(entryOffset + 4, true);

      const nameBytes = new Uint8Array(buffer, entryOffset + 8, 8);
      const name = String.fromCharCode(...nameBytes).replace(/\0+$/, '');

      lumps.push({
        name,
        offset: lumpOffset,
        size: lumpSize,
        data: buffer.slice(lumpOffset, lumpOffset + lumpSize),
      });
    }

    return { type, lumps };
  }

  static findMapLumps(wad: WadFile, mapName: string): Map<string, WadLump> {
    const result = new Map<string, WadLump>();
    const mapIndex = wad.lumps.findIndex((l) => l.name === mapName);

    if (mapIndex === -1) return result;

    const mapLumpNames = [
      'THINGS',
      'LINEDEFS',
      'SIDEDEFS',
      'VERTEXES',
      'SEGS',
      'SSECTORS',
      'NODES',
      'SECTORS',
      'REJECT',
      'BLOCKMAP',
      'BEHAVIOR',
      'SCRIPTS',
    ];

    const mapPatterns = [/^MAP\d{2}$/, /^E\dM\d$/];

    for (let i = mapIndex + 1; i < wad.lumps.length; i++) {
      const lump = wad.lumps[i];

      // Stop if we hit another map marker
      if (mapPatterns.some((p) => p.test(lump.name))) {
        break;
      }

      if (mapLumpNames.includes(lump.name)) {
        result.set(lump.name, lump);
      } else if (lump.size > 0) {
        break; // Unknown lump with data = end of map lumps
      }
    }

    return result;
  }

  static getMapNames(wad: WadFile): string[] {
    const mapNames: string[] = [];
    const mapPatterns = [
      /^MAP\d{2}$/, // MAP01, MAP02, etc.
      /^E\dM\d$/, // E1M1, E2M3, etc.
    ];

    for (const lump of wad.lumps) {
      if (mapPatterns.some((p) => p.test(lump.name))) {
        mapNames.push(lump.name);
      }
    }

    return mapNames;
  }
}
