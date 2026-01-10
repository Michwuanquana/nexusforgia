/**
 * WAD file writer
 * Creates PWAD files from map data
 */

export interface WritableLump {
  name: string;
  data: ArrayBuffer;
}

export class WadWriter {
  /**
   * Create a PWAD file from a list of lumps
   */
  static write(lumps: WritableLump[]): ArrayBuffer {
    // Calculate total size
    // Header: 12 bytes
    // Directory: 16 bytes per lump
    // Lump data: sum of all lump sizes
    const headerSize = 12;
    const directorySize = lumps.length * 16;
    const dataSize = lumps.reduce((sum, l) => sum + l.data.byteLength, 0);
    const totalSize = headerSize + dataSize + directorySize;

    const buffer = new ArrayBuffer(totalSize);
    const view = new DataView(buffer);
    const bytes = new Uint8Array(buffer);

    // Write header
    // Type: "PWAD"
    bytes[0] = 0x50; // P
    bytes[1] = 0x57; // W
    bytes[2] = 0x41; // A
    bytes[3] = 0x44; // D

    // Number of lumps
    view.setInt32(4, lumps.length, true);

    // Directory offset (after header and all lump data)
    const directoryOffset = headerSize + dataSize;
    view.setInt32(8, directoryOffset, true);

    // Write lump data and build directory
    let dataOffset = headerSize;

    for (let i = 0; i < lumps.length; i++) {
      const lump = lumps[i];

      // Copy lump data
      const lumpBytes = new Uint8Array(lump.data);
      bytes.set(lumpBytes, dataOffset);

      // Write directory entry
      const dirEntryOffset = directoryOffset + i * 16;

      // Lump offset
      view.setInt32(dirEntryOffset, dataOffset, true);

      // Lump size
      view.setInt32(dirEntryOffset + 4, lump.data.byteLength, true);

      // Lump name (8 bytes, padded with zeros)
      const nameBytes = this.stringToBytes(lump.name, 8);
      bytes.set(nameBytes, dirEntryOffset + 8);

      dataOffset += lump.data.byteLength;
    }

    return buffer;
  }

  /**
   * Convert string to fixed-length byte array (padded with zeros)
   */
  private static stringToBytes(str: string, length: number): Uint8Array {
    const bytes = new Uint8Array(length);
    const upper = str.toUpperCase();
    for (let i = 0; i < Math.min(upper.length, length); i++) {
      bytes[i] = upper.charCodeAt(i);
    }
    return bytes;
  }

  /**
   * Download a WAD file in the browser
   */
  static download(buffer: ArrayBuffer, filename: string): void {
    const blob = new Blob([buffer], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename.endsWith('.wad') ? filename : `${filename}.wad`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}
