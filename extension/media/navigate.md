# Navigate Variables

The MatrixSpy sidebar provides a powerful tree view to navigate through your MAT file contents.

## Sidebar Location

Look for the **MatrixSpy icon** in the Activity Bar (left side of VS Code). Click it to open the Variables panel.

## Tree Navigation

### Basic Variables

- Click on any variable to view its data in the main editor
- The type and size are shown next to each variable name

### Nested Structures

For structs and cell arrays:

1. **Expand** a struct by clicking the arrow (▶) or double-clicking
2. **Navigate** through multiple levels of nesting
3. **Click** on any nested field to view its contents

### Variable Icons

| Icon | Meaning |
|------|---------|
| 🔢 | Numeric array (int, float, double) |
| 📊 | Matrix (2D array) |
| 📦 | Struct |
| 📋 | Cell array |
| 🔤 | String/Character array |
| 🎯 | Complex number |

## Search and Filter

Use the search box at the top of the sidebar to filter variables by name.

## Refresh

Click the refresh icon in the sidebar toolbar to reload the variable list if the file has changed.

---

**Tip**: The path to nested variables is shown in the format `struct.field.subfield` when you hover over them.
