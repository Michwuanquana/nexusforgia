# ZDBSP WASM Integration Plan

## Přehled

Cílem je integrovat ZDBSP (node builder pro Doom mapy) do webové verze editoru pomocí WebAssembly.

## Co je ZDBSP

ZDBSP je node builder, který generuje BSP (Binary Space Partitioning) struktury potřebné pro renderování Doom map:
- **SEGS** - segmenty linedefs
- **SSECTORS** - subsektory (konvexní polygony)
- **NODES** - BSP strom
- **REJECT** - visibility rejection table
- **BLOCKMAP** - collision detection grid

## Aktuální stav v DoomBuilderX (origo)

DoomBuilderX volá ZDBSP jako **externí .exe proces**:
- Konfigurace v `data/Compilers/Nodebuilders/zdbsp.cfg`
- Spouštění přes `MapManager.BuildNodes()` → `Compiler.Run()`
- Není žádná vestavěná implementace BSP algoritmu

## Možnosti implementace

### Varianta A: ZDBSP kompilace do WASM (doporučeno)

**Výhody:**
- Využití ověřeného, battle-tested kódu
- Plná kompatibilita s originálním ZDBSP
- Podpora všech formátů (Doom, Hexen, UDMF, GL nodes)

**Kroky:**
1. Získat ZDBSP zdrojový kód (C++)
   - https://github.com/ZDoom/zdbsp
2. Upravit pro Emscripten kompilaci
   - Odstranit file I/O, nahradit memory buffers
   - Exportovat funkce pro JS volání
3. Kompilovat pomocí Emscripten do .wasm + .js wrapper
4. Integrovat do frontendu

**Rozhraní:**
```typescript
interface ZDBSPModule {
  buildNodes(wadData: Uint8Array, options: ZDBSPOptions): Uint8Array;
}

interface ZDBSPOptions {
  format: 'doom' | 'hexen' | 'udmf';
  extended: boolean;      // Extended nodes
  compress: boolean;      // Compressed nodes
  buildReject: boolean;   // Build REJECT lump
  buildBlockmap: boolean; // Build BLOCKMAP lump
}
```

### Varianta B: TypeScript reimplementace

**Výhody:**
- Čistě JS/TS, žádné WASM závislosti
- Snadnější debugging

**Nevýhody:**
- Velké množství práce
- Riziko chyb v komplexním algoritmu
- Pomalejší než WASM

**Nutné implementovat:**
- BSP partitioning algoritmus
- Seg splitting
- Subsector generation
- Node tree building
- REJECT table computation
- BLOCKMAP generation

### Varianta C: Server-side ZDBSP

**Výhody:**
- Nejjednodušší implementace
- Žádné změny v ZDBSP

**Nevýhody:**
- Vyžaduje server roundtrip
- Latence při buildění
- Server musí mít ZDBSP nainstalovaný

**Implementace:**
```typescript
// Frontend
const result = await fetch('/api/build-nodes', {
  method: 'POST',
  body: wadData
});

// Backend (např. v Go/Rust/Node)
// Spustí zdbsp binary a vrátí výsledek
```

## Doporučený postup: Varianta A (WASM)

### Fáze 1: Příprava ZDBSP

1. Fork ZDBSP repository
2. Vytvořit `emscripten` branch
3. Modifikovat `main.cpp`:
   - Odstranit `main()`, vytvořit exportovanou funkci
   - Vstup/výstup přes memory buffers místo souborů
4. Vytvořit `CMakeLists.txt` pro Emscripten

### Fáze 2: Kompilace

```bash
# Instalace Emscripten
git clone https://github.com/emscripten-core/emsdk.git
cd emsdk && ./emsdk install latest && ./emsdk activate latest

# Kompilace ZDBSP
cd zdbsp
mkdir build && cd build
emcmake cmake ..
emmake make

# Výstup: zdbsp.wasm, zdbsp.js
```

### Fáze 3: JavaScript wrapper

```typescript
// src/wasm/zdbsp.ts
let zdbspModule: any = null;

export async function initZDBSP(): Promise<void> {
  const module = await import('./zdbsp.js');
  zdbspModule = await module.default();
}

export function buildNodes(
  wadData: Uint8Array,
  options: ZDBSPOptions
): Uint8Array {
  if (!zdbspModule) {
    throw new Error('ZDBSP not initialized');
  }

  // Alokace paměti ve WASM
  const inputPtr = zdbspModule._malloc(wadData.length);
  zdbspModule.HEAPU8.set(wadData, inputPtr);

  // Volání ZDBSP
  const outputPtr = zdbspModule._buildNodes(
    inputPtr,
    wadData.length,
    options.extended,
    options.compress
  );

  // Čtení výsledku
  const outputSize = zdbspModule._getOutputSize();
  const result = new Uint8Array(
    zdbspModule.HEAPU8.buffer,
    outputPtr,
    outputSize
  ).slice();

  // Cleanup
  zdbspModule._free(inputPtr);
  zdbspModule._free(outputPtr);

  return result;
}
```

### Fáze 4: Integrace do editoru

```typescript
// src/io/map/MapExporter.ts
import { buildNodes } from '../wasm/zdbsp';

export async function exportMap(map: MapData): Promise<Uint8Array> {
  // 1. Serializovat mapu do WAD formátu (bez node dat)
  const rawWad = serializeMapToWad(map);

  // 2. Buildnout nodes
  const wadWithNodes = buildNodes(rawWad, {
    format: 'udmf',
    extended: true,
    compress: false,
    buildReject: false,  // Pro UDMF není potřeba
    buildBlockmap: false
  });

  return wadWithNodes;
}
```

## Alternativa: Existující WASM porty

Před vlastní kompilací zkontrolovat:
- https://github.com/nickshanks/Wad-JS (obsahuje BSP?)
- npm balíčky s "doom" nebo "wad" v názvu
- Emscripten ports repository

## Časový odhad

| Fáze | Čas |
|------|-----|
| Analýza ZDBSP kódu | 1-2 dny |
| Emscripten modifikace | 2-3 dny |
| Kompilace a debugging | 1-2 dny |
| JS wrapper | 1 den |
| Integrace do editoru | 1-2 dny |
| Testování | 2-3 dny |
| **Celkem** | **8-13 dní** |

## Reference

- ZDBSP source: https://github.com/ZDoom/zdbsp
- Emscripten docs: https://emscripten.org/docs/
- BSP algoritmus: https://doomwiki.org/wiki/Node
- UDMF spec: https://doomwiki.org/wiki/UDMF
