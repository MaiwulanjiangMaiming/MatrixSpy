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
- ✅ **Setup wizard with dependency check**:
  - Auto-detect Python installation
  - Guide users to install missing packages

## Installation

### From VS Code Marketplace

Search for "MatrixSpy" in the Extensions view (Cmd+Shift+X)

### From VSIX File

1. Download the `.vsix` file from [Releases](https://github.com/MaiwulanjiangMaiming/MatrixSpy/releases)
2. Open VS Code
3. Go to Extensions (Cmd+Shift+X)
4. Click "..." menu → "Install from VSIX"
5. Select the downloaded `.vsix` file

### Prerequisites

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

### Image Mat Data Features

For image mat data with k-space:

1. View k-space magnitude and phase
2. Apply FFT to convert to image space
3. Navigate through slices
4. Generate mosaic view

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

## Architecture

```
MatrixSpy/
├── extension/              # VS Code Extension
│   ├── src/                # TypeScript source
│   │   ├── extension.ts    # Main entry point
│   │   ├── providers/      # Custom Editor, Tree View
│   │   ├── ipc/            # Python Bridge
│   │   ├── commands/       # User commands
│   │   └── utils/          # Utilities
│   ├── python/             # Python Backend
│   │   ├── mat_parser.py   # Main parser
│   │   ├── parsers/        # v4-v7.3 parsers
│   │   └── utils/          # Lazy loader, MRI tools
│   ├── webview-dist/       # Compiled webview (React)
│   ├── media/              # Walkthrough media
│   └── resources/          # Icons
└── README.md
```

## Supported Data Types

| MATLAB Type | Python Type   | Visualization      |
| ----------- | ------------- | ------------------ |
| scalar      | int/float     | Text display       |
| complex     | complex       | Magnitude/Phase    |
| vector      | ndarray (1D)  | Line plot          |
| matrix      | ndarray (2D)  | Heatmap/Table      |
| tensor      | ndarray (3D+) | Slice viewer       |
| struct      | dict          | Tree view          |
| cell        | list          | List view          |
| sparse      | scipy.sparse  | Sparse matrix view |

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

### Large files are slow

- Files >1GB use lazy loading
- Adjust `matrixspy.maxDataSize` for threshold

## Contributing

Contributions welcome! Please read our contributing guidelines.

## License

MIT License

## Changelog

### v1.1.2 (2026-04-24)

**🐛 Bug Fixes**
- Fixed v7.3 (HDF5) MAT file parsing failure - now uses h5py directly instead of mat73
- Fixed NaN/Inf JSON serialization errors in edge case files
- Fixed HDF5 version detection for binary file headers
- Fixed `_get_stats` returning NaN values that broke JSON output

**🧹 Cleanup**
- Modernized webview architecture with modular CSS/JS/HTML
- Removed redundant TreeDataProvider and unused webviewMessageHelper
- Added colormap support, histograms, and sparkline visualizations

### v1.1.1 (2026-04-20)

- Welcome page with dependency check
- Auto-detect Python and required packages
- Simplified project structure

### v1.1.0 (2026-04-07)

**🚀 New Features**
- **Multi-level Tree Navigation**: Added expandable/collapsible tree structure in the sidebar to navigate deeply nested structs and cell arrays
- **Lazy Loading for 3D Tensors**: Implemented on-demand slice loading for large 3D arrays, dramatically improving performance
- **v7.3 MAT File Support**: Added full support for MATLAB v7.3 (HDF5) format files

**🐛 Bug Fixes**
- Fixed 3D tensor visualization showing black canvas
- Fixed HTML structure corruption due to duplicate `<script>` tags
- Fixed `acquireVsCodeApi()` not being initialized
- Fixed parsing errors for struct variables containing mixed-type arrays
- Fixed `_get_stats` failing on non-numeric arrays
- Fixed empty data causing frontend crashes

**⚡ Performance Improvements**
- Reduced initial load time
- Reduced initial JSON payload size
- Slice loading optimized

### v1.0.1 (2026-04-05)

- Fixed configuration namespace from 'matViewer' to 'matrixspy'
- Updated terminology from 'MRI data' to 'image mat data'
- Improved extension description for better user onboarding

### v1.0.0 (2026-04-05)

- Initial release

## Contact

If you want to add new features or report bugs, please contact: Maiwulanjiang Maiming

## Credits

- Python parsing: scipy.io, mat73, h5py
- Visualization: Plotly.js
- UI: React, TypeScript

***

**Enjoy viewing your MAT files!** 🎉
