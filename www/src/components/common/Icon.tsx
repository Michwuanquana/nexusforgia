// Map of old PNG icon names to Material Symbols names
const iconMap: Record<string, string> = {
  // File operations
  Close: 'close',
  Copy: 'content_copy',
  Cut: 'content_cut',
  Paste: 'content_paste',
  Undo: 'undo',
  Redo: 'redo',
  Find: 'search',
  Filter: 'filter_list',
  Folder: 'folder',
  Help: 'help',
  Zoom: 'zoom_in',
  Properties: 'settings',
  Grid: 'grid_on',
  Grid2: 'grid_4x4',
  SaveMap: 'save',
  SaveAll: 'save_all',
  OpenMap: 'folder_open',
  NewMap: 'add',
  NewMap2: 'note_add',
  Pencil: 'edit',
  Selection: 'select_all',
  Test: 'play_arrow',

  // Edit modes
  VerticesMode: 'scatter_plot',
  LinesMode: 'polyline',
  SectorsMode: 'dashboard',
  ThingsMode: 'category',

  // View modes
  ViewNormal: 'visibility',
  ViewBrightness: 'brightness_6',
  ViewTextureFloor: 'layers',
  ViewTextureCeiling: 'flip_to_front',

  // Transform operations
  FlipSelectionH: 'flip',
  FlipSelectionV: 'swap_vert',
  CurveLines: 'gesture',
  mergegeometry: 'merge',
};

interface IconProps {
  name: string;
  size?: number;
  className?: string;
  title?: string;
}

export function Icon({ name, size = 16, className = '', title }: IconProps) {
  const materialName = iconMap[name] || name;

  return (
    <span
      className={`material-symbols-outlined ${className}`}
      style={{
        fontSize: size,
        width: size,
        height: size,
        lineHeight: `${size}px`,
      }}
      title={title}
      aria-label={title || name}
    >
      {materialName}
    </span>
  );
}
