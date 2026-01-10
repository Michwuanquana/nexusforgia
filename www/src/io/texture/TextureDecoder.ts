/**
 * Doom texture decoder
 * Handles PLAYPAL, flats, and wall textures
 */

export interface DecodedTexture {
  name: string;
  width: number;
  height: number;
  imageData: ImageData;
}

export class TextureDecoder {
  private palette: Uint8Array | null = null;

  /**
   * Load PLAYPAL lump (256 colors * 3 bytes RGB)
   */
  loadPalette(data: ArrayBuffer): void {
    this.palette = new Uint8Array(data.slice(0, 768)); // First palette only
  }

  /**
   * Decode a flat (64x64 raw indexed pixels)
   */
  decodeFlat(name: string, data: ArrayBuffer): DecodedTexture | null {
    if (!this.palette) return null;
    if (data.byteLength < 64 * 64) return null;

    const pixels = new Uint8Array(data);
    const imageData = new ImageData(64, 64);

    for (let i = 0; i < 64 * 64; i++) {
      const colorIndex = pixels[i];
      const paletteOffset = colorIndex * 3;

      imageData.data[i * 4 + 0] = this.palette[paletteOffset + 0];
      imageData.data[i * 4 + 1] = this.palette[paletteOffset + 1];
      imageData.data[i * 4 + 2] = this.palette[paletteOffset + 2];
      imageData.data[i * 4 + 3] = 255;
    }

    return { name, width: 64, height: 64, imageData };
  }

  /**
   * Decode a patch (column-based format used by wall textures)
   */
  decodePatch(name: string, data: ArrayBuffer): DecodedTexture | null {
    if (!this.palette) return null;
    if (data.byteLength < 8) return null;

    const view = new DataView(data);
    const width = view.getUint16(0, true);
    const height = view.getUint16(2, true);

    // Sanity check
    if (width <= 0 || width > 2048 || height <= 0 || height > 2048) {
      return null;
    }

    const imageData = new ImageData(width, height);
    // Initialize to transparent
    for (let i = 0; i < imageData.data.length; i += 4) {
      imageData.data[i + 3] = 0;
    }

    // Read column offsets
    const columnOffsets: number[] = [];
    for (let x = 0; x < width; x++) {
      columnOffsets.push(view.getUint32(8 + x * 4, true));
    }

    // Decode each column
    for (let x = 0; x < width; x++) {
      let offset = columnOffsets[x];

      // Safety limit
      let posts = 0;
      while (offset < data.byteLength && posts < 256) {
        const rowStart = view.getUint8(offset);
        if (rowStart === 255) break; // End of column

        const pixelCount = view.getUint8(offset + 1);
        // Skip padding byte
        offset += 3;

        for (let i = 0; i < pixelCount && offset < data.byteLength; i++) {
          const y = rowStart + i;
          if (y < height) {
            const colorIndex = view.getUint8(offset);
            const paletteOffset = colorIndex * 3;
            const pixelOffset = (y * width + x) * 4;

            imageData.data[pixelOffset + 0] = this.palette[paletteOffset + 0];
            imageData.data[pixelOffset + 1] = this.palette[paletteOffset + 1];
            imageData.data[pixelOffset + 2] = this.palette[paletteOffset + 2];
            imageData.data[pixelOffset + 3] = 255;
          }
          offset++;
        }
        // Skip padding byte
        offset++;
        posts++;
      }
    }

    return { name, width, height, imageData };
  }

  /**
   * Convert ImageData to data URL for use in <img> tags
   */
  static imageDataToUrl(imageData: ImageData): string {
    const canvas = document.createElement('canvas');
    canvas.width = imageData.width;
    canvas.height = imageData.height;
    const ctx = canvas.getContext('2d')!;
    ctx.putImageData(imageData, 0, 0);
    return canvas.toDataURL();
  }

  /**
   * Create a thumbnail from ImageData
   */
  static createThumbnail(imageData: ImageData, maxSize: number = 64): string {
    const canvas = document.createElement('canvas');
    const scale = Math.min(maxSize / imageData.width, maxSize / imageData.height, 1);
    canvas.width = Math.floor(imageData.width * scale);
    canvas.height = Math.floor(imageData.height * scale);

    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;

    // First draw to temp canvas at original size
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = imageData.width;
    tempCanvas.height = imageData.height;
    tempCanvas.getContext('2d')!.putImageData(imageData, 0, 0);

    // Then scale down
    ctx.drawImage(tempCanvas, 0, 0, canvas.width, canvas.height);

    return canvas.toDataURL();
  }

  hasPalette(): boolean {
    return this.palette !== null;
  }
}

// Singleton instance
export const textureDecoder = new TextureDecoder();
