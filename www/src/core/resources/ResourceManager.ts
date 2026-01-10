import { resourceDB, type ResourceEntry } from './db';
import { calculateSHA256FromFile } from './hash';

export class ResourceManager {
  private initialized = false;
  private listeners: Set<() => void> = new Set();

  async init(): Promise<void> {
    if (this.initialized) return;
    await resourceDB.init();
    this.initialized = true;
  }

  async addResource(file: File): Promise<ResourceEntry> {
    if (!this.initialized) throw new Error('ResourceManager not initialized');

    // Calculate hash
    const hash = await calculateSHA256FromFile(file);

    // Check if already exists
    const existing = await resourceDB.getResource(hash);
    if (existing) {
      console.log(`Resource ${file.name} already exists with hash ${hash}`);
      return existing;
    }

    // Determine type
    const type = this.determineType(file.name);

    // Create entry
    const resource: ResourceEntry = {
      hash,
      name: file.name,
      type,
      blob: file,
      size: file.size,
      addedAt: Date.now(),
      enabled: true,
    };

    await resourceDB.addResource(resource);
    this.notify();
    return resource;
  }

  async removeResource(hash: string): Promise<void> {
    if (!this.initialized) throw new Error('ResourceManager not initialized');
    await resourceDB.deleteResource(hash);
    this.notify();
  }

  async toggleResource(hash: string, enabled: boolean): Promise<void> {
    if (!this.initialized) throw new Error('ResourceManager not initialized');
    await resourceDB.updateResource(hash, { enabled });
    this.notify();
  }

  async getResource(hash: string): Promise<ResourceEntry | null> {
    if (!this.initialized) throw new Error('ResourceManager not initialized');
    return await resourceDB.getResource(hash);
  }

  async getAllResources(): Promise<ResourceEntry[]> {
    if (!this.initialized) throw new Error('ResourceManager not initialized');
    const resources = await resourceDB.getAllResources();
    // Sort by addedAt (oldest first, matching DBX bottom-to-top priority)
    return resources.sort((a, b) => a.addedAt - b.addedAt);
  }

  async getEnabledResources(): Promise<ResourceEntry[]> {
    const all = await this.getAllResources();
    return all.filter((r) => r.enabled);
  }

  async getTotalSize(): Promise<number> {
    if (!this.initialized) throw new Error('ResourceManager not initialized');
    return await resourceDB.getTotalSize();
  }

  async clearAll(): Promise<void> {
    if (!this.initialized) throw new Error('ResourceManager not initialized');
    await resourceDB.clearAll();
    this.notify();
  }

  // Subscribe to changes
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    for (const listener of this.listeners) {
      listener();
    }
  }

  private determineType(filename: string): 'wad' | 'pk3' | 'dir' {
    const ext = filename.toLowerCase().split('.').pop();
    if (ext === 'wad') return 'wad';
    if (ext === 'pk3' || ext === 'zip') return 'pk3';
    return 'dir';
  }
}

// Singleton instance
export const resourceManager = new ResourceManager();
