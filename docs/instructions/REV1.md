# REV1 - First Review Fixes

## 1. Things zoom scaling fix

**Problem:** Things (entities) don't scale properly when zooming the map view.

**Current behavior:**
- `ThingLayer.ts:35` calculates `baseRadius = Math.max(8, 16 / camera.zoom)`
- This shrinks things when zooming IN (dividing by larger zoom)
- When zooming OUT, radius is capped at 8px regardless of zoom level
- Thing's actual `width` property from `thingTypes.ts` is ignored

**Required behavior:**
- Things should maintain their visual representation relative to the map when zooming
- Thing display size should respect the `width` property from `thingTypes.ts` (e.g., Spider Mastermind = 128, Imp = 20)
- At zoom 1.0, things should display at their actual game size
- When zooming out, things should shrink proportionally with the map

**Implementation:**
1. Look up thing type using `getThingType(thing.type)` from `thingTypes.ts`
2. Use `thingType.width` as the base radius (or default to 16 if unknown type)
3. The radius should scale naturally with the camera transform (not inversely)
4. Remove the `Math.max(8, 16 / camera.zoom)` logic

**Files to modify:**
- `www/src/renderer/layers/ThingLayer.ts`

## 2. Replace icons with Material Icons

**Problem:** Current icons are from Doom Builder X. Need independent icon set.

**Solution:** Use Google Material Icons (Apache 2.0 license - compatible with GPL-3.0)

**Implementation approach:**
1. Install `@mui/icons-material` package OR use Material Symbols font
2. Update `Icon.tsx` component to render Material Icons instead of PNG
3. Delete `/www/public/icons/` folder

**Icon mapping:**

| Current PNG | Material Icon | Notes |
|-------------|---------------|-------|
| Close | `close` | |
| Copy | `content_copy` | |
| Cut | `content_cut` | |
| Paste | `content_paste` | |
| Undo | `undo` | |
| Redo | `redo` | |
| Find | `search` | |
| Filter | `filter_list` | |
| Folder | `folder` | |
| Help | `help` | |
| Zoom | `zoom_in` | |
| Properties | `settings` | |
| Grid | `grid_on` | |
| Grid2 | `grid_4x4` | |
| SaveMap | `save` | |
| SaveAll | `save_all` | |
| OpenMap | `folder_open` | |
| NewMap | `add` | |
| NewMap2 | `note_add` | |
| Pencil | `edit` | |
| Selection | `select_all` | |
| Test | `play_arrow` | |
| VerticesMode | `scatter_plot` | vertex editing |
| LinesMode | `polyline` | line editing |
| SectorsMode | `dashboard` | sector editing |
| ThingsMode | `category` | entity editing |
| ViewNormal | `visibility` | |
| ViewBrightness | `brightness_6` | |
| ViewTextureFloor | `layers` | floor texture view |
| ViewTextureCeiling | `flip_to_front` | ceiling texture view |
| FlipSelectionH | `flip` | |
| FlipSelectionV | `swap_vert` | |
| CurveLines | `gesture` | |
| mergegeometry | `merge` | |

**Files to modify:**
- `www/package.json` - add Material Icons dependency
- `www/src/components/common/Icon.tsx` - rewrite to use Material Icons
- `www/src/components/common/IconButton.tsx` - update if needed
- Delete `www/public/icons/` folder

## 3. Fix floor/ceiling texture (FLAT) mapping

**Problem:** Sector floor/ceiling textures don't map correctly. Doom uses planar world-space UV mapping.

**Current behavior (SectorLayer.ts:331-339):**
```typescript
const matrix = new PIXI.Matrix();
matrix.scale(1, 1); // Does nothing useful
this.graphics.fill({ texture, matrix, alpha: 0.8 });
```

**Required behavior (Doom FLAT mapping rules):**
- FLATs are always 64x64 pixels
- UV mapping is **planar** and aligned to **world coordinates**
- Texture pixel [0,0] maps to world coordinate [0,0]
- A 64x64 sector aligned to grid perfectly fills one FLAT texture
- Texture repeats/tiles across larger sectors

**Implementation:**
```typescript
const matrix = new PIXI.Matrix();
// FLATs are 64x64, map 1 texture pixel = 1 world unit
// Translate so texture origin aligns with world origin (0,0)
// PIXI fills use texture coords, so we need inverse transform
matrix.scale(1/64, 1/64);  // 64 world units = 1 texture repeat
// No translation needed - world (0,0) = texture (0,0)
```

**Note:** Y-axis may need flipping depending on coordinate system orientation.

**Files to modify:**
- `www/src/renderer/layers/SectorLayer.ts`

## 4. Reduce linedef line weight

**Problem:** Linedefs appear too thick/bold in the editor.

**Current behavior (LinedefLayer.ts:32):**
```typescript
const baseWidth = Math.max(1, 2 / camera.zoom);
```
- Base width is 2px at zoom 1.0
- Selected lines are 1.5x thicker (3px)
- Highlighted lines are 2x thicker (4px)

**Required behavior:**
- Thinner, lighter lines for a cleaner look
- Base width 1px at zoom 1.0
- Keep relative scaling for selected/highlighted

**Implementation:**
```typescript
const baseWidth = Math.max(0.5, 1 / camera.zoom);
```

**Files to modify:**
- `www/src/renderer/layers/LinedefLayer.ts`

## 5. Replace internal domains with production domains

**Problem:** Documentation and config files contain internal `*.yrx.cz` domains instead of production `*.nexumforgia.org`.

**Files to update:**

| File | Change |
|------|--------|
| `Makefile` | `udmf.yrx.cz` → `dev.nexumforgia.org`, `api-udmf.yrx.cz` → `api.nexumforgia.org` |
| `docs/PROGRESS.md` | Update all `*.yrx.cz` references |
| `docs/MEMORY.md` | `cdn.udmf.yrx.cz` → `cdn.nexumforgia.org`, `api-udmf.yrx.cz` → `api.nexumforgia.org`, `textures.udmf.yrx.cz` → `textures.nexumforgia.org` |
| `docker-compose.yml` | Update Traefik router rules |
| `www/src/components/dialogs/AboutDialog.tsx` | `api-udmf.yrx.cz` → `api.nexumforgia.org` |

**Domain mapping:**
- `udmf.yrx.cz` → `dev.nexumforgia.org` (or just `nexumforgia.org`)
- `api-udmf.yrx.cz` → `api.nexumforgia.org`
- `cdn.udmf.yrx.cz` → `cdn.nexumforgia.org`
- `textures.udmf.yrx.cz` → `textures.nexumforgia.org`

## 6. Clean up PROGRESS.md

**Problem:** Contains personal note that shouldn't be in public repo.

**Line 123:**
```
**Evening update (late night with kratom 😄):**
```

**Action:** Remove or replace with neutral text like `**Evening update:**`
