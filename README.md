# NexumForgia

![NexumForgia Logo](www/public/logo.png)

A web-based Doom map editor running entirely in your browser.

*Nexum* (lat. "connection") + *Forgia* (it. "forge") — where geometry is forged and everything connects.

**Live Demo:** https://udmf.yrx.cz

---

## Features

### Map Formats
- Doom / Doom 2 (Boom compatible)
- Hexen
- ZDoom / ZDaemon
- Auto-detection on WAD load

### Edit Modes
| Mode | Key | Features |
|------|-----|----------|
| Vertex | V | Select, move, create, delete, merge, join |
| Linedef | L | Select, move, flip, split, curve |
| Sector | S | Box selection, delete, properties |
| Thing | T | Insert, move, delete |
| Draw | D | Draw new geometry with auto-sector detection |

### Core Features
- Full undo/redo system
- Grid snapping with adjustable size
- Texture browser with virtual scrolling and search
- Effect browser (Doom/Boom/Hexen specials)
- Copy/paste with automatic ID remapping
- Auto texture alignment (Shift+A)
- Session persistence in browser storage

### Keyboard Shortcuts
| Key | Action |
|-----|--------|
| V / L / S / T / D | Switch edit mode |
| G | Toggle grid |
| Home | Fit map to view |
| Ctrl+Z / Ctrl+Y | Undo / Redo |
| Ctrl+S | Save session |
| Ctrl+Shift+S | Export WAD |
| Ctrl+C / X / V | Copy / Cut / Paste |
| Delete | Delete selection |
| F | Flip linedef |
| Shift+M | Merge vertices |
| Shift+S | Split linedef |
| Shift+C | Curve linedef |
| Shift+A | Auto-align textures |
| Shift+B | Detect sectors |
| Enter | Properties dialog |

---

## Development

```bash
cd www
npm install
npm run dev      # Development server
npm run build    # Production build
```

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for technical details.

---

## Heritage

This project builds upon the work of established Doom editing tools:

- **[Doom Builder X](https://github.com/anotak/doombuilderx)** by anotak — The original desktop map editor (C#/WinForms) that inspired the UI/UX patterns and editing workflows. Source available at `~/depend/dmx/`.

- **[SLADE](https://github.com/sirjuddington/SLADE)** by sirjuddington — A comprehensive Doom editor for resource and map editing (C++/wxWidgets). Reference for WAD format handling and advanced features. Source available at `~/depend/slade/`.

Both projects are GPL-licensed, and NexumForgia continues this tradition.

---

## About This Project

**Built with Claude Opus 4.5** — This project was developed through structured AI-assisted programming, not "vibe coding". The development followed a planned architecture with clear specifications, iterative implementation, and systematic testing.

**Project Metrics:**
- ~15,000 lines of TypeScript/React code
- 69 source files
- Estimated ~60k tokens of source context

The entire codebase was developed in conversation with Claude, demonstrating that AI-assisted development can produce production-quality software when guided by clear requirements and architectural vision.

---

## License

**GPL-3.0**

This project is licensed under the GNU General Public License v3.0, maintaining compatibility with its heritage projects (Doom Builder X and SLADE).

See [LICENSE](LICENSE) for the full text.
