// IndexedDB wrapper for WAD resources
const DB_NAME = 'UDMFEditor';
const DB_VERSION = 1;
const STORE_RESOURCES = 'resources';

export interface ResourceEntry {
  hash: string; // SHA-256 checksum
  name: string; // Original filename
  type: 'wad' | 'pk3' | 'dir';
  blob: Blob; // Binary data
  size: number; // File size in bytes
  addedAt: number; // Timestamp
  enabled: boolean; // Toggle on/off
}

class ResourceDB {
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create resources store
        if (!db.objectStoreNames.contains(STORE_RESOURCES)) {
          const store = db.createObjectStore(STORE_RESOURCES, { keyPath: 'hash' });
          store.createIndex('name', 'name', { unique: false });
          store.createIndex('addedAt', 'addedAt', { unique: false });
        }
      };
    });
  }

  async addResource(resource: ResourceEntry): Promise<void> {
    if (!this.db) throw new Error('DB not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_RESOURCES], 'readwrite');
      const store = transaction.objectStore(STORE_RESOURCES);
      const request = store.put(resource);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getResource(hash: string): Promise<ResourceEntry | null> {
    if (!this.db) throw new Error('DB not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_RESOURCES], 'readonly');
      const store = transaction.objectStore(STORE_RESOURCES);
      const request = store.get(hash);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  async getAllResources(): Promise<ResourceEntry[]> {
    if (!this.db) throw new Error('DB not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_RESOURCES], 'readonly');
      const store = transaction.objectStore(STORE_RESOURCES);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async deleteResource(hash: string): Promise<void> {
    if (!this.db) throw new Error('DB not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_RESOURCES], 'readwrite');
      const store = transaction.objectStore(STORE_RESOURCES);
      const request = store.delete(hash);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async updateResource(hash: string, updates: Partial<ResourceEntry>): Promise<void> {
    const resource = await this.getResource(hash);
    if (!resource) throw new Error('Resource not found');

    const updated = { ...resource, ...updates };
    await this.addResource(updated);
  }

  async clearAll(): Promise<void> {
    if (!this.db) throw new Error('DB not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_RESOURCES], 'readwrite');
      const store = transaction.objectStore(STORE_RESOURCES);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getTotalSize(): Promise<number> {
    const resources = await this.getAllResources();
    return resources.reduce((total, r) => total + r.size, 0);
  }
}

// Singleton instance
export const resourceDB = new ResourceDB();
