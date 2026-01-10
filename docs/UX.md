# UI/UX Porovnání: Doom Builder X vs Web Editor

## Filosofie přístupu

### Doom Builder X (Desktop)
DBX je plnohodnotný desktop editor s přístupem k souborovému systému, vlastnímu rendereru (SlimDX/Direct3D), neomezeným systémovým prostředkům a nativním dialogům. Aplikace předpokládá, že uživatel má lokální kopie WAD/PK3 souborů a pracuje v dlouhodobých sezeních.

### Web Editor (Browser)
Webová verze běží v sandboxovaném prostředí s omezeními:
- **Paměť**: Omezená velikost heap, velké WAD soubory (100+ MB) mohou způsobit problémy
- **Souborový systém**: File System Access API není univerzálně podporováno; spoléháme na IndexedDB
- **Rendering**: WebGL/WebGPU vs Direct3D - méně kontroly nad GPU
- **Perzistence**: Session může být ztracena při zavření tabu bez explicitního uložení

Tyto rozdíly vyžadují odlišný přístup k návrhu UI/UX.

---

## Texture Browser

### DBX Implementace
```
┌─────────────────────────────────────────────────┐
│ Browse Textures                          [X]    │
├─────────────────┬───────────────────────────────┤
│ Texture Sets    │ ┌───┐ ┌───┐ ┌───┐ ┌───┐      │
│ ───────────────│ │   │ │   │ │   │ │   │      │
│ > All      (542)│ │TEX│ │TEX│ │TEX│ │TEX│      │
│   Doom     (256)│ │ 1 │ │ 2 │ │ 3 │ │ 4 │      │
│   Doom2    (286)│ └───┘ └───┘ └───┘ └───┘      │
│ ───────────────│                               │
│ > Used          │ [Search: ________]           │
│ > Available     │                               │
├─────────────────┴───────────────────────────────┤
│ Select or enter texture name: [STARTAN2    ]    │
│                        [Cancel]  [OK]           │
└─────────────────────────────────────────────────┘
```

**Klíčové funkce:**
- Kategorizace podle texture sets (definováno v game config)
- Skupiny "Used in Map" vs "Available"
- Grid s náhledy textur (lazy loading)
- Textové vyhledávání
- Pamatuje poslední vybraný set

### Webová Adaptace

**Omezení prohlížeče:**
- Textury musí být extrahovány z WAD a dekódovány do Canvas/WebGL textur
- Doom paleta (PLAYPAL) musí být aplikována při dekódování
- Velký počet textur = vysoká spotřeba paměti

**Navrhované řešení:**
```
┌─────────────────────────────────────────────────┐
│ Texture Browser                          [X]    │
├─────────────────────────────────────────────────┤
│ [Search...                              ] [x]   │
├─────────────────────────────────────────────────┤
│ Category: [All Textures    ▼]                   │
├─────────────────────────────────────────────────┤
│ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐    │
│ │        │ │        │ │        │ │        │    │
│ │  IMG   │ │  IMG   │ │  IMG   │ │  IMG   │    │
│ │        │ │        │ │        │ │        │    │
│ ├────────┤ ├────────┤ ├────────┤ ├────────┤    │
│ │STARTAN │ │STARTAN2│ │STARTAN3│ │STARG1  │    │
│ └────────┘ └────────┘ └────────┘ └────────┘    │
│ (virtuální scrolling - renderuje jen viditelné) │
├─────────────────────────────────────────────────┤
│ Selected: STARTAN2  [64x128]                    │
│                        [Cancel]  [Select]       │
└─────────────────────────────────────────────────┘
```

**Optimalizace pro web:**
1. **Virtuální scrolling** - renderovat jen viditelné textury (react-window)
2. **Lazy decoding** - dekódovat textury až při zobrazení
3. **Thumbnail cache** - ukládat zmenšené náhledy do IndexedDB
4. **Web Workers** - dekódování textur v background threadu

---

## Image Selector (Inline Preview)

### DBX Implementace
V dialogu sektorů/linedefs je malý preview box s texturou:
- Klik levým = otevře Texture Browser
- Klik pravým = vymaže (nastaví "-")
- Pod preview je text input pro ruční zadání

### Webová Adaptace
Identická funkčnost, ale:
- Obrázek z canvas místo GDI+
- Fallback na placeholder pokud textura není načtena

```tsx
// Komponenta TextureSelector
<div className="texture-selector">
  <div
    className="preview"
    onClick={openBrowser}
    onContextMenu={clearTexture}
  >
    {texture ? <img src={textureUrl} /> : <span>-</span>}
  </div>
  <input
    type="text"
    value={textureName}
    onChange={handleManualInput}
  />
</div>
```

---

## Sector Edit Dialog

### DBX vs Web Porovnání

| Funkce | DBX | Web | Poznámka |
|--------|-----|-----|----------|
| Floor/Ceiling Height | NumericUpDown | `<input type="number">` | Ekvivalent |
| Brightness | StepValues slider | Range + number | Předdefinované kroky (128, 160, 192...) |
| Floor Texture | ImageSelector + Browser | Canvas preview + modal | Viz Texture Browser |
| Ceiling Texture | ImageSelector + Browser | Canvas preview + modal | Viz Texture Browser |
| Effect | Dropdown + Browser | Select + search modal | Effect Browser potřeba |
| Tag | NumericUpDown + "New Tag" | Input + auto-suggest | |
| Custom Fields | DataGridView | Dynamic form | UDMF podpora |
| Multi-select | Indeterminate state | Mixed value indicator | Důležité! |

### Multi-select Handling

**DBX přístup:**
- Prázdné pole = různé hodnoty mezi vybranými sektory
- Hodnota se aplikuje jen pokud uživatel něco zadá
- Checkboxy mají třetí stav (indeterminate)

**Webová implementace:**
```tsx
// Příklad pro floor height
const floorHeights = sectors.map(s => s.floorHeight);
const allSame = floorHeights.every(h => h === floorHeights[0]);

<input
  type="number"
  value={allSame ? floorHeights[0] : ''}
  placeholder={allSame ? '' : 'Mixed'}
  onChange={(e) => {
    if (e.target.value !== '') {
      applyToAllSelected('floorHeight', parseInt(e.target.value));
    }
  }}
/>
```

---

## Klávesové Zkratky

### Srovnání

| Akce | DBX | Web | Status |
|------|-----|-----|--------|
| Vertex Mode | V | V | ✅ |
| Linedef Mode | L | L | ✅ |
| Sector Mode | S | S | ✅ |
| Thing Mode | T | T | ✅ |
| Draw Mode | Insert / D | RMB | ✅ |
| Undo | Ctrl+Z | Ctrl+Z | ✅ |
| Redo | Ctrl+Y | Ctrl+Y | ✅ |
| Save | Ctrl+S | Ctrl+S | ✅ |
| Export WAD | Ctrl+Shift+S | Ctrl+Shift+S | ✅ |
| Copy | Ctrl+C | Ctrl+C | ✅ |
| Cut | Ctrl+X | Ctrl+X | ✅ |
| Paste | Ctrl+V | Ctrl+V | ✅ |
| Toggle Grid | G | G | ✅ |
| Fit to Map | Home | Home | ✅ |
| Flip Linedef | F | F | ✅ |
| Merge Vertices | Shift+M | Shift+M | ✅ |
| Join Linedefs | J | J | ✅ |
| Delete | Delete | Delete/Backspace | ✅ |
| Properties | Enter / Dbl-click | RMB click | ✅ |
| Split Linedef | Shift+S | Shift+S | ✅ |
| Curve Linedef | Shift+C | Shift+C | ✅ |
| Detect Sectors | - | Shift+B | ✅ |
| Auto Align Textures | A | Shift+A | ✅ |
| Select All | Ctrl+A | Ctrl+A | ✅ |

---

## Vizuální Feedback

### Selection Box
- **DBX**: Překrývající obdélník při tažení
- **Web**: OverlayLayer v Pixi.js - ✅ implementováno

### Highlighted Elements
- **DBX**: Změna barvy při hover
- **Web**: ✅ implementováno v layers

### Direction Indicators
- **DBX**: Tick marks na všech linedefs ukazující front stranu
- **Web**: ✅ Tick marks na všech linedefs (kratší pro two-sided)

### Flag Indicators
- **DBX**: Ikonky na linedefs (I = Impassable, S = Sound Block, atd.)
- **Web**: Chybí - **TODO: priorita nízká**

---

## Doporučení pro Implementaci

### Priorita 1 (Kritické) - ✅ HOTOVO
1. ✅ Unsaved changes warning
2. ✅ **Texture Browser** - virtuální scrolling, kategorie, vyhledávání
3. ✅ **Sector texture preview** - vizuální feedback v dialogu (ScrubInput, inline preview)

### Priorita 2 (Důležité) - Částečně hotovo
4. 🔄 Multi-select indeterminate state v dialozích - basic implementace
5. ✅ Effect Browser pro sector effects (s Boom generalized support)
6. ✅ Direction ticks na všech linedefs

### Priorita 3 (Nice to have) - ✅ HOTOVO
7. ✅ Thing Browser s kategorizací (ThingPickerDialog)
8. ✅ Texture alignment tools (Shift+A auto-align)
9. ✅ Klávesové zkratky pro split/curve linedef (Shift+S, Shift+C)

### Priorita 4 (Pokročilé)
10. 🔲 Custom fields (UDMF)
11. 🔲 Script editor (ACS)
12. 🔲 3D preview mode

---

## Technické Poznámky

### Dekódování Doom Textur

Doom textury používají indexed color (paleta PLAYPAL):
```typescript
async function decodeTexture(
  data: Uint8Array,
  width: number,
  height: number,
  palette: Uint8Array
): Promise<ImageData> {
  const imageData = new ImageData(width, height);
  for (let i = 0; i < data.length; i++) {
    const colorIndex = data[i];
    const offset = colorIndex * 3;
    imageData.data[i * 4 + 0] = palette[offset + 0]; // R
    imageData.data[i * 4 + 1] = palette[offset + 1]; // G
    imageData.data[i * 4 + 2] = palette[offset + 2]; // B
    imageData.data[i * 4 + 3] = 255; // A
  }
  return imageData;
}
```

### Paměťový Management

Pro velké WAD soubory (např. DOOM2.WAD = 14 MB):
- Neukládat celý WAD v paměti po parsování
- Použít ArrayBuffer.slice() pro lazy loading lumpů
- Uvolňovat textury které nejsou viditelné
- Monitorovat `performance.memory` (Chrome only)

### IndexedDB Schema

```typescript
interface TextureCache {
  name: string;
  wadHash: string;
  thumbnail: Blob; // 64x64 preview
  fullSize: Blob;  // plná velikost
  width: number;
  height: number;
}
```

---

## Sector View Modes (Implementováno)

Editor podporuje čtyři režimy zobrazení sektorů, přepínatelné přes toolbar:

| Režim | Ikona | Popis |
|-------|-------|-------|
| Normal | ViewNormal | Bez barevného vyplnění sektorů |
| Floor | ViewTextureFloor | ✅ Zobrazuje FLAT textury podlahy |
| Ceiling | ViewTextureCeiling | ✅ Zobrazuje FLAT textury stropu |
| Brightness | ViewBrightness | Stupně šedi podle light level (0-255) |

**Implementace:**
- Triangulace polygonů pomocí earcut pro správné vyplnění komplexních sektorů
- Geometry cache pro optimalizaci - polygony se nepřepočítávají při každém renderování
- ✅ FLAT textury se asynchronně načítají a zobrazují
- Klávesová zkratka: zatím není (TODO: přidat např. F5-F8 nebo Tab pro cycling)

---

## Návrhy na Vylepšení UI/UX

### Vysoká Priorita

#### 1. Minimap / Overview Panel
Malé okno v rohu zobrazující celou mapu s obdélníkem označujícím aktuální viewport.
- Klik na minimapu = rychlá navigace
- Užitečné pro velké mapy

#### 2. Properties Panel (Sidebar)
Místo modálních dialogů - sidebar s vlastnostmi vybraného elementu:
```
┌─────────────────┐
│ Sector #12      │
│ ─────────────── │
│ Floor:  [  0  ] │
│ Ceiling:[128  ] │
│ Light:  [160  ] │
│ ─────────────── │
│ Floor:  FLAT1   │
│ [Preview]       │
│ Ceiling: F_SKY1 │
│ [Preview]       │
└─────────────────┘
```
- Okamžitá editace bez otevírání dialogů
- Změny se aplikují v reálném čase

#### 3. Undo/Redo History Panel
Vizuální seznam akcí s možností skočit na libovolný bod:
- "Moved 3 vertices"
- "Changed sector floor to 64"
- "Deleted linedef #42"

#### 4. Status Bar Improvements ✅ HOTOVO
Aktuální stav zobrazuje:
- ✅ Počet vybraných elementů
- ✅ Pozici kurzoru (world coords) - snapped pozice při aktivním gridu
- ✅ Zoom level
- ✅ Aktuální snap size (grid)
- 🔲 Memory usage (pro debugging)

### Střední Priorita

#### 5. Quick Actions Menu
Kontextové menu na pravé tlačítko s relevantními akcemi:
- V sector mode: "Raise floor +8", "Lower floor -8", "Copy properties", "Paste properties"
- V linedef mode: "Flip", "Split at cursor", "Join"
- V vertex mode: "Merge at position", "Align to grid"

#### 6. Ruler / Measurement Tool
Dočasná čára pro měření vzdálenosti mezi dvěma body:
- Zobrazit vzdálenost v map units
- Užitečné pro přesné rozměry místností

#### 7. Zoom to Selection
Klávesa nebo tlačítko pro zoom na aktuálně vybrané elementy.

#### 8. Layer Visibility Controls
Možnost skrýt/zobrazit jednotlivé typy elementů:
- Sektory (fill)
- Linedefs
- Vertices
- Things
- Grid

#### 9. Copy/Paste Selection ✅ HOTOVO
- Ctrl+C = zkopírovat vybrané elementy
- Ctrl+X = vyjmout vybrané elementy
- Ctrl+V = vložit na pozici kurzoru
- Relativní offsety zachovány
- Automaticky kopíruje související elementy (vertices pro linedefs, linedefs a sidedefs pro sectors)

#### 10. Thing Sprites Preview
Zobrazit skutečné sprites thing objektů místo generických ikon.

### Nízká Priorita (Nice to Have)

#### 11. Dark/Light Theme Toggle
Přepínání mezi tmavým a světlým režimem.

#### 12. Customizable Keyboard Shortcuts
Uživatelsky definovatelné klávesové zkratky.

#### 13. Touch/Pen Support
Podpora pro tablety a dotykové obrazovky:
- Pinch to zoom
- Two-finger pan

#### 14. Auto-save with Recovery
Automatické ukládání do localStorage každých N sekund.
Při opětovném otevření nabídnout obnovení.

#### 15. Collaborative Editing (WebRTC)
Real-time spolupráce více uživatelů na jedné mapě.

---

## Accessibility (A11y)

### Klávesová Navigace
- Tab pro přesun mezi UI elementy
- Arrow keys pro navigaci v gridu textur
- Escape pro zavření dialogů

### Screen Reader Support
- ARIA labels na všech tlačítkách
- Announcements při změně stavu (např. "3 sectors selected")

### Vizuální Přístupnost
- Dostatečný kontrast barev
- Možnost změnit barvy selection/highlight
- Podpora pro color blindness (alternativní palety pro view modes)