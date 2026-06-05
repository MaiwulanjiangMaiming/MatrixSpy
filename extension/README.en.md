# MatrixSpy

<p align="center">
  <img src="https://raw.githubusercontent.com/MaiwulanjiangMaiming/MatrixSpy/main/extension/resources/Plugin.png" alt="MatrixSpy Logo" width="200"/>
</p>

<p align="center">
  <a href="https://marketplace.visualstudio.com/items?itemName=MaiwulanjiangMaiming.matrixspy">
    <img src="https://img.shields.io/badge/VS%20Code-Marketplace-blue?logo=visual-studio-code" alt="VS Code Marketplace"/>
  </a>
  <a href="https://open-vsx.org/extension/maiwulanjiangmaiming/matrixspy">
    <img src="https://img.shields.io/open-vsx/v/maiwulanjiangmaiming/matrixspy?label=Open%20VSX&style=flat&color=2C2255" alt="Open VSX Version"/>
  </a>
</p>

<p align="center">
  <a href="README.md">中文</a> | <a href="README.en.md">English</a>
</p>

---

A powerful VS Code extension for exploring, visualizing, and exporting MATLAB `.mat` files. Supports all MAT versions (v4–v7.3), interactive tensor visualization with zoom controls, and export to CSV/JSON/NumPy/PNG.

> 💡 I'm a solo developer building this out of passion in my spare time. If MatrixSpy helps your workflow, a ⭐ star on GitHub would mean a lot — it keeps the project going. Thank you!

## Features

- **All MAT file versions**: v4, v5, v6, v7, v7.3 (HDF5)
- **Interactive tensor visualization**:
  - 1D arrays with sparkline previews
  - 2D matrices as heatmaps or tables
  - 3D/4D+ tensors with slice viewer and zoom controls
  - Complex numbers: Magnitude / Phase / Real / Imag
- **9 Colormaps**: Grayscale, Viridis, Inferno, Plasma, Hot, Jet, Turbo, Coolwarm, RdBu (+ custom colormaps via settings)
- **Keyboard shortcuts**: Arrow keys for slices, +/- for zoom, T/I for view mode, C for colormap
- **Image enhancement**: Window/Level contrast, rotate, flip horizontal/vertical
- **Variable search & filter**: Search box in sidebar with type: prefix filtering
- **Status bar**: Shows file name, variable count, active variable shape/dtype/memory
- **Zoom controls** for image mode: +/- buttons, 1:1 reset, adaptive sizing
- **Zoom persistence**: zoom level kept when switching slices/axis/view mode
- **Tree view** for variable navigation with expandable structs
- **Lazy loading** for large 3D tensors and HDF5 datasets
- **Export**: CSV, JSON, NumPy NPY, PNG Image, HDF5
- **Setup wizard** with automatic dependency detection

## Prerequisites

**Python 3.8+** with:

```bash
pip install scipy numpy h5py mat73
```

The extension checks dependencies on first launch and guides you through installation.

## Usage

### Opening MAT Files

1. **Double-click** a `.mat` file in Explorer
2. **Right-click** a `.mat` file → "Open MAT File"
3. Command Palette (`Cmd+Shift+P`) → "MatrixSpy: Open MAT File"

### Navigation

- **Sidebar**: Browse all variables, expand structs, click to view
- **Search box**: Filter variables by name or type (e.g., `type:struct`)
- **Tree items**: Expand/collapse nested structures

### Visualization

| Data Type | Visualization |
|-----------|---------------|
| Scalar | Large number display |
| 1D array | Grid with sparkline in sidebar |
| 2D matrix | Heatmap (Image) or table (Table) |
| 3D+ tensor | Slice viewer with axis/slice controls |
| Complex | Magnitude / Phase / Real / Imag modes |
| Struct | Expandable field tree |

### Image Mode Controls

When viewing tensors in Image mode:

- **+ / -**: Zoom in/out (1.5x per click)
- **1:1**: Reset to adaptive size
- **Window/Level**: Adjust contrast range with sliders
- **Rotate**: ↺ / ↻ buttons (90° increments)
- **Flip**: ⇄ horizontal / ⇅ vertical
- **Zoom persistence**: zoom level is kept when switching slices
- **Adaptive sizing**: small tensors auto-upscaled, large tensors fit container

### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `←` / `[` | Previous slice |
| `→` / `]` | Next slice |
| `+` / `=` | Zoom in |
| `-` / `_` | Zoom out |
| `0` | Reset zoom |
| `T` | Toggle Image/Table view |
| `I` | Switch to Image view |
| `C` | Next colormap |
| `Shift+C` | Previous colormap |

### Export

- Command Palette → "MatrixSpy: Export to CSV" / "Export to JSON" / "Export to NumPy" / "Export to PNG" / "Export to HDF5"

## Configuration

```json
{
  "matrixspy.pythonPath": "python3",
  "matrixspy.maxDataSize": 10000
}
```

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for full version history.

### v1.5.0 Highlights (2026-06-03)

- **MAT file diff/compare**: Compare variables between two .mat files
- **i18n**: Chinese language support

### v1.4.0 Highlights (2026-06-02)

- **1D line chart view**: Line chart visualization for 1D arrays
- **Table virtual scrolling**: Smooth scrolling for large data tables
- **Breadcrumb navigation**: Struct field path navigation

### v1.3.0 Highlights (2026-05-24)

- **9 Colormaps**: Hot, Jet, Turbo, Coolwarm, RdBu added
- **Keyboard shortcuts** for all common operations
- **Status bar** showing active file and variable info
- **Variable search & filter** in sidebar
- **Image enhancement**: Window/Level, rotate, flip
- **New exports**: NumPy NPY and PNG image formats

### v1.2.0 Highlights (2026-05-15)

- **Persistent Python Daemon**: ~25x faster slice loading
- **Security**: CSP nonce, Python injection prevention
- **Enhanced statistics**: percentiles, NaN/Inf, sparsity, memory

## License

MIT License

## Contact

For feature requests or bug reports: [GitHub Issues](https://github.com/MaiwulanjiangMaiming/MatrixSpy/issues)

---

**Enjoy viewing your MAT files!**
