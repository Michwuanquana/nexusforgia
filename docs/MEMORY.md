# Memory Management: Backend-Assisted Architecture

## The Problem

Working with large WAD files in the browser hits several fundamental limits:

| WAD file | Size | Texture count | Estimated memory after decoding |
|------------|----------|--------------|--------------------------------|
| DOOM.WAD | 4 MB | ~120 | ~15 MB |
| DOOM2.WAD | 14 MB | ~180 | ~25 MB |
| Eviternity | 85 MB | ~800 | ~200 MB |
| Sunlust | 120 MB | ~1200 | ~350 MB |
| Custom megawad | 200+ MB | 2000+ | 500+ MB |

**Why this is a issue:**
- Browser heap limit: ~2-4 GB (depends on OS and browser)
- Each 256x256 texture = 256 KB (RGBA)
- Doom patch-based textures require composition = extra memory
- Loaded WAD + decoded textures + editor state at the same time = memory pressure
- Mobile devices have even stricter limits

---

## Current Client-Only Architecture

```
┌─────────────────────────────────────────────────────────┐
│                      BROWSER                             │
├─────────────────────────────────────────────────────────┤
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐ │
│  │  WAD File   │───▶│  WAD Parser │───▶│   MapData   │ │
│  │  (ArrayBuffer)   │  (JS)       │    │  (Objects)  │ │
│  │  14 MB      │    └─────────────┘    │  ~5 MB      │ │
│  └─────────────┘           │           └─────────────┘ │
│                            ▼                            │
│                   ┌─────────────────┐                   │
│                   │ Texture Decoder │                   │
│                   │ (Main Thread!)  │                   │
│                   └────────┬────────┘                   │
│                            ▼                            │
│  ┌─────────────────────────────────────────────────┐   │
│  │              Decoded Textures                    │   │
│  │  Map<string, ImageData>  ~200 MB for megawad    │   │
│  └─────────────────────────────────────────────────┘   │
│                            │                            │
│                            ▼                            │
│  ┌─────────────────────────────────────────────────┐   │
│  │              IndexedDB Cache                     │   │
│  │  Thumbnails + Full textures as Blobs            │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

**Disadvantages:**
1. High memory consumption on the client
2. Decoding blocks the main thread (or requires Web Workers)
3. Long wait times during the initial WAD load
4. Every user decodes the same textures repeatedly
5. IndexedDB quota limits (usually 50% of free space)

---

## Backend-Assisted Architecture

### Option A: Texture Server (REST API)

```
┌────────────────────┐         ┌────────────────────────────┐
│      BROWSER       │         │          BACKEND           │
├────────────────────┤         ├────────────────────────────┤
│                    │         │  ┌──────────────────────┐  │
│  Upload WAD ──────────────────▶│  WAD Storage (S3/FS)  │  │
│                    │         │  └──────────┬───────────┘  │
│                    │         │             │              │
│                    │         │             ▼              │
│                    │         │  ┌──────────────────────┐  │
│  GET /textures ◀────────────────│  Texture Cache       │  │
│  (metadata only)   │         │  │  - Decoded PNG/WebP  │  │
│                    │         │  │  - Thumbnails 64x64  │  │
│                    │         │  │  - Redis/Memcached   │  │
│  GET /texture/     │         │  └──────────────────────┘  │
│  {name}?size=thumb◀──────────│             │              │
│  (lazy load)       │         │             ▼              │
│                    │         │  ┌──────────────────────┐  │
│  Minimal memory:   │         │  │  Worker Pool         │  │
│  - Only visible    │         │  │  - Parallel decoding │  │
│  - Thumbnails      │         │  │  - WASM decoder?     │  │
│                    │         │  └──────────────────────┘  │
└────────────────────┘         └────────────────────────────┘
```

**API Endpoints:**

```typescript
// Upload WAD and get session ID
POST /api/wad/upload
Content-Type: multipart/form-data
Body: { file: WAD }
Response: { sessionId: "abc123", maps: ["MAP01", "MAP02", ...] }

// Texture list (metadata only)
GET /api/wad/{sessionId}/textures
Response: {
  flats: [{ name: "FLOOR0_1", width: 64, height: 64 }, ...],
  walls: [{ name: "STARTAN2", width: 128, height: 128 }, ...]
}

// Individual texture (lazy load)
GET /api/wad/{sessionId}/texture/{name}?size=thumb|full&format=webp
Response: image/webp binary

// Map data
GET /api/wad/{sessionId}/map/{mapName}
Response: { vertices: [...], linedefs: [...], ... }
```

**Advantages:**
- Client only holds visible textures
- Server can cache decoded textures between users
- WebP/AVIF compression = smaller transfers
- Option for CDN for static assets

**Disadvantages:**
- Latency when scrolling the texture browser
- Requires backend infrastructure
- Upload time for large WADs

---

### Option B: Hybrid with Pre-processing

Pro známé IWADs (DOOM.WAD, DOOM2.WAD, HERETIC.WAD, HEXEN.WAD):

```
┌─────────────────────────────────────────────────────────┐
│                   PRE-BUILT ASSETS                       │
│  (CDN: cdn.udmf.yrx.cz/textures/doom2/)                 │
├─────────────────────────────────────────────────────────┤
│  /doom2/                                                 │
│    ├── manifest.json    (texture metadata)              │
│    ├── thumbs/                                          │
│    │   ├── STARTAN2.webp  (64x64, ~1KB)                │
│    │   └── ...                                          │
│    └── full/                                            │
│        ├── STARTAN2.webp  (original size, ~5KB)        │
│        └── ...                                          │
└─────────────────────────────────────────────────────────┘

┌────────────────────┐         ┌────────────────────────────┐
│      BROWSER       │         │          BACKEND           │
├────────────────────┤         ├────────────────────────────┤
│                    │         │                            │
│  1. Detect IWAD ──────────────▶ Hash-based detection     │
│     (file hash)    │         │                            │
│                    │         │                            │
│  2. If known IWAD: │         │                            │
│     Load from CDN◀────────────  Redirect to CDN          │
│                    │         │                            │
│  3. If custom WAD: │         │                            │
│     Upload + process◀─────────  On-demand processing     │
│                    │         │                            │
└────────────────────┘         └────────────────────────────┘
```

**Advantages:**
- Zero latency for common IWADs
- CDN caching = minimal server load
- Custom WADs are processed on-demand and cached

---

### Option C: Streaming with WebSocket

For real-time texture browsing:

```typescript
// Client
const ws = new WebSocket('wss://api-udmf.yrx.cz/texture-stream');

ws.onopen = () => {
  // Request visible textures
  ws.send(JSON.stringify({
    type: 'subscribe',
    textures: ['STARTAN2', 'FLOOR0_1', 'CEIL1_1'],
    size: 'thumb'
  }));
};

ws.onmessage = (event) => {
  const { name, data } = JSON.parse(event.data);
  // data is base64 encoded WebP
  textureCache.set(name, data);
};

// When scrolling, update subscription
function onScroll(visibleTextures: string[]) {
  ws.send(JSON.stringify({
    type: 'subscribe',
    textures: visibleTextures,
    size: 'thumb'
  }));
}
```

**Výhody:**
- Okamžitý feedback při scrollování
- Server posílá jen to, co klient potřebuje
- Možnost priority queue (viditelné > prefetch)

---

## Doporučená Implementace

### Fáze 1: Lokální Optimalizace (Současný Stav)
- [x] Lazy decoding textur
- [x] IndexedDB cache
- [ ] Web Worker pro dekódování
- [ ] Virtual scrolling v texture browseru
- [ ] LRU cache s max velikostí

### Fáze 2: Backend Texture Server
```yaml
# docker-compose.yml rozšíření
services:
  texture-server:
    build: ./texture-server
    environment:
      - REDIS_URL=redis://redis:6379
      - S3_BUCKET=udmf-textures
    volumes:
      - wad-cache:/var/cache/wad
    labels:
      - "traefik.http.routers.textures.rule=Host(`textures.udmf.yrx.cz`)"
```

**Technologie:**
- Node.js / Rust pro rychlé dekódování
- Redis pro cache metadata
- S3/MinIO pro blob storage
- Sharp (Node) nebo image-rs (Rust) pro konverzi

### Fáze 3: Pre-built Asset CDN
```bash
# Build script pro IWAD assets
./scripts/prebuild-iwad.sh DOOM2.WAD doom2

# Výstup:
# - cdn/doom2/manifest.json
# - cdn/doom2/thumbs/*.webp
# - cdn/doom2/full/*.webp
```

---

## Paměťový Budget

| Komponenta | Limit | Poznámka |
|------------|-------|----------|
| WAD ArrayBuffer | 50 MB | Uvolnit po parsování |
| MapData | 10 MB | Aktivní mapa |
| Visible Textures | 20 MB | Max ~80 full-size textur |
| Thumbnail Cache | 5 MB | ~500 thumbnails @ 64x64 |
| Editor State | 5 MB | Undo stack, selection |
| **Celkem** | **90 MB** | Bezpečný limit pro mobile |

---

## API Contract (Draft)

```typescript
// types/texture-api.ts

interface TextureManifest {
  version: string;
  iwad: string;
  hash: string;
  textures: TextureInfo[];
}

interface TextureInfo {
  name: string;
  type: 'flat' | 'wall' | 'patch';
  width: number;
  height: number;
  thumbUrl: string;
  fullUrl: string;
}

interface TextureServerConfig {
  baseUrl: string;
  useCdn: boolean;
  cdnUrl: string;
  wsUrl: string;
}

// Client usage
class TextureService {
  constructor(private config: TextureServerConfig) {}

  async getManifest(wadHash: string): Promise<TextureManifest | null> {
    // Check if this is a known IWAD
    const res = await fetch(`${this.config.baseUrl}/manifest/${wadHash}`);
    if (res.status === 404) return null; // Custom WAD
    return res.json();
  }

  async uploadWad(file: File): Promise<string> {
    // Upload for processing, get session ID
    const form = new FormData();
    form.append('wad', file);
    const res = await fetch(`${this.config.baseUrl}/upload`, {
      method: 'POST',
      body: form
    });
    const { sessionId } = await res.json();
    return sessionId;
  }

  getTextureUrl(name: string, size: 'thumb' | 'full'): string {
    // Returns CDN URL for known IWADs, server URL for custom
    return `${this.config.cdnUrl}/${size}/${name}.webp`;
  }
}
```

---

## Závěr

Pro udržitelnou práci s velkými WAD soubory doporučuji postupnou implementaci:

1. **Krátkodobě**: Web Worker dekódování + virtuální scrolling
2. **Střednědobě**: REST API texture server s Redis cache
3. **Dlouhodobě**: Pre-built CDN pro IWADs + WebSocket streaming

Tato architektura umožní práci i s 200+ MB modifikacemi při zachování responzivity editoru.