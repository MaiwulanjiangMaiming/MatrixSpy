# MatrixSpy

<p align="center">
  <img src="extension/resources/Plugin.png" alt="MatrixSpy Logo" width="200"/>
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

## Installation

### From VS Code Marketplace

Search for **"MatrixSpy"** in the Extensions view (`Cmd+Shift+X`)

### From VSIX File

1. Download the `.vsix` file from [Releases](https://github.com/MaiwulanjiangMaiming/MatrixSpy/releases)
2. Open VS Code → Extensions (`Cmd+Shift+X`)
3. Click "..." menu → **"Install from VSIX"**
4. Select the downloaded file

### Prerequisites

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

## Architecture

```
MatrixSpy/
├── extension/
│   ├── src/                    # TypeScript source
│   │   ├── extension.ts        # Main entry
│   │   ├── providers/          # Custom Editor, Tree View
│   │   ├── ipc/                # Python Bridge
│   │   ├── commands/           # User commands
│   │   ├── webview/            # CSS, JS, HTML
│   │   └── utils/              # Constants, error handler
│   ├── python/                 # Python backend
│   │   └── high_perf_parser.py # Unified parser
│   ├── media/                  # Walkthrough media
│   └── resources/              # Icons
├── test_files/                 # Test MAT files
└── README.md
```

## Supported Data Types

| MATLAB Type | Python Type | Visualization |
|-------------|-------------|---------------|
| scalar | int/float | Text display |
| complex | complex128 | Magnitude/Phase/Real/Imag |
| vector | ndarray (1D) | Grid with index |
| matrix | ndarray (2D) | Heatmap / Table |
| tensor (3D+) | ndarray (3D+) | Slice viewer with zoom |
| struct | dict | Expandable tree |
| cell | list | List view |

## Troubleshooting

### Python not found

- Ensure Python 3.8+ is installed and in PATH
- Configure `matrixspy.pythonPath` in VS Code settings

### Missing packages

```bash
pip install scipy numpy h5py mat73
```

Or use command: **"MatrixSpy: Install Python Dependencies"**

### Large files are slow

- Files >1GB use lazy loading
- Adjust `matrixspy.maxDataSize` for threshold

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for full version history.

### v1.2.0 Highlights

- **Security**: Fixed XSS vulnerability, added CSP
- **Bug fixes**: Memory leak, export commands, infinite retry, process leaks, NaN/Inf handling
- **Performance**: Canvas RAF rendering, debounced slice slider, HDF5 sampling
- **New features**: Image zoom controls, 4D+ tensor support, zoom persistence, cross-platform venv

## Contributing

Contributions welcome! Please read our contributing guidelines.

## License

MIT License

## Contact

For feature requests or bug reports: Maiwulanjiang Maiming

## Credits

- Python parsing: scipy.io, h5py
- Visualization: Custom Canvas 2D with colormap LUTs

---

**Enjoy viewing your MAT files!**
