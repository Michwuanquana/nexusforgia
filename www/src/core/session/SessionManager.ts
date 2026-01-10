// Session Manager - Handles project state save/load
import { resourceManager } from '../resources/ResourceManager';

export interface EditorSession {
  version: number;
  mapName: string;
  camera: {
    x: number;
    y: number;
    zoom: number;
  };
  resources: {
    hash: string;
    fileName: string;
    enabled: boolean;
  }[];
  editMode?: string;
  gridSize?: number;
  showGrid?: boolean;
}

export interface RecentSession {
  name: string;
  timestamp: number;
  session: EditorSession;
}

const CURRENT_VERSION = 1;
const STORAGE_KEY_RECENT = 'udmf-recent-sessions';
const MAX_RECENT_SESSIONS = 10;

export class SessionManager {
  /**
   * Create a session from current editor state
   */
  createSession(
    mapName: string,
    camera: { x: number; y: number; zoom: number },
    editMode?: string,
    gridSize?: number,
    showGrid?: boolean
  ): EditorSession {
    return {
      version: CURRENT_VERSION,
      mapName,
      camera,
      resources: [], // Will be populated when resources are loaded
      editMode,
      gridSize,
      showGrid,
    };
  }

  /**
   * Populate session with current resource state
   */
  async prepareSession(session: EditorSession): Promise<EditorSession> {
    const enabledResources = await resourceManager.getEnabledResources();
    session.resources = enabledResources.map((r) => ({
      hash: r.hash,
      fileName: r.name,
      enabled: r.enabled,
    }));
    return session;
  }

  /**
   * Export session to JSON file download
   */
  async exportSession(session: EditorSession, filename?: string): Promise<void> {
    // Add current resources
    await this.prepareSession(session);

    const json = JSON.stringify(session, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = filename || `${session.mapName || 'session'}.udmf-session`;
    a.click();

    URL.revokeObjectURL(url);
  }

  /**
   * Import session from JSON file
   * Verifies that all required resources are available in ResourceManager
   */
  async importSession(file: File): Promise<{
    session: EditorSession;
    missingResources: { hash: string; fileName: string }[];
  }> {
    const text = await file.text();
    const session: EditorSession = JSON.parse(text);

    // Verify version
    if (session.version !== CURRENT_VERSION) {
      console.warn(`Session version ${session.version} differs from current ${CURRENT_VERSION}`);
    }

    // Check which resources are missing
    const missingResources: { hash: string; fileName: string }[] = [];

    for (const res of session.resources) {
      const existing = await resourceManager.getResource(res.hash);
      if (!existing) {
        missingResources.push({
          hash: res.hash,
          fileName: res.fileName,
        });
      }
    }

    return { session, missingResources };
  }

  /**
   * Apply session to current editor state
   * Returns list of resources that should be enabled
   */
  async applySession(session: EditorSession): Promise<void> {
    // Enable/disable resources according to session
    for (const res of session.resources) {
      const existing = await resourceManager.getResource(res.hash);
      if (existing && existing.enabled !== res.enabled) {
        await resourceManager.toggleResource(res.hash, res.enabled);
      }
    }
  }

  /**
   * Save session to recent sessions list
   */
  saveToRecent(name: string, session: EditorSession): void {
    const recent = this.getRecentSessions();

    // Remove existing session with same name
    const filtered = recent.filter((s) => s.name !== name);

    // Add new session at the beginning
    filtered.unshift({
      name,
      timestamp: Date.now(),
      session,
    });

    // Keep only MAX_RECENT_SESSIONS
    const trimmed = filtered.slice(0, MAX_RECENT_SESSIONS);

    localStorage.setItem(STORAGE_KEY_RECENT, JSON.stringify(trimmed));
  }

  /**
   * Get list of recent sessions
   */
  getRecentSessions(): RecentSession[] {
    const json = localStorage.getItem(STORAGE_KEY_RECENT);
    if (!json) return [];

    try {
      return JSON.parse(json);
    } catch (e) {
      console.error('Failed to parse recent sessions:', e);
      return [];
    }
  }

  /**
   * Remove session from recent list
   */
  removeFromRecent(name: string): void {
    const recent = this.getRecentSessions();
    const filtered = recent.filter((s) => s.name !== name);
    localStorage.setItem(STORAGE_KEY_RECENT, JSON.stringify(filtered));
  }

  /**
   * Clear all recent sessions
   */
  clearRecent(): void {
    localStorage.removeItem(STORAGE_KEY_RECENT);
  }
}

// Singleton instance
export const sessionManager = new SessionManager();
