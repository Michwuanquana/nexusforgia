import { useEffect, useState, useRef } from 'react';
import { sessionManager, type RecentSession, type EditorSession } from '../../core/session/SessionManager';
import { useEscapeKey } from '../../hooks/useEscapeKey';

interface SessionManagerDialogProps {
  open: boolean;
  onClose: () => void;
  onLoadSession?: (session: EditorSession) => void;
  getCurrentSession?: () => EditorSession;
  isDirty?: boolean;
}

export function SessionManagerDialog({
  open,
  onClose,
  onLoadSession,
  getCurrentSession,
  isDirty,
}: SessionManagerDialogProps) {
  const [recentSessions, setRecentSessions] = useState<RecentSession[]>([]);
  const [sessionName, setSessionName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Close on Escape
  useEscapeKey(onClose, open);

  useEffect(() => {
    if (open) {
      loadRecentSessions();
    }
  }, [open]);

  const loadRecentSessions = () => {
    const recent = sessionManager.getRecentSessions();
    setRecentSessions(recent);
  };

  const handleExport = () => {
    if (!getCurrentSession) {
      alert('Export not available');
      return;
    }

    const session = getCurrentSession();
    const name = sessionName.trim() || session.mapName || 'session';

    // Save to recent list
    sessionManager.saveToRecent(name, session);

    // Export to file
    sessionManager.exportSession(session, `${name}.udmf-session`);

    setSessionName('');
    loadRecentSessions();
  };

  const handleSaveOnly = async () => {
    if (!getCurrentSession) return;
    let session = getCurrentSession();
    const name = sessionName.trim() || session.mapName || 'session';
    
    // Add resources
    session = await sessionManager.prepareSession(session);
    
    sessionManager.saveToRecent(name, session);
    setSessionName('');
    loadRecentSessions();
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const { session, missingResources } = await sessionManager.importSession(file);

      if (missingResources.length > 0) {
        const list = missingResources.map((r) => `- ${r.fileName} (${r.hash.slice(0, 8)}...)`).join('\n');
        const proceed = confirm(
          `The following resources are missing:\n\n${list}\n\nYou'll need to add them to Resource Manager before using this session. Continue anyway?`
        );

        if (!proceed) {
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
          return;
        }
      }

      // Save to recent
      const name = file.name.replace(/\.udmf-session$/, '').replace(/\.json$/, '');
      sessionManager.saveToRecent(name, session);

      // Load session
      if (onLoadSession) {
        await sessionManager.applySession(session);
        onLoadSession(session);
      }

      loadRecentSessions();
      onClose();
    } catch (error) {
      console.error('Failed to import session:', error);
      alert(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleLoadRecent = async (recent: RecentSession) => {
    try {
      const { session, missingResources } = await sessionManager.importSession(
        new File([JSON.stringify(recent.session)], `${recent.name}.json`, { type: 'application/json' })
      );

      if (missingResources.length > 0) {
        const list = missingResources.map((r) => `- ${r.fileName} (${r.hash.slice(0, 8)}...)`).join('\n');
        alert(`Missing resources:\n\n${list}\n\nPlease add them in Resource Manager first.`);
        return;
      }

      if (onLoadSession) {
        await sessionManager.applySession(session);
        onLoadSession(session);
      }

      onClose();
    } catch (error) {
      console.error('Failed to load session:', error);
      alert(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleDeleteRecent = (name: string) => {
    if (!confirm(`Delete session "${name}"?`)) return;
    sessionManager.removeFromRecent(name);
    loadRecentSessions();
  };

  const handleClearAll = () => {
    if (!confirm('Delete all recent sessions?')) return;
    sessionManager.clearRecent();
    loadRecentSessions();
  };

  const formatTimestamp = (timestamp: number): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    // Less than a day
    if (diff < 24 * 60 * 60 * 1000) {
      return date.toLocaleTimeString();
    }

    // Less than a week
    if (diff < 7 * 24 * 60 * 60 * 1000) {
      const days = Math.floor(diff / (24 * 60 * 60 * 1000));
      return `${days} day${days > 1 ? 's' : ''} ago`;
    }

    return date.toLocaleDateString();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-[#2a2a3e] border border-[#444] rounded-lg shadow-xl max-w-3xl w-full max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#444]">
          <h2 className="text-lg font-semibold text-white">Session Manager</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4">
          {/* Current Session Info */}
          {getCurrentSession && (
            <div className={`mb-6 p-4 bg-[#1e1e2e] rounded border ${isDirty ? 'border-yellow-500/40' : 'border-blue-500/30'}`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <h3 className="text-white font-semibold">Current Session</h3>
                  {isDirty && (
                    <span className="text-[10px] px-1.5 py-0.5 bg-yellow-500/20 text-yellow-500 rounded border border-yellow-500/30 uppercase tracking-wider">
                      Unsaved Changes
                    </span>
                  )}
                </div>
                <span className="text-xs px-2 py-1 bg-blue-500/20 text-blue-400 rounded ring-1 ring-blue-500/30">
                  Active
                </span>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm text-gray-400 mb-4">
                <div>
                  <span className="block text-xs uppercase tracking-wider text-gray-500 mb-1">Map Name</span>
                  <span className="text-white font-mono">{getCurrentSession().mapName || 'untitled'}</span>
                </div>
                <div>
                  <span className="block text-xs uppercase tracking-wider text-gray-500 mb-1">Edit Mode</span>
                  <span className="text-white">{getCurrentSession().editMode}</span>
                </div>
                <div>
                  <span className="block text-xs uppercase tracking-wider text-gray-500 mb-1">Grid Size</span>
                  <span className="text-white">{getCurrentSession().gridSize}</span>
                </div>
                <div>
                  <span className="block text-xs uppercase tracking-wider text-gray-500 mb-1">Camera Zoom</span>
                  <span className="text-white">{(getCurrentSession().camera.zoom * 100).toFixed(0)}%</span>
                </div>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={sessionName}
                  onChange={(e) => setSessionName(e.target.value)}
                  placeholder="Session name (optional)"
                  className="flex-1 px-3 py-2 bg-[#2a2a3e] border border-[#444] rounded text-white text-sm"
                />
                <button
                  onClick={handleSaveOnly}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors text-sm"
                >
                  Save to Recent
                </button>
                <button
                  onClick={handleExport}
                  className="px-4 py-2 bg-[#333] hover:bg-[#444] text-white rounded transition-colors text-sm"
                >
                  Export to File
                </button>
              </div>
            </div>
          )}

          {/* Import Section */}
          <div className="mb-6 p-4 bg-[#1e1e2e] rounded border border-[#444]">
            <h3 className="text-white font-semibold mb-3">Import Session</h3>
            <input
              ref={fileInputRef}
              type="file"
              accept=".udmf-session,.json"
              onChange={handleImport}
              className="hidden"
              id="session-file-input"
            />
            <label
              htmlFor="session-file-input"
              className="inline-block px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded cursor-pointer transition-colors"
            >
              Import from File
            </label>
          </div>

          {/* Recent Sessions */}
          <div className="border border-[#444] rounded overflow-hidden">
            <div className="bg-[#1e1e2e] p-3 flex items-center justify-between border-b border-[#444]">
              <h3 className="text-white font-semibold">Recent Sessions</h3>
              {recentSessions.length > 0 && (
                <button
                  onClick={handleClearAll}
                  className="text-xs text-red-400 hover:text-red-300"
                >
                  Clear All
                </button>
              )}
            </div>
            <div className="bg-[#2a2a3e]">
              {recentSessions.length === 0 ? (
                <div className="text-center p-8 text-gray-500">
                  No recent sessions. Export a session to get started.
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-[#1e1e2e] text-gray-300">
                    <tr>
                      <th className="text-left p-2">Name</th>
                      <th className="text-left p-2 w-32">Map</th>
                      <th className="text-left p-2 w-32">Resources</th>
                      <th className="text-left p-2 w-40">Last Modified</th>
                      <th className="text-left p-2 w-32">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentSessions.map((recent) => (
                      <tr key={recent.name} className="border-t border-[#444] hover:bg-[#1e1e2e]">
                        <td className="p-2 text-white font-mono text-xs truncate max-w-xs" title={recent.name}>
                          {recent.name}
                        </td>
                        <td className="p-2 text-gray-400 text-xs">{recent.session.mapName || 'N/A'}</td>
                        <td className="p-2 text-gray-400 text-xs">{recent.session.resources.length}</td>
                        <td className="p-2 text-gray-400 text-xs">{formatTimestamp(recent.timestamp)}</td>
                        <td className="p-2 flex gap-1">
                          <button
                            onClick={() => handleLoadRecent(recent)}
                            className="text-green-400 hover:text-green-300 text-xs px-2 py-1"
                          >
                            Load
                          </button>
                          <button
                            onClick={() => handleDeleteRecent(recent.name)}
                            className="text-red-400 hover:text-red-300 text-xs px-2 py-1"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end p-4 border-t border-[#444]">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
