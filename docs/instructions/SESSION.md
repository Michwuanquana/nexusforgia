# Správa Session a Resourců (Web verze)

Tento dokument popisuje systém pro správu pracovních relací (Sessions) a herních dat (Resources), inspirovaný chováním DoomBuilderX.

## 1. Session Manager (Projektový stav)

Session funguje jako "pracovní soubor projektu" (podobně jako `.db2` nebo `.psd`). Neobsahuje samotná herní data, ale instrukce, jak sestavit pracovní prostředí.

### Vlastnosti Session:
- **Seznam načtených Resource**: Cesty k souborům a jejich kontrolní součty (checksums).
- **Stav editoru**: Poslední pozice kamery, zvolený editační režim, nastavení mřížky.
- **Metadata mapy**: Název aktuálně editované mapy.

### Export/Import:
- **Export (.json / .udmf-session)**: Uloží stav session do souboru, který si uživatel stáhne.
- **Import**: Uživatel nahraje soubor se session; systém zkontroluje, zda má v "Resource Library" (podle checksumů) dostupné potřebné WAD soubory. Pokud ne, vyzve uživatele k jejich nahrání.

---

## 2. Resource Management (Knihovna dat)

Resources (např. `DOOM2.WAD`, `TEXTURE1.WAD`) jsou perzistentní data uložená v prohlížeči. Na rozdíl od mapy jsou sdílena mezi různými session.

### Ukládání:
- Vzhledem k velikosti WAD souborů (např. Doom2.wad má ~14MB) budeme používat **IndexedDB** pro binární data a **localStorage** pro metadata a nastavení.
- Každý resource má unikátní ID generované z obsahu (SHA-256 hash).

### Funkce správce prostředků:
- **Add Resource**: Nahrání WAD/PK3 do lokální databáze prohlížeče.
- **Toggle**: Možnost dočasně vypnout resource (např. pro testování konfliktů textur) bez jeho smazání.
- **Reset/Clear**: Kompletní vymazání lokální knihovny dat.
- **Priority**: Řazení resourců (bottom-to-top) určuje, která textura/objekt přepíše jinou v případě duplicity (shodné s DBX).

---

## 3. Technický návrh (TypeScript)

### Datové struktury

```typescript
interface EditorSession {
  version: number;
  mapName: string;
  camera: { x: number; y: number; zoom: number };
  resources: {
    hash: string;       // Checksum pro spárování s Resource Library
    fileName: string;
    enabled: boolean;
  }[];
}

interface ResourceEntry {
  hash: string;         // SHA-256
  name: string;         // Původní název souboru
  type: 'wad' | 'pk3' | 'dir';
  blob: Blob;           // Binární data (v IndexedDB)
}
```

### Flow uživatele:
1. Uživatel přijde poprvé: Nahraje `DOOM2.WAD` jako základní resource. Ten se uloží do **IndexedDB**.
2. Uživatel otevře existující mapu: Session si pamatuje, že tato mapa používá `DOOM2.WAD`.
3. Export Session: Uloží se pouze JSON s informací, že session vyžaduje soubor s konkrétním hashem.

---

## 4. UI/UX Navýšení

Do Toolbaru a menu přibude:
- **Session Manager Dialog**: Seznam nedávných projektů, tlačítka Export/Import.
- **Resource Manager Dialog**: Table s resourci, checkbox pro "Enabled", tlačítko pro smazání a indikátor velikosti využitého místa v prohlížeči.
