# MatrixSpy

<p align="center">
  <img src="extension/resources/Plugin.png" alt="MatrixSpy Logo" width="200"/>
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

## Installation

### Prerequisites

1. **Python 3.8+** with the following packages:
   ```bash
   pip install scipy numpy h5py mat73
   ```
2. **Node.js 16+** and npm

### Build from Source

1. Clone the repository:
   ```bash
   git clone https://github.com/MaiwulanjiangMaiming/MatrixSpy.git
   cd MatrixSpy
   ```
2. Install Python dependencies:
   ```bash
   cd python
   pip install -r requirements.txt
   ```
3. Install Extension dependencies:
   ```bash
   cd ../extension
   npm install
   ```
4. Install Webview dependencies:
   ```bash
   cd ../webview
   npm install
   ```
5. Build the webview:
   ```bash
   npm run build
   ```
6. Compile the extension:
   ```bash
   cd ../extension
   npm run compile
   ```
7. Package the extension:
   ```bash
   npm run package
   ```
8. Install in VSCode:
   - Open VSCode
   - Go to Extensions (Cmd+Shift+X)
   - Click "..." menu → "Install from VSIX"
   - Select the generated `.vsix` file

## Usage

### Opening MAT Files

1. **Method 1**: Right-click on a `.mat` file in Explorer → "Open MAT File"
2. **Method 2**: Command Palette (Cmd+Shift+P) → "MatrixSpy: Open MAT File"
3. **Method 3**: Double-click on a `.mat` file

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

Configure in VSCode settings:

```json
{
  "matrixspy.pythonPath": "python3",
  "matrixspy.maxDataSize": 10000,
  "matrixspy.enableImage": true
}
```

## Test Files

Generate test files:

```bash
cd test-files/generators
python generate_test_mats.py
python generate_mri_data.py
```

This creates:

- `test-files/v5/` - v5 format files
- `test-files/v7/` - v7 format files
- `test-files/v7.3/` - v7.3 HDF5 format files
- MRI test data

## Architecture

```
MatrixSpy/
├── extension/          # VSCode Extension (TypeScript)
│   ├── src/
│   │   ├── extension.ts
│   │   ├── providers/  # Custom Editor, Tree View
│   │   ├── ipc/        # Python Bridge
│   │   └── commands/   # User commands
│   └── webview-dist/   # Compiled webview
│
├── python/             # Python Backend
│   ├── mat_parser.py   # Main parser
│   ├── parsers/        # v4-v7.3 parsers
│   ├── serializers/    # JSON serialization
│   └── utils/          # Lazy loader, MRI tools
│
├── webview/            # React Webview UI
│   ├── src/
│   │   ├── components/ # UI components
│   │   ├── hooks/      # React hooks
│   │   └── types/      # TypeScript types
│   └── dist/           # Compiled bundle
│
└── test-files/         # Test MAT files
    ├── v5/
    ├── v7/
    └── v7.3/
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

### Large files slow

- Files >1GB use lazy loading
- Adjust `matrixspy.maxDataSize` for threshold

## Contributing

Contributions welcome! Please read our contributing guidelines.

## License

MIT License

## Versioning

This project follows semantic versioning:
- **z** (patch): Bug fixes
- **y** (minor): New features
- **x** (major): Major version updates (breaking changes)

## Changelog

### v1.0.1 (2026-04-05)

- Fixed configuration namespace from 'matViewer' to 'matrixspy'
- Updated terminology from 'MRI data' to 'image mat data'
- Translated all Chinese comments to English
- Improved extension description for better user onboarding
- Added README.md to extension directory for proper marketplace display

### v1.0.0 (2026-04-05)

- Initial release
- Support for all MAT file versions (v4, v5, v6, v7, v7.3)
- Interactive visualization with Plotly.js
- Tree view for variable navigation
- Multiple data types support: scalars, vectors, matrices, tensors, complex numbers, structs, cell arrays, sparse matrices
- Image mat data-specific features: k-space visualization, FFT transform, magnitude/phase display, multi-slice viewer
- Performance optimization: lazy loading, WebGL acceleration, downsampling
- Export capabilities: CSV, JSON, NumPy format

## Contact

If you want to add new features or report bugs, please contact: Maiwulanjiang Maiming

## Credits

- Python parsing: scipy.io, mat73, h5py
- Visualization: Plotly.js
- UI: React, TypeScript

***

**Enjoy viewing your MAT files!** 🎉
