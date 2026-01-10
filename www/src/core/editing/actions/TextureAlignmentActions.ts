import type { Action } from '../interfaces';
import type { MapData } from '../../map/MapData';
import type { Sidedef } from '../../map/types';
import { useTextureStore } from '../../../store/textureStore';

interface AlignJob {
  sidedefId: number;
  offsetX: number;
  forward: boolean;
}

interface OldOffsets {
  offsetX: number;
  offsetY: number;
}

/**
 * Auto-aligns textures along connected walls that share the same texture.
 * Based on Doom Builder X implementation.
 */
export class AutoAlignTexturesAction implements Action {
  readonly name = 'Auto Align Textures';
  private map: MapData;
  private startSidedefId: number;
  private textureName: string;
  private alignX: boolean;
  private alignY: boolean;
  private oldOffsets: Map<number, OldOffsets> = new Map();
  private alignedSidedefs: Set<number> = new Set();

  constructor(
    map: MapData,
    startSidedefId: number,
    textureName: string,
    alignX: boolean = true,
    alignY: boolean = true
  ) {
    this.map = map;
    this.startSidedefId = startSidedefId;
    this.textureName = textureName.toUpperCase();
    this.alignX = alignX;
    this.alignY = alignY;
  }

  execute(): void {
    const startSidedef = this.map.sidedefs.get(this.startSidedefId);
    if (!startSidedef) return;

    // Get texture dimensions for offset wrapping
    const textureStore = useTextureStore.getState();
    const textureInfo = textureStore.getTexture(this.textureName);
    const textureWidth = textureInfo?.width || 128;
    const textureHeight = textureInfo?.height || 128;

    // Get start sector ceiling height for Y alignment
    const startSector = this.map.sectors.get(startSidedef.sector);
    const startCeilingHeight = startSector?.ceilingHeight ?? 0;
    const startOffsetY = startSidedef.offsetY;

    // Stack for breadth-first traversal
    const todo: AlignJob[] = [];
    const processed = new Set<number>();

    // Begin with the start sidedef
    todo.push({
      sidedefId: this.startSidedefId,
      offsetX: startSidedef.offsetX,
      forward: true,
    });

    while (todo.length > 0) {
      const job = todo.pop()!;

      if (processed.has(job.sidedefId)) continue;
      processed.add(job.sidedefId);

      const sidedef = this.map.sidedefs.get(job.sidedefId);
      if (!sidedef) continue;

      // Find the linedef this sidedef belongs to
      const linedef = this.findLinedefForSidedef(job.sidedefId);
      if (!linedef) continue;

      const v1 = this.map.vertices.get(linedef.v1);
      const v2 = this.map.vertices.get(linedef.v2);
      if (!v1 || !v2) continue;

      const lineLength = Math.sqrt((v2.x - v1.x) ** 2 + (v2.y - v1.y) ** 2);

      // Store old offsets for undo
      if (!this.oldOffsets.has(job.sidedefId)) {
        this.oldOffsets.set(job.sidedefId, {
          offsetX: sidedef.offsetX,
          offsetY: sidedef.offsetY,
        });
      }

      // Determine if this sidedef is front or back
      const isFront = linedef.frontSidedef === job.sidedefId;

      if (job.forward) {
        // Apply X offset
        if (this.alignX) {
          sidedef.offsetX = job.offsetX % textureWidth;
        }

        // Apply Y offset based on ceiling height difference
        if (this.alignY) {
          const sector = this.map.sectors.get(sidedef.sector);
          if (sector) {
            const heightDiff = startCeilingHeight - sector.ceilingHeight;
            sidedef.offsetY = (heightDiff + startOffsetY) % textureHeight;
          }
        }

        this.alignedSidedefs.add(job.sidedefId);

        // Calculate offsets for next sidedefs
        const forwardOffset = job.offsetX + Math.round(lineLength);
        const backwardOffset = job.offsetX;

        // Add connected sidedefs at the "end" vertex (forward direction)
        const endVertex = isFront ? v2 : v1;
        this.addConnectedSidedefs(todo, processed, endVertex.id, true, forwardOffset);

        // Add connected sidedefs at the "start" vertex (backward direction)
        const startVertex = isFront ? v1 : v2;
        this.addConnectedSidedefs(todo, processed, startVertex.id, false, backwardOffset);
      } else {
        // Backward traversal - offset needs to account for line length
        if (this.alignX) {
          sidedef.offsetX = (job.offsetX - Math.round(lineLength)) % textureWidth;
        }

        if (this.alignY) {
          const sector = this.map.sectors.get(sidedef.sector);
          if (sector) {
            const heightDiff = startCeilingHeight - sector.ceilingHeight;
            sidedef.offsetY = (heightDiff + startOffsetY) % textureHeight;
          }
        }

        this.alignedSidedefs.add(job.sidedefId);

        const forwardOffset = job.offsetX;
        const backwardOffset = job.offsetX - Math.round(lineLength);

        // Add connected sidedefs
        const startVertex = isFront ? v1 : v2;
        this.addConnectedSidedefs(todo, processed, startVertex.id, false, backwardOffset);

        const endVertex = isFront ? v2 : v1;
        this.addConnectedSidedefs(todo, processed, endVertex.id, true, forwardOffset);
      }
    }
  }

  private findLinedefForSidedef(sidedefId: number): { id: number; v1: number; v2: number; frontSidedef: number | null; backSidedef: number | null } | null {
    for (const linedef of this.map.linedefs.values()) {
      if (linedef.frontSidedef === sidedefId || linedef.backSidedef === sidedefId) {
        return linedef;
      }
    }
    return null;
  }

  private addConnectedSidedefs(
    todo: AlignJob[],
    processed: Set<number>,
    vertexId: number,
    forward: boolean,
    offsetX: number
  ): void {
    const vertex = this.map.vertices.get(vertexId);
    if (!vertex) return;

    for (const linedefId of vertex.linedefs) {
      const linedef = this.map.linedefs.get(linedefId);
      if (!linedef) continue;

      // Check front sidedef
      if (linedef.frontSidedef !== null && !processed.has(linedef.frontSidedef)) {
        const sidedef = this.map.sidedefs.get(linedef.frontSidedef);
        if (sidedef && this.sidedefHasTexture(sidedef)) {
          // Determine direction based on which vertex we came from
          const isStart = linedef.v1 === vertexId;
          todo.push({
            sidedefId: linedef.frontSidedef,
            offsetX,
            forward: isStart ? forward : !forward,
          });
        }
      }

      // Check back sidedef
      if (linedef.backSidedef !== null && !processed.has(linedef.backSidedef)) {
        const sidedef = this.map.sidedefs.get(linedef.backSidedef);
        if (sidedef && this.sidedefHasTexture(sidedef)) {
          const isEnd = linedef.v2 === vertexId;
          todo.push({
            sidedefId: linedef.backSidedef,
            offsetX,
            forward: isEnd ? forward : !forward,
          });
        }
      }
    }
  }

  private sidedefHasTexture(sidedef: Sidedef): boolean {
    const upper = sidedef.upperTexture.toUpperCase();
    const middle = sidedef.middleTexture.toUpperCase();
    const lower = sidedef.lowerTexture.toUpperCase();

    return (
      (upper === this.textureName && upper !== '-' && upper !== '') ||
      (middle === this.textureName && middle !== '-' && middle !== '') ||
      (lower === this.textureName && lower !== '-' && lower !== '')
    );
  }

  undo(): void {
    for (const [sidedefId, offsets] of this.oldOffsets) {
      const sidedef = this.map.sidedefs.get(sidedefId);
      if (sidedef) {
        sidedef.offsetX = offsets.offsetX;
        sidedef.offsetY = offsets.offsetY;
      }
    }
  }

  getAlignedCount(): number {
    return this.alignedSidedefs.size;
  }
}

/**
 * Resets texture offsets to 0 for selected sidedefs
 */
export class ResetTextureOffsetsAction implements Action {
  readonly name = 'Reset Texture Offsets';
  private map: MapData;
  private sidedefIds: number[];
  private oldOffsets: Map<number, OldOffsets> = new Map();

  constructor(map: MapData, sidedefIds: number[]) {
    this.map = map;
    this.sidedefIds = sidedefIds;
  }

  execute(): void {
    for (const id of this.sidedefIds) {
      const sidedef = this.map.sidedefs.get(id);
      if (sidedef) {
        this.oldOffsets.set(id, {
          offsetX: sidedef.offsetX,
          offsetY: sidedef.offsetY,
        });
        sidedef.offsetX = 0;
        sidedef.offsetY = 0;
      }
    }
  }

  undo(): void {
    for (const [id, offsets] of this.oldOffsets) {
      const sidedef = this.map.sidedefs.get(id);
      if (sidedef) {
        sidedef.offsetX = offsets.offsetX;
        sidedef.offsetY = offsets.offsetY;
      }
    }
  }
}

/**
 * Sets texture offsets for selected sidedefs
 */
export class SetTextureOffsetAction implements Action {
  readonly name = 'Set Texture Offset';
  private map: MapData;
  private sidedefIds: number[];
  private deltaX: number;
  private deltaY: number;
  private oldOffsets: Map<number, OldOffsets> = new Map();

  constructor(map: MapData, sidedefIds: number[], deltaX: number, deltaY: number) {
    this.map = map;
    this.sidedefIds = sidedefIds;
    this.deltaX = deltaX;
    this.deltaY = deltaY;
  }

  execute(): void {
    for (const id of this.sidedefIds) {
      const sidedef = this.map.sidedefs.get(id);
      if (sidedef) {
        this.oldOffsets.set(id, {
          offsetX: sidedef.offsetX,
          offsetY: sidedef.offsetY,
        });
        sidedef.offsetX += this.deltaX;
        sidedef.offsetY += this.deltaY;
      }
    }
  }

  undo(): void {
    for (const [id, offsets] of this.oldOffsets) {
      const sidedef = this.map.sidedefs.get(id);
      if (sidedef) {
        sidedef.offsetX = offsets.offsetX;
        sidedef.offsetY = offsets.offsetY;
      }
    }
  }
}
