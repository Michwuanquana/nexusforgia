import { useState } from 'react';
import { useTextureStore } from '../../store/textureStore';
import { TextureBrowserDialog } from '../dialogs/TextureBrowserDialog';

interface TextureSelectorProps {
  value: string;
  type: 'flat' | 'texture';
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
}

export function TextureSelector({
  value,
  type,
  onChange,
  label,
  placeholder = 'Mixed',
}: TextureSelectorProps) {
  const [showBrowser, setShowBrowser] = useState(false);
  const { getFlat, getTexture } = useTextureStore();

  const texture = type === 'flat' ? getFlat(value) : getTexture(value);
  const thumbnailUrl = texture?.thumbnailUrl;

  const handlePreviewClick = () => {
    setShowBrowser(true);
  };

  const handleRightClick = (e: React.MouseEvent) => {
    e.preventDefault();
    onChange('-');
  };

  const handleSelect = (textureName: string) => {
    onChange(textureName);
    setShowBrowser(false);
  };

  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label className="text-sm text-gray-400">{label}</label>
      )}
      <div className="flex gap-2">
        {/* Preview box */}
        <div
          onClick={handlePreviewClick}
          onContextMenu={handleRightClick}
          className="w-16 h-16 bg-[#1a1a2e] border border-[#444] rounded cursor-pointer hover:border-blue-500 transition-colors flex items-center justify-center overflow-hidden"
          title={value ? `${value} (Click to browse, Right-click to clear)` : 'Click to browse textures'}
        >
          {thumbnailUrl ? (
            <img
              src={thumbnailUrl}
              alt={value}
              className="max-w-full max-h-full object-contain"
              style={{ imageRendering: 'pixelated' }}
            />
          ) : value && value !== '-' ? (
            <span className="text-xs text-gray-500 text-center px-1">{value}</span>
          ) : (
            <span className="text-2xl text-gray-600">-</span>
          )}
        </div>

        {/* Text input */}
        <div className="flex-1">
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value.toUpperCase())}
            placeholder={placeholder}
            className="w-full px-3 py-2 bg-[#1e1e2e] border border-[#444] rounded text-white font-mono text-sm focus:outline-none focus:border-blue-500"
          />
          <div className="text-xs text-gray-500 mt-1">
            {texture && `${texture.width}x${texture.height}`}
          </div>
        </div>
      </div>

      {/* Browser dialog */}
      <TextureBrowserDialog
        open={showBrowser}
        type={type}
        currentTexture={value}
        onSelect={handleSelect}
        onCancel={() => setShowBrowser(false)}
      />
    </div>
  );
}
