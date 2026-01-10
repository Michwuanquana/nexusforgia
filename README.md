# NexumForgia

![NexumForgia Logo](www/public/logo.png)

A web-based Doom map editor running entirely in your browser.

*Nexum* (lat. "connection") + *Forgia* (it. "forge") — where geometry is forged and everything connects.

**Live:** https://nexusforgia.org

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

## On AI-Assisted Development

This project was built using Claude (Opus 4.5) as a development partner. I want to be upfront about this because transparency matters.

**What this is not:**
- This is not "vibecoding" — random prompts hoping for magic
- This is not stolen or scraped code from other projects
- This is not a lazy copy-paste job with no understanding

**What this actually is:**

The development process followed a structured approach: architecture was planned before writing code, each feature was specified with clear requirements, and implementation went through multiple iterations of review and refinement. Every piece of code was discussed, understood, and intentionally placed.

AI is a tool. Like any tool, it can be used well or poorly. A hammer doesn't build a house — a person with a plan does. The same applies here: Claude helped translate ideas into code faster, but the design decisions, architecture choices, and quality standards came from human direction.

**The uncomfortable truth:** AI is changing software development whether we like it or not. I personally don't see a problem with using it responsibly — with clear attribution, respect for licenses, and genuine understanding of what's being built. This project aims to demonstrate that AI-assisted development can produce legitimate, quality software.

All code is open source under GPL-3.0. Nothing is hidden.

**Project Metrics:**
- ~15,000 lines of TypeScript/React code
- 69 source files
- Stack: React 19, TypeScript, PixiJS 8, Zustand, Tailwind CSS

---

## Heritage

This project builds on the shoulders of giants:

- **[Doom Builder X](https://github.com/anotak/doombuilderx)** by anotak — Desktop map editor (C#) that inspired the UI patterns
- **[SLADE](https://github.com/sirjuddington/SLADE)** by sirjuddington — Comprehensive Doom editor for reference on WAD formats

Both projects are GPL-licensed, and NexumForgia continues this tradition.

---

## License

**GPL-3.0**

This project is licensed under the GNU General Public License v3.0, maintaining compatibility with its heritage projects.

See [LICENSE](LICENSE) for the full text.
