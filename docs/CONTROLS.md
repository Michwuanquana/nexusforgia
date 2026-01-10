# Editor Controls

## General Principles

Controls are designed to be consistent across all edit modes (Vertex, Linedef, Sector). Right Mouse Button (RMB) is primary for object manipulation, Left Mouse Button (LMB) for selection.

## Mouse

### Left Mouse Button (LMB)

| Action | Condition | Result |
|------|----------|----------|
| Click on object | - | Adds object to selection (additive) |
| Click on empty space | - | Deselects all |
| Drag from empty space | - | Box selection |

**Note on selection:** Selection is always additive - clicking another object adds it to the selection with a numerical order (1, 2, 3...). To clear the selection, click on an empty space.

### Right Mouse Button (RMB)

| Action | Condition | Result |
|------|----------|----------|
| Click on object | Nothing selected | Selects object and starts dragging |
| Click anywhere | Something selected | Starts moving selected objects |
| Click on empty space | Nothing selected, Linedef mode | Starts drawing a new line |
| Click on empty space | Nothing selected, Vertex mode | Inserts a new vertex |
| Click on empty space | Nothing selected, Sector mode | Nothing (sectors cannot be drawn directly) |

## Moving Objects (Drag)

### Grid snapping

A **reference vertex** is used for grid alignment during movement:

1. **If the cursor is over a vertex when dragging starts:** This vertex is used as the reference.
2. **If dragging starts from empty space (with objects already selected):** The nearest vertex from the selected objects is automatically chosen.

The reference vertex snaps to the grid and all other vertices are shifted by the same offset. This ensures:
- Consistent alignment regardless of where the user started dragging.
- Positions upon mouse release match what the user sees during dragging (no "jumping").

### Canceling Drag

- **Escape** during dragging returns objects to their original positions.

## Drawing (Linedef mode)

| Action | Result |
|------|----------|
| RMB on empty space | Starts drawing (creates/uses vertex) |
| LMB | Continues drawing (adds next segment) |
| RMB | Ends drawing (keeps drawn path) |
| Escape | Cancels current segment (path remains) |

After finishing drawing, closed loops are automatically detected and sectors are created.

## Keyboard Shortcuts

### Global

| Key | Action |
|---------|------|
| V | Vertex mode |
| L | Linedef mode |
| S | Sector mode |
| T | Thing mode |
| Delete / Backspace | Delete selected |
| Escape | Cancel action / Clear selection |
| Ctrl+A | Select all |
| Ctrl+Z | Undo |
| Ctrl+Shift+Z / Ctrl+Y | Redo |

### Vertex mode

| Key | Action |
|---------|------|
| J | Join selected vertices with a line |
| Shift+M | Merge selected vertices |

### Linedef mode

| Key | Action |
|---------|------|
| F | Flip line orientation |
| Shift+S | Split line in half |
| Shift+C | Curve line |

## Viewport

| Action | Result |
|------|----------|
| Mouse wheel | Zoom in/out |
| Middle button + drag | Pan |
| +/- | Zoom in/out |
| Home | Fit map to view |

## Dialogs

| Key | Action |
|---------|------|
| Enter | Potvrdit / Vybrat |
| Escape | Zrušit / Zavřít |
| Šipky | Navigace v dialogu |