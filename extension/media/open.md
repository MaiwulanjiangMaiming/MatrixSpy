# Open a MAT File

There are multiple ways to open a MAT file in MatrixSpy:

## Method 1: Double-Click

Simply **double-click** any `.mat` file in the VS Code Explorer. MatrixSpy will automatically open it with the custom viewer.

## Method 2: Right-Click Menu

1. Right-click on a `.mat` file in the Explorer
2. Select **"Open MAT File"** from the context menu

## Method 3: Command Palette

1. Open Command Palette: `Cmd+Shift+P` (macOS) or `Ctrl+Shift+P` (Windows/Linux)
2. Type **"MatrixSpy: Open MAT File"**
3. Select the file from the file picker

## Supported Formats

MatrixSpy supports all MAT file versions:

| Version | Description | Library Used |
|---------|-------------|--------------|
| v4 | MATLAB 4.0 | scipy |
| v5 | MATLAB 5.0-7.0 | scipy |
| v7 | MATLAB 7.0-7.2 | scipy |
| v7.3 | MATLAB 7.3+ (HDF5) | h5py/mat73 |

## Tips

- Large files (>100MB) may take a few seconds to load
- The sidebar shows all variables in the file
- Click on any variable to view its contents

---

**Pro tip**: You can have multiple MAT files open simultaneously in different editor tabs!
