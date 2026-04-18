# MatrixSpy

A powerful VS Code extension for exploring, visualizing, and exporting MATLAB .mat files with image mat data support and beautiful matrix visualization.

## Features

- ✅ **Support all MAT file versions** (v4, v5, v6, v7, v7.3)
- ✅ **Interactive visualization** with Plotly.js
- ✅ **Tree view** for variable navigation
- ✅ **Multiple data types support**:
  - Scalars, vectors, matrices, tensors
  - Complex numbers
  - Structs and cell arrays
  - Sparse matrices
- ✅ **Image mat data-specific features**:
  - k-space visualization
  - FFT transform
  - Magnitude/Phase display
  - Multi-slice viewer
- ✅ **Performance optimized**:
  - Lazy loading for large files
  - WebGL acceleration
  - Downsampling for big datasets
- ✅ **Export capabilities**:
  - CSV export
  - JSON export
  - NumPy format
- ✅ **Welcome page with dependency check**:
  - Auto-detect Python installation
  - Guide users to install missing packages

## Prerequisites

**Python 3.8+** with the following packages:
```bash
pip install scipy numpy h5py mat73
```

The extension will automatically check dependencies on first launch and guide you through installation if needed.

## Usage

### Opening MAT Files

1. **Method 1**: Double-click on a `.mat` file in Explorer
2. **Method 2**: Right-click on a `.mat` file → "Open MAT File"
3. **Method 3**: Command Palette (Cmd+Shift+P) → "MatrixSpy: Open MAT File"

### Navigation

- **Tree View**: Browse variables in the sidebar
- **Click on a variable** to view its data
- **Expand structs** to see nested fields

### Visualization

- **1D arrays**: Line plot
- **2D matrices**: Heatmap or table view
- **3D tensors**: Slice viewer with navigation
- **Complex numbers**: Magnitude/Phase display

### Export Data

- Right-click on a variable → "Export to CSV" or "Export to JSON"
- Use Command Palette → "MatrixSpy: Export..."

## Configuration

Configure in VS Code settings:

```json
{
  "matrixspy.pythonPath": "python3",
  "matrixspy.maxDataSize": 10000,
  "matrixspy.enableImage": true
}
```

## Troubleshooting

### Python not found

- Make sure Python 3.8+ is installed and in your PATH
- Configure `matrixspy.pythonPath` in VS Code settings

### Missing packages

Run the installation command:
```bash
pip install scipy numpy h5py mat73
```

Or use the command: `MatrixSpy: Install Python Dependencies`

## License

MIT License

## Changelog

### v1.1.1 (2026-04-18)

- Welcome page with dependency check
- Auto-detect Python and required packages
- Simplified project structure

### v1.1.0 (2026-04-07)

- Multi-level Tree Navigation
- Lazy Loading for 3D Tensors
- v7.3 MAT File Support

### v1.0.0 (2026-04-05)

- Initial release
