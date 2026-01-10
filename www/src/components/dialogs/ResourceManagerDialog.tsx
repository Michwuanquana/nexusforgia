import { useEffect, useState, useRef } from 'react';
import { resourceManager } from '../../core/resources/ResourceManager';
import type { ResourceEntry } from '../../core/resources/db';
import { useEscapeKey } from '../../hooks/useEscapeKey';

interface ResourceManagerDialogProps {
  open: boolean;
  onClose: () => void;
}

export function ResourceManagerDialog({ open, onClose }: ResourceManagerDialogProps) {
  const [resources, setResources] = useState<ResourceEntry[]>([]);
  const [totalSize, setTotalSize] = useState(0);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Close on Escape
  useEscapeKey(onClose, open);

  useEffect(() => {
    if (!open) return;

    loadResources();

    const unsubscribe = resourceManager.subscribe(() => {
      loadResources();
    });

    return unsubscribe;
  }, [open]);

  const loadResources = async () => {
    const all = await resourceManager.getAllResources();
    const size = await resourceManager.getTotalSize();
    setResources(all);
    setTotalSize(size);
  };

  const handleAddFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setLoading(true);
    try {
      for (let i = 0; i < files.length; i++) {
        await resourceManager.addResource(files[i]);
      }
    } catch (error) {
      console.error('Failed to add resource:', error);
      alert(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleToggle = async (hash: string, enabled: boolean) => {
    await resourceManager.toggleResource(hash, !enabled);
  };

  const handleDelete = async (hash: string, name: string) => {
    if (!confirm(`Delete resource "${name}"?`)) return;
    await resourceManager.removeResource(hash);
  };

  const handleClearAll = async () => {
    if (!confirm('Delete ALL resources? This cannot be undone!')) return;
    await resourceManager.clearAll();
  };

  const formatSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-[#2a2a3e] border border-[#444] rounded-lg shadow-xl max-w-4xl w-full max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#444]">
          <h2 className="text-lg font-semibold text-white">Resource Manager</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4">
          {/* Stats */}
          <div className="mb-4 p-3 bg-[#1e1e2e] rounded border border-[#444]">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Total Resources:</span>
              <span className="text-white font-mono">{resources.length}</span>
            </div>
            <div className="flex justify-between text-sm mt-1">
              <span className="text-gray-400">Storage Used:</span>
              <span className="text-white font-mono">{formatSize(totalSize)}</span>
            </div>
          </div>

          {/* Resource List */}
          <div className="border border-[#444] rounded overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-[#1e1e2e] text-gray-300">
                <tr>
                  <th className="text-left p-2 w-12">Enable</th>
                  <th className="text-left p-2">Name</th>
                  <th className="text-left p-2 w-20">Type</th>
                  <th className="text-left p-2 w-24">Size</th>
                  <th className="text-left p-2 w-20">Actions</th>
                </tr>
              </thead>
              <tbody>
                {resources.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center p-8 text-gray-500">
                      No resources loaded. Add WAD or PK3 files to get started.
                    </td>
                  </tr>
                ) : (
                  resources.map((resource) => (
                    <tr key={resource.hash} className="border-t border-[#444] hover:bg-[#1e1e2e]">
                      <td className="p-2 text-center">
                        <input
                          type="checkbox"
                          checked={resource.enabled}
                          onChange={() => handleToggle(resource.hash, resource.enabled)}
                          className="cursor-pointer"
                        />
                      </td>
                      <td className="p-2 text-white font-mono text-xs truncate max-w-xs" title={resource.name}>
                        {resource.name}
                      </td>
                      <td className="p-2 text-gray-400 uppercase">{resource.type}</td>
                      <td className="p-2 text-gray-400 font-mono text-xs">{formatSize(resource.size)}</td>
                      <td className="p-2">
                        <button
                          onClick={() => handleDelete(resource.hash, resource.name)}
                          className="text-red-400 hover:text-red-300 text-xs px-2 py-1"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-[#444]">
          <div className="flex gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".wad,.pk3,.zip"
              multiple
              onChange={handleAddFile}
              className="hidden"
              id="resource-file-input"
            />
            <label
              htmlFor="resource-file-input"
              className={`px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded cursor-pointer transition-colors ${
                loading ? 'opacity-50 cursor-wait' : ''
              }`}
            >
              {loading ? 'Loading...' : 'Add Files'}
            </label>
            <button
              onClick={handleClearAll}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded transition-colors"
              disabled={resources.length === 0}
            >
              Clear All
            </button>
          </div>
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
