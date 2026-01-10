Dobrá otázka. Pojďme udělat realistické srovnání:

## Vztah k DoomBuilderX desktop verzi

V adresáři [docs/doombuilderx/](docs/doombuilderx/) se nachází kompletní zdrojové kódy desktopové aplikace DoomBuilderX (C#). 

Naše webová verze (v `www/src/`) staví na stejných principech a uživatelské zkušenosti. Cílem je, aby se uživatelé DBX cítili v našem webovém editoru jako doma. Detailní návrh migrace logiky z C# do TypeScriptu najdeš v [docs/MIGRATES.md](docs/MIGRATES.md).

## Co máme vs DoomBuilderX

### ✅ Pokryto v INSTRUCTIONS (základ hotov v dokumentaci)
| Feature | DBX | My implementace |
|---------|-----|-----------------|
| Vertex Mode (select, move, delete, merge) | ✅ | ✅ |
| Linedef Mode (select, move, flip, split) | ✅ | ✅ |
| Sector Mode (select, heights, brightness) | ✅ | ✅ |
| Thing Mode (place, rotate, delete) | ✅ | ✅ |
| Draw Mode (basic line drawing) | ✅ | ✅ |
| Undo/Redo | ✅ | ✅ |
| Grid snap | ✅ | ✅ |
| Geometry snap (vertex/line) | ✅ | ✅ |
| Box selection | ✅ | ✅ |
| Keyboard shortcuts | ✅ | ✅ |
| WAD import (Doom + Hexen) | ✅ | ✅ (už implementováno) |
| Texture management (basic) | ✅ | ✅ |

### 🔶 Částečně / Zjednodušeně

| Feature | DBX | Náš stav | Poznámka |
|---------|-----|----------|----------|
| Copy/Paste | Full | 🔲 | Není v instrukci, nutno doplnit |
| Auto sector detection | Full | 🔲 | Klíčové! Chybí `SectorBuilder` |
| Texture alignment | Auto + Manual | 🔲 | Jen stub v instrukci |
| Properties dialogs | Full GUI | 🔲 | Chybí React komponenty |
| Thing browser | Categories + sprites | 🔲 | Jen základ |

### ❌ Chybí kompletně (významné)

| Feature | Složitost | Priorita |
|---------|-----------|----------|
| **3D Visual Mode** | 🔴 Vysoká | P1 - killer feature DBX |
| **Nodebuilder** (BSP, SEGS, SSECTORS) | 🔴 Vysoká | P1 - nutné pro export |
| **WAD Export** (Hexen format) | 🟡 Střední | P1 |
| **BEHAVIOR lump** (ACS bytecode) | 🟡 Střední | P2 |
| Curve Linedefs tool | 🟢 Nízká | P3 |
| Stair builder | 🟢 Nízká | P3 |
| Door/Lift wizards | 🟢 Nízká | P3 |
| Make Sector (from selection) | 🟡 Střední | P2 |
| Texture browser (full) | 🟡 Střední | P2 |
| Map statistics | 🟢 Nízká | P4 |
| Error checker | 🟡 Střední | P2 |
| Prefabs | 🟡 Střední | P3 |
| Script editor (ACS) | 🟡 Střední | P3 |
| Game configurations | 🟡 Střední | P2 |
| Multiple map support | 🟢 Nízká | P3 |
| Find & Replace | 🟢 Nízká | P4 |

### ❌ Chybí kompletně (pokročilé)

| Feature | Poznámka |
|---------|----------|
| Slopes editing | ZDoom/GZDoom specific |
| 3D floors | ZDoom specific |
| UDMF support | Jiný formát než Hexen |
| Portals | ZDoom specific |
| Custom DECORATE/ZScript | Out of scope? |
| Plugins system | Out of scope |

---

## Hrubý odhad práce

```
Dokumentace pokrývá:     ~25% funkcionality DBX
Již implementováno:       ~15% (WAD parser, renderer, základní UI)
─────────────────────────────────────────────────────
Celkem hotovo:           ~40% základního editoru

Chybí do "použitelného editoru":
├── Auto sector detection    ~2-3 dny
├── WAD Export (Hexen)       ~2 dny  
├── Nodebuilder integration  ~1-2 dny (použít ZDBSP/glBSP)
├── Properties dialogs       ~3-4 dny
├── Texture browser          ~2 dny
└── 3D Mode                  ~5-10 dnů (!)
                            ─────────────
                            ~15-25 dnů do MVP

Chybí do "plnohodnotného editoru":
├── Script editor            ~3-4 dny
├── Error checker            ~2 dny
├── Wizards (stairs, doors)  ~2-3 dny
├── Prefabs                  ~2 dny
└── Polish & edge cases      ~5+ dnů
                            ─────────────
                            ~30-40 dnů total
```

---

## Kritické chybějící komponenty

### 1. SectorBuilder (Auto sector detection)
```typescript
// Tohle MUSÍME mít - jinak nelze kreslit nové sektory
class SectorBuilder {
  // Když uživatel uzavře loop linií, automaticky vytvoří sektor
  detectClosedLoops(linedefs: Linedef[]): Sector[]
  
  // Když linedef rozdělí existující sektor
  splitSector(sector: Sector, dividingLine: Linedef): [Sector, Sector]
  
  // Winding order detection (which side is "inside")
  determineWindingOrder(vertices: Vertex[]): 'cw' | 'ccw'
}
```

### 2. Nodebuilder
```
Možnosti:
a) Port ZDBSP do WASM (~složité)
b) Zavolat server-side ZDBSP (~jednodušší)
c) Napsat vlastní BSP builder (~velmi složité)

Doporučuji: (b) - API endpoint který spustí ZDBSP
```

### 3. 3D Visual Mode
Detailní návrh implementace 3D režimu byl přesunut do samostatného souboru: **[docs/IMPLEMENTATION_3D.md](docs/IMPLEMENTATION_3D.md)**.

---

## Chceš abych dopsal některou z chybějících částí?

Doporučená priorita:
1. **SectorBuilder** - bez toho editor nefunguje
2. **WAD Export** - bez toho není výstup
3. **Properties dialogs** - bez toho nelze nastavovat textury/specials
4. **3D Mode** - killer feature