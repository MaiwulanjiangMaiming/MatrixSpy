# MatrixSpy

<p align="center">
  <img src="https://raw.githubusercontent.com/MaiwulanjiangMaiming/MatrixSpy/main/extension/resources/Plugin.png" alt="MatrixSpy Logo" width="200"/>
</p>

<p align="center">
  <a href="https://marketplace.visualstudio.com/items?itemName=MaiwulanjiangMaiming.matrixspy">
    <img src="https://img.shields.io/badge/VS%20Code-Marketplace-blue?logo=visual-studio-code" alt="VS Code Marketplace"/>
  </a>
  <a href="https://open-vsx.org/extension/maiwulanjiangmaiming/matrixspy">
    <img src="https://img.shields.io/open-vsx/v/maiwulanjiangmaiming/matrixspy?label=Open%20VSX&style=flat&color=2C2255&logo=open-vsx" alt="Open VSX Version"/>
  </a>
</p>

A powerful VS Code extension for exploring, visualizing, and exporting MATLAB `.mat` files. Supports all MAT versions (v4–v7.3), interactive tensor visualization with zoom controls, and export to CSV/JSON.

## Features

- **All MAT file versions**: v4, v5, v6, v7, v7.3 (HDF5)
- **Interactive tensor visualization**:
  - 1D arrays with sparkline previews
  - 2D matrices as heatmaps or tables
  - 3D/4D+ tensors with slice viewer and zoom controls
  - Complex numbers: Magnitude / Phase / Real / Imag
- **Zoom controls** for image mode: +/- buttons, 1:1 reset, adaptive sizing
- **Zoom persistence**: zoom level kept when switching slices/axis/view mode
- **Tree view** for variable navigation with expandable structs
- **Lazy loading** for large 3D tensors and HDF5 datasets
- **Export**: CSV, JSON
- **Colormaps**: Grayscale, Viridis, Inferno, Plasma
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
- **Zoom persistence**: zoom level is kept when switching slices
- **Adaptive sizing**: small tensors auto-upscaled, large tensors fit container

### Export

- Command Palette → "MatrixSpy: Export to CSV" / "Export to JSON"

## Configuration

```json
{
  "matrixspy.pythonPath": "python3",
  "matrixspy.maxDataSize": 10000
}
```

## Changelog

### v1.2.1 (2026-05-15)

**Architecture**
- Persistent Python Daemon: stdin/stdout JSON-RPC, ~25x faster slice loading
- Heartbeat + crash recovery for daemon process

**Security**
- Python injection prevention via stdin JSON-RPC
- CSP nonce hardening (replaced unsafe-inline)
- Resource limits (100M element cap)

**Features**
- Enhanced statistics: percentiles, NaN/Inf count, sparsity, memory usage
- VS Code native theme support (no manual theme switching needed)

**Engineering**
- 28 pytest tests (v5/HDF5/serializer/daemon)
- GitHub Actions CI (Python 3.10-3.12, ruff, TypeScript, VSIX)
- Python type annotations + ruff linting

### v1.2.0 (2026-05-15)

**Security**
- Fixed XSS vulnerability with HTML escaping
- Added Content-Security-Policy to webview

**Bug Fixes**
- Fixed critical memory leak in message handling
- Fixed export commands not working in custom editor
- Fixed infinite retry loop — limited to 3 with backoff
- Fixed process leak on slice timeout
- Fixed NaN/Inf JSON serialization
- Fixed 4D+ tensors showing raw JSON
- Fixed empty arrays showing blank content

**Performance**
- Canvas rendering with requestAnimationFrame
- Debounced slice slider (50ms)
- HDF5 stats sampling for large datasets

**New Features**
- Image zoom controls (+/-/1:1)
- Adaptive image sizing
- Zoom persistence across slices
- 4D+ tensor support
- Cross-platform venv support

### v1.1.2 (2026-04-24)

- Fixed v7.3 (HDF5) MAT file parsing
- Fixed NaN/Inf JSON serialization errors
- Modernized webview architecture
- Added colormap, histogram, sparkline visualizations

### v1.1.1 (2026-04-20)

- Welcome page with dependency check
- Auto-detect Python and required packages

### v1.1.0 (2026-04-07)

- Multi-level Tree Navigation
- Lazy Loading for 3D Tensors
- v7.3 MAT File Support

### v1.0.0 (2026-04-05)

- Initial release

## License

MIT License
