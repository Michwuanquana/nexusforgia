import { create } from 'zustand';
import type { WadFile, WadLump } from '../io/wad/WadReader';
import { textureDecoder, TextureDecoder } from '../io/texture/TextureDecoder';

export interface TextureInfo {
  name: string;
  type: 'flat' | 'texture';
  width: number;
  height: number;
  thumbnailUrl: string;
  fullUrl?: string;
}

interface TextureState {
  textures: Map<string, TextureInfo>;
  flats: Map<string, TextureInfo>;
  loading: boolean;
  loaded: boolean;

  loadFromWad: (wad: WadFile) => void;
  getTexture: (name: string) => TextureInfo | undefined;
  getFlat: (name: string) => TextureInfo | undefined;
  getAllFlats: () => TextureInfo[];
  getAllTextures: () => TextureInfo[];
  clear: () => void;
}

export const useTextureStore = create<TextureState>((set, get) => ({
  textures: new Map(),
  flats: new Map(),
  loading: false,
  loaded: false,

  loadFromWad: (wad: WadFile) => {
    set({ loading: true });

    const textures = new Map<string, TextureInfo>();
    const flats = new Map<string, TextureInfo>();

    // Find PLAYPAL
    const playpal = wad.lumps.find(l => l.name === 'PLAYPAL');
    if (playpal) {
      textureDecoder.loadPalette(playpal.data);
    }

    // Find flats between F_START/F_END or FF_START/FF_END
    let inFlats = false;
    for (const lump of wad.lumps) {
      if (lump.name === 'F_START' || lump.name === 'FF_START' || lump.name === 'F1_START' || lump.name === 'F2_START') {
        inFlats = true;
        continue;
      }
      if (lump.name === 'F_END' || lump.name === 'FF_END' || lump.name === 'F1_END' || lump.name === 'F2_END') {
        inFlats = false;
        continue;
      }

      if (inFlats && lump.size === 64 * 64 && textureDecoder.hasPalette()) {
        const decoded = textureDecoder.decodeFlat(lump.name, lump.data);
        if (decoded) {
          const thumbnailUrl = TextureDecoder.createThumbnail(decoded.imageData, 64);
          flats.set(lump.name.toUpperCase(), {
            name: lump.name.toUpperCase(),
            type: 'flat',
            width: decoded.width,
            height: decoded.height,
            thumbnailUrl,
          });
        }
      }
    }

    // Find patches between P_START/P_END or PP_START/PP_END
    const patches = new Map<string, WadLump>();
    let inPatches = false;
    for (const lump of wad.lumps) {
      if (lump.name === 'P_START' || lump.name === 'PP_START' || lump.name === 'P1_START' || lump.name === 'P2_START') {
        inPatches = true;
        continue;
      }
      if (lump.name === 'P_END' || lump.name === 'PP_END' || lump.name === 'P1_END' || lump.name === 'P2_END') {
        inPatches = false;
        continue;
      }

      if (inPatches && lump.size > 0) {
        patches.set(lump.name.toUpperCase(), lump);
      }
    }

    // Decode PNAMES if exists
    const pnamesLump = wad.lumps.find(l => l.name === 'PNAMES');
    const patchNames: string[] = [];
    if (pnamesLump) {
      const view = new DataView(pnamesLump.data);
      const count = view.getInt32(0, true);
      for (let i = 0; i < count; i++) {
        const nameBytes = new Uint8Array(pnamesLump.data, 4 + i * 8, 8);
        let name = '';
        for (const byte of nameBytes) {
          if (byte === 0) break;
          name += String.fromCharCode(byte);
        }
        patchNames.push(name.toUpperCase());
      }
    }

    // Decode TEXTURE1/TEXTURE2
    const decodeTextureX = (lump: WadLump) => {
      const view = new DataView(lump.data);
      const numTextures = view.getInt32(0, true);

      for (let i = 0; i < numTextures; i++) {
        const offset = view.getInt32(4 + i * 4, true);
        if (offset >= lump.data.byteLength) continue;

        // Read texture definition
        const nameBytes = new Uint8Array(lump.data, offset, 8);
        let name = '';
        for (const byte of nameBytes) {
          if (byte === 0) break;
          name += String.fromCharCode(byte);
        }
        name = name.toUpperCase();

        // Skip masked, width, height at offset+8
        const width = view.getUint16(offset + 12, true);
        const height = view.getUint16(offset + 14, true);
        // Skip columndirectory (4 bytes)
        const patchCount = view.getUint16(offset + 20, true);

        if (width <= 0 || width > 2048 || height <= 0 || height > 2048) continue;

        // Create composite texture
        const imageData = new ImageData(width, height);
        // Initialize to cyan (missing texture color)
        for (let j = 0; j < imageData.data.length; j += 4) {
          imageData.data[j + 0] = 0;
          imageData.data[j + 1] = 255;
          imageData.data[j + 2] = 255;
          imageData.data[j + 3] = 255;
        }

        // Read patches
        let valid = true;
        for (let p = 0; p < patchCount && valid; p++) {
          const patchOffset = offset + 22 + p * 10;
          if (patchOffset + 10 > lump.data.byteLength) {
            valid = false;
            break;
          }

          const originX = view.getInt16(patchOffset, true);
          const originY = view.getInt16(patchOffset + 2, true);
          const patchIndex = view.getUint16(patchOffset + 4, true);

          if (patchIndex >= patchNames.length) continue;

          const patchName = patchNames[patchIndex];
          const patchLump = patches.get(patchName);

          if (patchLump && textureDecoder.hasPalette()) {
            const decodedPatch = textureDecoder.decodePatch(patchName, patchLump.data);
            if (decodedPatch) {
              // Composite patch onto texture
              for (let py = 0; py < decodedPatch.height; py++) {
                for (let px = 0; px < decodedPatch.width; px++) {
                  const tx = originX + px;
                  const ty = originY + py;
                  if (tx < 0 || tx >= width || ty < 0 || ty >= height) continue;

                  const srcIdx = (py * decodedPatch.width + px) * 4;
                  const dstIdx = (ty * width + tx) * 4;

                  // Only copy if not transparent
                  if (decodedPatch.imageData.data[srcIdx + 3] > 0) {
                    imageData.data[dstIdx + 0] = decodedPatch.imageData.data[srcIdx + 0];
                    imageData.data[dstIdx + 1] = decodedPatch.imageData.data[srcIdx + 1];
                    imageData.data[dstIdx + 2] = decodedPatch.imageData.data[srcIdx + 2];
                    imageData.data[dstIdx + 3] = 255;
                  }
                }
              }
            }
          }
        }

        if (valid) {
          const thumbnailUrl = TextureDecoder.createThumbnail(imageData, 64);
          textures.set(name, {
            name,
            type: 'texture',
            width,
            height,
            thumbnailUrl,
          });
        }
      }
    };

    // Process TEXTURE1 and TEXTURE2
    const texture1 = wad.lumps.find(l => l.name === 'TEXTURE1');
    const texture2 = wad.lumps.find(l => l.name === 'TEXTURE2');

    if (texture1) decodeTextureX(texture1);
    if (texture2) decodeTextureX(texture2);

    set({
      textures,
      flats,
      loading: false,
      loaded: true,
    });

    console.log(`Loaded ${flats.size} flats and ${textures.size} textures`);
  },

  getTexture: (name: string) => {
    return get().textures.get(name.toUpperCase());
  },

  getFlat: (name: string) => {
    return get().flats.get(name.toUpperCase());
  },

  getAllFlats: () => {
    return Array.from(get().flats.values()).sort((a, b) => a.name.localeCompare(b.name));
  },

  getAllTextures: () => {
    return Array.from(get().textures.values()).sort((a, b) => a.name.localeCompare(b.name));
  },

  clear: () => {
    set({
      textures: new Map(),
      flats: new Map(),
      loading: false,
      loaded: false,
    });
  },
}));
